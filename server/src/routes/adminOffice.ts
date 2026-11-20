// Admin office (Phase 5): overview, verification, cases, users, products & seasons, announcements, team & settings.
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { requirePermission, requireSuperAdmin } from "../auth.js";
import { notify, notifyMany } from "../notify.js";
import { pingUser } from "../realtime.js";
import { code, productInfo, refreshSeasons, seasonList, setting, DEFAULT_SEASON_MONTHS } from "../rules.js";
import { cancelDeal } from "../dealOps.js";
import { ratings, failureCounts, vehicleLabel } from "../views.js";
import { adminLog, adminRouter } from "./admin.js";
import { locks, guard, release } from "../locks.js";
import type { AdminPermission, Prisma, User } from "../generated/prisma/client.js";

const r = adminRouter; // same /api/admin router (requireAuth already applied)
const DAY = 86400_000;
const anyAdmin = (req: Request, res: Response, next: NextFunction) => (req.user?.role === "ADMIN" ? next() : res.status(403).json({ error: "Admins only." }));
const name = (u: { name: string; businessName?: string | null }) => u.businessName ?? u.name;

/* ------------------------------------------------------------ simple admin mode (demo): 6 menu items, business page */
r.get("/mode", anyAdmin, async (_req, res) => { res.json({ simple: await setting<boolean>("simpleAdmin", true) }); });
r.put("/mode", requireSuperAdmin, async (req, res) => {
  const simple = z.object({ simple: z.boolean() }).safeParse(req.body);
  if (!simple.success) return res.status(400).json({ error: "Choose on or off." });
  await prisma.setting.upsert({ where: { key: "simpleAdmin" }, update: { value: simple.data.simple }, create: { key: "simpleAdmin", value: simple.data.simple } });
  await adminLog(req.user!.id, simple.data.simple ? "Turned on simple admin mode" : "Showed all admin tools");
  res.json({ simple: simple.data.simple });
});

/* ------------------------------------------------------------ case locks (see ../locks.ts) */
r.post("/locks/:key/take", anyAdmin, async (req, res) => { if (await guard(req, res, String(req.params.key))) res.json({ ok: true }); });
r.post("/locks/:key/release", anyAdmin, async (req, res) => {
  const key = String(req.params.key);
  const l = await prisma.caseLock.findUnique({ where: { key } });
  if (l && l.adminId !== req.user!.id && !req.user!.isSuperAdmin) return res.status(403).json({ error: "Only the Super Admin can unlock someone else's case." });
  await release(key);
  if (l && l.adminId !== req.user!.id) await adminLog(req.user!.id, "Unlocked a case", key);
  res.json({ ok: true });
});

/* ------------------------------------------------------------ history + alerts */
/** Counts shown beside every case and used for the automatic alerts (3+ in 30 days). */
async function history(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { upazila: true, district: true } });
  const since = new Date(Date.now() - 30 * DAY);
  const party = u.role === "FARMER" ? { farmerId: u.id } : { dealerId: u.id };
  const [deals, cancels30, cancelReq30, tripCancels30, failures30, failuresAll, trips, reportsOpen, reportsAll, warnings, rate, actions] = await Promise.all([
    u.role === "TRANSPORTER" ? Promise.resolve(0) : prisma.deal.count({ where: party }),
    u.role === "TRANSPORTER" ? Promise.resolve(0) : prisma.deal.count({ where: { ...party, cancelledBy: u.role, cancelledAt: { gte: since } } }),
    prisma.cancelRequest.count({ where: { byId: u.id, createdAt: { gte: since } } }),
    prisma.transportOffer.count({ where: { transporterId: u.id, status: "CANCELLED", cancelReason: { not: null }, updatedAt: { gte: since } } }),
    prisma.deliveryFailure.count({ where: { reportedById: u.id, createdAt: { gte: since } } }),
    prisma.deliveryFailure.count({ where: { reportedById: u.id, status: "APPROVED" } }),
    prisma.transportOffer.count({ where: { transporterId: u.id, status: "ACCEPTED" } }),
    prisma.report.count({ where: { againstId: u.id, status: "OPEN" } }),
    prisma.report.count({ where: { againstId: u.id } }),
    prisma.adminLog.count({ where: { targetUserId: u.id, action: "Warned user" } }),
    ratings([u.id]),
    prisma.adminLog.findMany({ where: { targetUserId: u.id }, orderBy: { createdAt: "desc" }, take: 5, include: { actor: { select: { name: true } } } }),
  ]);
  const cancels = cancels30 + cancelReq30 + tripCancels30;
  const alerts: string[] = [];
  if (cancels >= 3) alerts.push(`${cancels} cancellations in 30 days`);
  if (u.role === "TRANSPORTER" && failures30 >= 3) alerts.push(`${failures30} delivery failures in 30 days`);
  return {
    id: u.id, name: name(u), person: u.name, role: u.role, phone: u.phone, status: u.status, statusReason: u.statusReason, suspendedUntil: u.suspendedUntil,
    place: [u.upazila?.name, u.district?.name].filter(Boolean).join(", "), since: u.createdAt,
    rating: rate.get(u.id) ?? null, deals: u.role === "TRANSPORTER" ? trips : deals, cancels30: cancels, failures30, failuresAll, reportsOpen, reportsAll, warnings, alerts,
    recent: actions.map((a) => ({ at: a.createdAt, by: a.actor.name, action: a.action, reason: a.reason })),
  };
}
r.get("/users/:id/history", anyAdmin, async (req, res) => res.json(await history(String(req.params.id))));

/** Users with an automatic alert (alert only: nothing happens until an admin acts). */
async function alertUsers() {
  const since = new Date(Date.now() - 30 * DAY);
  const [farmerC, dealerC, reqs, tripC, fails] = await Promise.all([
    prisma.deal.groupBy({ by: ["farmerId"], where: { cancelledBy: "FARMER", cancelledAt: { gte: since } }, _count: true }),
    prisma.deal.groupBy({ by: ["dealerId"], where: { cancelledBy: "DEALER", cancelledAt: { gte: since } }, _count: true }),
    prisma.cancelRequest.groupBy({ by: ["byId"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.transportOffer.groupBy({ by: ["transporterId"], where: { status: "CANCELLED", cancelReason: { not: null }, updatedAt: { gte: since } }, _count: true }),
    prisma.deliveryFailure.groupBy({ by: ["reportedById"], where: { createdAt: { gte: since } }, _count: true }),
  ]);
  const c = new Map<string, number>(), f = new Map<string, number>();
  const add = (m: Map<string, number>, id: string, n: number) => m.set(id, (m.get(id) ?? 0) + n);
  farmerC.forEach((x) => add(c, x.farmerId, x._count)); dealerC.forEach((x) => add(c, x.dealerId, x._count));
  reqs.forEach((x) => add(c, x.byId, x._count)); tripC.forEach((x) => add(c, x.transporterId, x._count)); fails.forEach((x) => add(f, x.reportedById, x._count));
  const ids = [...new Set([...c.keys(), ...f.keys()])].filter((id) => (c.get(id) ?? 0) >= 3 || (f.get(id) ?? 0) >= 3);
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, include: { upazila: true, district: true } });
  return users.map((u) => ({ id: u.id, name: name(u), role: u.role, place: [u.upazila?.name, u.district?.name].filter(Boolean).join(", "), text: [(c.get(u.id) ?? 0) >= 3 ? `${c.get(u.id)} cancellations in 30 days` : null, (f.get(u.id) ?? 0) >= 3 ? `${f.get(u.id)} delivery failures in 30 days` : null].filter(Boolean).join(" · ") }));
}

/* ------------------------------------------------------------ A1 overview */
r.get("/overview", anyAdmin, async (_req, res) => {
  const [verifyUsers, verifyVehicles, failures, escalated, cancelReqs, reports, reviewReports, codes, admins, log, alerts] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["DEALER", "TRANSPORTER"] }, status: { in: ["PENDING"] } } }),
    prisma.vehicle.count({ where: { status: "PENDING" } }),
    prisma.deliveryFailure.count({ where: { status: "PENDING" } }),
    prisma.deliveryFailure.count({ where: { status: "PENDING", escalatedAt: { not: null } } }),
    prisma.cancelRequest.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN", reviewId: null } }),
    prisma.report.count({ where: { status: "OPEN", reviewId: { not: null } } }),
    prisma.deal.count({ where: { codeAttempts: { gte: 5 }, status: { in: ["TRANSPORT_CONFIRMED", "IN_TRANSIT"] } } }),
    prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true, name: true, isSuperAdmin: true, permissions: true, lastSeenAt: true }, orderBy: { name: "asc" } }),
    prisma.adminLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } }),
    alertUsers(),
  ]);
  const savedKg = await prisma.deal.aggregate({ where: { source: "EMERGENCY", status: { not: "CANCELLED" }, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }, _sum: { quantityKg: true } });
  res.json({
    counts: { verifyUsers, verifyVehicles, failures, escalated, cancelReqs, reports, reviewReports, codes, savedKgThisMonth: savedKg._sum.quantityKg ?? 0 },
    alerts, admins: admins.map((a) => ({ ...a, online: !!a.lastSeenAt && Date.now() - a.lastSeenAt.getTime() < 10 * 60_000 })),
    log: log.map((l) => ({ at: l.createdAt, by: l.actor.name, action: l.action, target: l.target, reason: l.reason })),
  });
});

/* ------------------------------------------------------------ A2 verification */
const NEEDED: Record<string, string[]> = { DEALER: ["NID", "TRADE_LICENSE"], TRANSPORTER: ["NID", "DRIVING_LICENSE"] };
r.get("/verification", requirePermission("VERIFY"), async (_req, res) => {
  const users = await prisma.user.findMany({ where: { role: { in: ["DEALER", "TRANSPORTER"] }, status: { in: ["PENDING", "REUPLOAD"] } }, include: { docs: { orderBy: { createdAt: "desc" } }, upazila: true, district: true, vehicles: true }, orderBy: { createdAt: "asc" } });
  const vehicles = await prisma.vehicle.findMany({ where: { status: "PENDING" }, include: { owner: { select: { id: true, name: true, businessName: true, status: true } } }, orderBy: { createdAt: "asc" } });
  const lk = await locks([...users.map((u) => "verify:" + u.id), ...vehicles.map((v) => "vehicle:" + v.id)]);
  res.json({
    users: users.map((u) => ({
      id: u.id, name: name(u), person: u.name, role: u.role, phone: u.phone, place: [u.upazila?.name, u.district?.name].filter(Boolean).join(", "), status: u.status, statusReason: u.statusReason, since: u.createdAt,
      docs: NEEDED[u.role].map((k) => { const d = u.docs.find((x) => x.kind === k); return { kind: k, file: d?.file ?? null, at: d?.createdAt ?? null }; }),
      complete: NEEDED[u.role].every((k) => u.docs.some((d) => d.kind === k)), vehicles: u.vehicles.length, lock: lk.get("verify:" + u.id) ?? null,
    })),
    vehicles: vehicles.map((v) => ({ id: v.id, label: vehicleLabel(v), regNo: v.regNo, facility: v.facility, capacityKg: v.capacityKg, docPhoto: v.docPhoto, since: v.createdAt, owner: { id: v.owner.id, name: name(v.owner), verified: v.owner.status === "ACTIVE" }, lock: lk.get("vehicle:" + v.id) ?? null })),
  });
});
const decision = z.object({ action: z.enum(["approve", "reupload", "reject"]), reason: z.string().trim().max(300).optional() }).refine((d) => d.action === "approve" || (d.reason && d.reason.length >= 3), { message: "Choose a reason", path: ["reason"] });
r.post("/verification/user/:id", requirePermission("VERIFY"), async (req, res) => {
  const p = decision.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Choose a reason.", fields: z.flattenError(p.error).fieldErrors });
  const id = String(req.params.id), key = "verify:" + id;
  if (!(await guard(req, res, key))) return;
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u || !["PENDING", "REUPLOAD"].includes(u.status)) return res.status(409).json({ error: "Already decided." });
  const { action, reason } = p.data;
  const status = action === "approve" ? "ACTIVE" : action === "reupload" ? "REUPLOAD" : "REJECTED";
  await prisma.user.update({ where: { id }, data: { status, statusReason: action === "approve" ? null : reason } });
  await adminLog(req.user!.id, action === "approve" ? "Verified user" : action === "reupload" ? "Asked for re-upload" : "Rejected verification", name(u), reason);
  await prisma.adminLog.updateMany({ where: { actorId: req.user!.id, targetUserId: null, target: name(u) }, data: { targetUserId: u.id } });
  const link = u.role === "DEALER" ? "/dealer/profile" : "/transporter/profile";
  await notify(u.id, action === "approve" ? "You are verified" : action === "reupload" ? "Please upload again" : "Verification rejected",
    action === "approve" ? "An admin checked your documents. You can now " + (u.role === "DEALER" ? "bid and make offers." : "send transport offers.") : `Reason: ${reason}.` + (action === "reupload" ? " Upload a clearer document from your profile." : ""), link);
  pingUser(u.id, "deal");
  await release(key);
  res.json({ ok: true });
});
r.post("/verification/vehicle/:id", requirePermission("VERIFY"), async (req, res) => {
  const p = decision.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Choose a reason.", fields: z.flattenError(p.error).fieldErrors });
  const id = String(req.params.id), key = "vehicle:" + id;
  if (!(await guard(req, res, key))) return;
  const v = await prisma.vehicle.findUnique({ where: { id } });
  if (!v || v.status !== "PENDING") return res.status(409).json({ error: "Already decided." });
  const { action, reason } = p.data;
  // "re-upload" keeps the vehicle pending with a note for the owner
  await prisma.vehicle.update({ where: { id }, data: { status: action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "PENDING", statusNote: action === "approve" ? null : reason } });
  await adminLog(req.user!.id, action === "approve" ? "Approved vehicle" : action === "reupload" ? "Asked for vehicle re-upload" : "Rejected vehicle", v.regNo, reason);
  await notify(v.ownerId, action === "approve" ? "Vehicle approved" : "Vehicle not approved", action === "approve" ? `${v.regNo} can now be offered on deals.` : `${v.regNo}: ${reason}.`, "/transporter/vehicles");
  await release(key);
  res.json({ ok: true });
});

/* ------------------------------------------------------------ A4 cases */
r.get("/cases", anyAdmin, async (req, res) => {
  const me = req.user!;
  const can = (p: AdminPermission) => me.isSuperAdmin || me.permissions.includes(p);
  const cancel = can("DEALS") ? await prisma.cancelRequest.findMany({ orderBy: { createdAt: "desc" }, take: 60, include: { by: true, deal: { include: { listing: { include: { product: true } }, farmer: true, dealer: true, transportOffers: { where: { status: "ACCEPTED" }, include: { transporter: true } } } } } }) : [];
  const reports = can("REPORTS") ? await prisma.report.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { by: true, against: true, review: true } }) : [];
  const codes = can("DEALS") ? await prisma.deal.findMany({ where: { codeAttempts: { gte: 5 }, status: { in: ["TRANSPORT_CONFIRMED", "IN_TRANSIT"] } }, include: { listing: { include: { product: true } }, farmer: true, dealer: true } }) : [];
  const lk = await locks([...cancel.map((c) => "cancel:" + c.id), ...reports.map((x) => "report:" + x.id)]);
  res.json({
    can: { deals: can("DEALS"), reports: can("REPORTS") },
    cancel: cancel.map((c) => ({
      id: c.id, status: c.status, at: c.createdAt, reason: c.reason, decisionNote: c.decisionNote, byRole: c.byRole, by: { id: c.byId, name: name(c.by) },
      deal: { id: c.dealId, code: code(c.deal.code), product: productInfo(c.deal.listing).name, quantityKg: c.deal.quantityKg, status: c.deal.status, farmer: c.deal.farmer.name, dealer: name(c.deal.dealer), transporter: c.deal.transportOffers[0] ? name(c.deal.transportOffers[0].transporter) : null, pickupAt: c.deal.transportOffers[0]?.pickupAt ?? null },
      lock: lk.get("cancel:" + c.id) ?? null,
    })),
    reports: reports.map((x) => ({
      id: x.id, status: x.status, at: x.createdAt, kind: x.kind, details: x.details, deal: x.dealCode ? "FN-" + x.dealCode : null, decisionNote: x.decisionNote,
      by: { id: x.byId, name: name(x.by), role: x.by.role }, against: { id: x.againstId, name: name(x.against), role: x.against.role, status: x.against.status },
      review: x.review ? { id: x.review.id, stars: x.review.stars, comment: x.review.comment, hidden: x.review.hidden } : null, lock: lk.get("report:" + x.id) ?? null,
    })),
    codes: codes.map((d) => ({ id: d.id, code: code(d.code), product: productInfo(d.listing).name, status: d.status, farmer: d.farmer.name, dealer: name(d.dealer), attempts: d.codeAttempts })),
  });
});

r.post("/cases/cancel/:id", requirePermission("DEALS"), async (req, res) => {
  const p = z.object({ action: z.enum(["approve", "reject"]), note: z.string().trim().min(3, "Write a short note for both sides").max(300) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Write a short note for both sides.", fields: z.flattenError(p.error).fieldErrors });
  const id = String(req.params.id), key = "cancel:" + id;
  if (!(await guard(req, res, key))) return;
  const c = await prisma.cancelRequest.findUnique({ where: { id }, include: { deal: true } });
  if (!c || c.status !== "PENDING") return res.status(409).json({ error: "Already decided." });
  if (p.data.action === "approve" && c.deal.status !== "TRANSPORT_CONFIRMED") return res.status(409).json({ error: "The produce is already picked up; it can no longer be cancelled." });
  await prisma.cancelRequest.update({ where: { id }, data: { status: p.data.action === "approve" ? "APPROVED" : "REJECTED", decidedById: req.user!.id, decisionNote: p.data.note, decidedAt: new Date() } });
  if (p.data.action === "approve") await cancelDeal(c.dealId, c.byRole, c.reason);
  await adminLog(req.user!.id, p.data.action === "approve" ? "Approved cancellation" : "Rejected cancellation", code(c.deal.code), p.data.note);
  await prisma.adminLog.updateMany({ where: { actorId: req.user!.id, target: code(c.deal.code), targetUserId: null }, data: { targetUserId: c.byId } });
  const text = p.data.action === "approve" ? `An admin approved cancelling ${code(c.deal.code)}. ${p.data.note}` : `An admin rejected cancelling ${code(c.deal.code)}: ${p.data.note}. The deal continues.`;
  await notify(c.deal.farmerId, p.data.action === "approve" ? "Deal cancelled" : "Cancellation rejected", text, "/farmer/sales?l=" + c.deal.listingId);
  await notify(c.deal.dealerId, p.data.action === "approve" ? "Deal cancelled" : "Cancellation rejected", text, "/dealer/purchases");
  for (const u of [c.deal.farmerId, c.deal.dealerId]) pingUser(u, "deal");
  await release(key);
  res.json({ ok: true });
});

/** Suspend (7 / 30 days) or ban (0) with a written reason. Active deals continue; nothing new can start. */
async function suspend(admin: User, userId: string, days: number, reason: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const until = days ? new Date(Date.now() + days * DAY) : null;
  await prisma.user.update({ where: { id: u.id }, data: { status: days ? "SUSPENDED" : "BANNED", suspendedUntil: until, statusReason: reason } });
  await adminLog(admin.id, days ? `Suspended user ${days} days` : "Banned user", name(u), reason);
  await prisma.adminLog.updateMany({ where: { actorId: admin.id, target: name(u), targetUserId: null }, data: { targetUserId: u.id } });
  await notify(u.id, days ? "Account suspended" : "Account banned", days ? `Your account is suspended for ${days} days. Reason: ${reason}. Your active deals continue, but you cannot start new ones.` : `Your account is banned. Reason: ${reason}.`, "/");
  pingUser(u.id, "deal");
}
async function warn(admin: User, userId: string, reason: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await adminLog(admin.id, "Warned user", name(u), reason);
  await prisma.adminLog.updateMany({ where: { actorId: admin.id, target: name(u), targetUserId: null }, data: { targetUserId: u.id } });
  await notify(u.id, "Warning from FreshNest", `${reason}. Repeated problems can lead to suspension.`, "/");
}

r.post("/cases/report/:id", requirePermission("REPORTS"), async (req, res) => {
  const p = z.object({ action: z.enum(["warn", "suspend", "dismiss", "hide", "keep"]), days: z.coerce.number().refine((d) => [0, 7, 30].includes(d)).optional(), reason: z.string().trim().max(300).optional() })
    .refine((d) => d.action === "dismiss" || d.action === "keep" || (d.reason && d.reason.length >= 5), { message: "A written reason is required", path: ["reason"] }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "A written reason is required.", fields: z.flattenError(p.error).fieldErrors });
  const id = String(req.params.id), key = "report:" + id, me = req.user!;
  if (!(await guard(req, res, key))) return;
  const x = await prisma.report.findUnique({ where: { id }, include: { against: true } });
  if (!x || x.status !== "OPEN") return res.status(409).json({ error: "Already decided." });
  const { action, days = 7, reason = "" } = p.data;
  if (action === "warn") await warn(me, x.againstId, reason);
  if (action === "suspend") await suspend(me, x.againstId, days, reason);
  if (action === "hide" && x.reviewId) { await prisma.review.update({ where: { id: x.reviewId }, data: { hidden: true } }); await adminLog(me.id, "Hid review", name(x.against), reason); }
  if (action === "dismiss" || action === "keep") await adminLog(me.id, action === "keep" ? "Kept review" : "Dismissed report", name(x.against), reason || undefined);
  const status = action === "warn" ? "WARNED" : action === "suspend" ? "SUSPENDED" : action === "hide" ? "REVIEW_HIDDEN" : "DISMISSED";
  await prisma.report.update({ where: { id }, data: { status, decidedById: me.id, decisionNote: reason || null, decidedAt: new Date() } });
  await notify(x.byId, "Your report was reviewed", action === "dismiss" || action === "keep" ? "An admin looked at your report and took no action this time." : "An admin took action on your report. Thank you.", "/");
  await release(key);
  res.json({ ok: true });
});

r.post("/cases/codes/:dealId/reset", requirePermission("DEALS"), async (req, res) => {
  const d = await prisma.deal.findUnique({ where: { id: String(req.params.dealId) } });
  if (!d || d.codeAttempts < 5) return res.status(409).json({ error: "Nothing to reset." });
  await prisma.deal.update({ where: { id: d.id }, data: { codeAttempts: 0 } });
  await adminLog(req.user!.id, "Reset code attempts", code(d.code));
  res.json({ ok: true });
});

/* ------------------------------------------------------------ A5 users */
r.get("/users", anyAdmin, async (req, res) => {
  const q = z.object({ q: z.string().optional(), role: z.enum(["FARMER", "DEALER", "TRANSPORTER", "ADMIN"]).optional(), districtId: z.coerce.number().optional(), upazilaId: z.coerce.number().optional(), status: z.string().optional() }).parse(req.query);
  const where: Prisma.UserWhereInput = {
    ...(q.role ? { role: q.role } : { role: { not: "ADMIN" } }),
    ...(q.upazilaId ? { upazilaId: q.upazilaId } : q.districtId ? { districtId: q.districtId } : {}),
    ...(q.status ? { status: q.status as never } : {}),
    ...(q.q ? { OR: [{ name: { contains: q.q, mode: "insensitive" } }, { businessName: { contains: q.q, mode: "insensitive" } }, { phone: { contains: q.q } }] } : {}),
  };
  const users = await prisma.user.findMany({ where, include: { upazila: true, district: true }, orderBy: { createdAt: "desc" }, take: 300 });
  const [rate, fails, alerts] = await Promise.all([ratings(users.map((u) => u.id)), failureCounts(users.map((u) => u.id)), alertUsers()]);
  const al = new Map(alerts.map((a) => [a.id, a.text]));
  res.json({ users: users.map((u) => ({ id: u.id, name: name(u), person: u.name, role: u.role, phone: u.phone, place: [u.upazila?.name, u.district?.name].filter(Boolean).join(", "), status: u.status, statusReason: u.statusReason, suspendedUntil: u.suspendedUntil, rating: rate.get(u.id) ?? null, failures: fails.get(u.id) ?? 0, alert: al.get(u.id) ?? null, since: u.createdAt, partnerOffers: u.partnerOffers })) });
});
r.post("/users/:id/warn", requirePermission("REPORTS"), async (req, res) => {
  const p = z.object({ reason: z.string().trim().min(5).max(300) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "A written reason is required." });
  await warn(req.user!, String(req.params.id), p.data.reason);
  res.json({ ok: true });
});
r.post("/users/:id/suspend", requirePermission("REPORTS"), async (req, res) => {
  const p = z.object({ days: z.coerce.number().refine((d) => [0, 7, 30].includes(d)), reason: z.string().trim().min(5).max(300) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "A written reason is required." });
  const u = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!u || u.role === "ADMIN") return res.status(404).json({ error: "User not found." });
  await suspend(req.user!, u.id, p.data.days, p.data.reason);
  res.json({ ok: true });
});
r.post("/users/:id/lift", requirePermission("REPORTS"), async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!u || !["SUSPENDED", "BANNED"].includes(u.status)) return res.status(409).json({ error: "This account is not suspended or banned." });
  if (u.status === "BANNED" && !req.user!.isSuperAdmin) return res.status(403).json({ error: "Only the Super Admin can lift a ban." });
  await prisma.user.update({ where: { id: u.id }, data: { status: "ACTIVE", suspendedUntil: null, statusReason: null } });
  await adminLog(req.user!.id, u.status === "BANNED" ? "Lifted ban" : "Lifted suspension", name(u));
  await prisma.adminLog.updateMany({ where: { actorId: req.user!.id, target: name(u), targetUserId: null }, data: { targetUserId: u.id } });
  await notify(u.id, "Account active again", "You can use FreshNest normally again.", "/");
  res.json({ ok: true });
});

/* ------------------------------------------------------------ A6 products & seasons (Super Admin) */
r.get("/products", requireSuperAdmin, async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: [{ active: "desc" }, { nameEn: "asc" }], include: { _count: { select: { listings: true } } } });
  // "Suggested by farmers": custom products typed because they were not in the list
  const custom = await prisma.listing.findMany({ where: { productId: null, customName: { not: null } }, select: { customName: true, customShelfLife: true, customStorage: true, farmerId: true, category: true, upazila: { select: { name: true } } } });
  const groups = new Map<string, typeof custom>();
  custom.forEach((l) => { const k = l.customName!.trim().toLowerCase(); groups.set(k, [...(groups.get(k) ?? []), l]); });
  const known = new Set(products.map((p) => p.nameEn.toLowerCase()));
  const suggestions = [...groups.entries()].filter(([k]) => !known.has(k)).map(([, ls]) => {
    const storages = ls.map((l) => l.customStorage!).sort();
    return { name: ls[0].customName!.trim(), category: ls[0].category, farmers: new Set(ls.map((l) => l.farmerId)).size, listings: ls.length, shelfLifeDays: Math.round(ls.reduce((s, l) => s + (l.customShelfLife ?? 0), 0) / ls.length), storage: storages[Math.floor(storages.length / 2)], where: [...new Set(ls.map((l) => l.upazila.name))].slice(0, 4).join(", ") };
  }).sort((a, b) => b.farmers - a.farmers);
  res.json({ products: products.map((p) => ({ ...p, listings: p._count.listings })), suggestions, seasons: seasonList() });
});
const productBody = z.object({ nameEn: z.string().trim().min(2).max(40), nameBn: z.string().trim().min(1).max(40), category: z.enum(["Vegetable", "Fruit"]), shelfLifeDays: z.coerce.number().int().min(1).max(365), storage: z.enum(["NORMAL", "VENTILATED", "REFRIGERATED"]), ventilatedForLongTrips: z.boolean().default(false) });
r.post("/products", requireSuperAdmin, async (req, res) => {
  const p = productBody.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the product.", fields: z.flattenError(p.error).fieldErrors });
  if (await prisma.product.findFirst({ where: { nameEn: { equals: p.data.nameEn, mode: "insensitive" } } })) return res.status(409).json({ error: "This product is already in the list.", fields: { nameEn: ["Already in the list"] } });
  await prisma.product.create({ data: p.data });
  await adminLog(req.user!.id, "Added product", p.data.nameEn);
  res.status(201).json({ ok: true });
});
r.put("/products/:id", requireSuperAdmin, async (req, res) => {
  const p = productBody.extend({ active: z.boolean().default(true) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the product.", fields: z.flattenError(p.error).fieldErrors });
  await prisma.product.update({ where: { id: Number(req.params.id) }, data: p.data });
  await adminLog(req.user!.id, p.data.active ? "Edited product" : "Hid product", p.data.nameEn);
  res.json({ ok: true });
});
r.put("/seasons", requireSuperAdmin, async (req, res) => {
  const m = z.array(z.number().int().min(1).max(12));
  const p = z.object({ winter: m, summer: m, monsoon: m }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Each month must belong to one season." });
  const all = [...p.data.winter, ...p.data.summer, ...p.data.monsoon].sort((a, b) => a - b);
  if (all.length !== 12 || all.some((x, i) => x !== i + 1)) return res.status(400).json({ error: "Each of the 12 months must belong to exactly one season." });
  await prisma.setting.upsert({ where: { key: "seasonMonths" }, update: { value: p.data }, create: { key: "seasonMonths", value: p.data } });
  await refreshSeasons();
  await adminLog(req.user!.id, "Changed season calendar");
  res.json({ ok: true, seasons: seasonList() });
});

/* ------------------------------------------------------------ A7 announcements */
async function audienceWhere(audience: string, sponsored: boolean): Promise<{ where: Prisma.UserWhereInput; label: string }> {
  const [kind, val] = audience.split(":");
  let where: Prisma.UserWhereInput = { role: { not: "ADMIN" }, status: { notIn: ["BANNED"] } }, label = "Everyone";
  if (kind === "role") { where = { ...where, role: val as "FARMER" }; label = { FARMER: "Farmers", DEALER: "Dealers", TRANSPORTER: "Transporters" }[val] ?? val; }
  if (kind === "district") { const d = await prisma.district.findUnique({ where: { id: Number(val) } }); where = { ...where, districtId: Number(val) }; label = "District: " + d?.name; }
  if (kind === "upazila") { const u = await prisma.upazila.findUnique({ where: { id: Number(val) }, include: { district: true } }); where = { ...where, upazilaId: Number(val) }; label = `Upazila: ${u?.name}, ${u?.district.name}`; }
  // sponsored: only farmers who turned on "Agri partner offers"
  if (sponsored) { where = { ...where, role: "FARMER", partnerOffers: true }; label += " · opted-in farmers"; }
  return { where, label };
}
r.get("/announcements", requirePermission("ANNOUNCE"), async (_req, res) => {
  const [list, companies] = await Promise.all([prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 }), prisma.company.findMany({ where: { active: true }, orderBy: { name: "asc" } })]);
  res.json({ list, companies: companies.map((c) => ({ id: c.id, name: c.name })) });
});
r.get("/announcements/reach", requirePermission("ANNOUNCE"), async (req, res) => {
  const a = await audienceWhere(String(req.query.audience ?? "all"), req.query.sponsored === "1");
  res.json({ reach: await prisma.user.count({ where: a.where }), label: a.label });
});
r.post("/announcements", requirePermission("ANNOUNCE"), async (req, res) => {
  const p = z.object({ title: z.string().trim().min(3).max(80), body: z.string().trim().min(5).max(600), audience: z.string().regex(/^(all|role:(FARMER|DEALER|TRANSPORTER)|district:\d+|upazila:\d+)$/), sponsor: z.string().optional().nullable() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the announcement.", fields: z.flattenError(p.error).fieldErrors });
  const sponsor = p.data.sponsor ? (await prisma.company.findFirst({ where: { name: p.data.sponsor, active: true } }))?.name : null;
  if (p.data.sponsor && !sponsor) return res.status(400).json({ error: "Choose a company with an active subscription." });
  const a = await audienceWhere(p.data.audience, !!sponsor);
  const users = await prisma.user.findMany({ where: a.where, select: { id: true } });
  const title = sponsor ? `Sponsored · ${sponsor}: ${p.data.title}` : p.data.title;
  await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, title, body: p.data.body })) });
  users.forEach((u) => pingUser(u.id, "notification", { title, body: p.data.body }));
  await prisma.announcement.create({ data: { title: p.data.title, body: p.data.body, audience: p.data.audience, audienceLabel: a.label, sponsor, reach: users.length, byId: req.user!.id } });
  await adminLog(req.user!.id, sponsor ? "Sent sponsored announcement" : "Sent announcement", a.label, p.data.title);
  res.status(201).json({ ok: true, reach: users.length });
});

/* ------------------------------------------------------------ companies (business model) */
r.get("/companies", requirePermission("ANALYTICS"), async (_req, res) => {
  const fee = await setting("subscriptionFeePerUpazila", 1500);
  const cs = await prisma.company.findMany({ orderBy: { name: "asc" } });
  const ups = await prisma.upazila.findMany({ where: { id: { in: cs.flatMap((c) => c.upazilaIds) } }, select: { id: true, name: true } });
  const un = new Map(ups.map((u) => [u.id, u.name]));
  res.json({ fee, companies: cs.map((c) => { const trial = !!c.trialUntil && c.trialUntil > new Date(); return { ...c, upazilas: c.upazilaIds.map((i) => un.get(i)).filter(Boolean), trial, monthly: trial || !c.active ? 0 : c.upazilaIds.length * fee }; }) });
});

/* ------------------------------------------------------------ A9 team, settings, log (Super Admin) */
const PERMS = ["VERIFY", "DEALS", "REPORTS", "ANNOUNCE", "ANALYTICS"] as const;
r.get("/team", requireSuperAdmin, async (_req, res) => {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, phone: true, isSuperAdmin: true, permissions: true, lastSeenAt: true, _count: { select: { adminActions: true } } } });
  const settings = await prisma.setting.findMany();
  res.json({ admins, settings: Object.fromEntries(settings.filter((s) => s.key !== "seasonMonths").map((s) => [s.key, s.value])) });
});
r.post("/team", requireSuperAdmin, async (req, res) => {
  const p = z.object({ name: z.string().trim().min(2).max(60), phone: z.string().regex(/^01[3-9]\d{8}$/, "Bangladeshi mobile number"), password: z.string().min(8), permissions: z.array(z.enum(PERMS)).min(1, "Give at least one permission") }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the form.", fields: z.flattenError(p.error).fieldErrors });
  if (await prisma.user.findUnique({ where: { phone: p.data.phone } })) return res.status(409).json({ error: "This phone number is already registered.", fields: { phone: ["Already registered"] } });
  const me = req.user!;
  await prisma.user.create({ data: { role: "ADMIN", name: p.data.name, phone: p.data.phone, passwordHash: await bcrypt.hash(p.data.password, 10), permissions: p.data.permissions, districtId: me.districtId, upazilaId: me.upazilaId } });
  await adminLog(me.id, "Added admin", p.data.name, p.data.permissions.join(", "));
  res.status(201).json({ ok: true });
});
r.put("/team/:id", requireSuperAdmin, async (req, res) => {
  const p = z.object({ permissions: z.array(z.enum(PERMS)) }).safeParse(req.body);
  const a = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!p.success || !a || a.role !== "ADMIN" || a.isSuperAdmin) return res.status(404).json({ error: "Admin not found." });
  await prisma.user.update({ where: { id: a.id }, data: { permissions: p.data.permissions } });
  await adminLog(req.user!.id, "Changed permissions", a.name, p.data.permissions.join(", ") || "none");
  res.json({ ok: true });
});
r.delete("/team/:id", requireSuperAdmin, async (req, res) => {
  const a = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!a || a.role !== "ADMIN" || a.isSuperAdmin) return res.status(404).json({ error: "Admin not found." });
  // keep the account (its past actions stay in the log) but remove access
  await prisma.user.update({ where: { id: a.id }, data: { status: "BANNED", permissions: [], statusReason: "Removed from the admin team" } });
  await prisma.caseLock.deleteMany({ where: { adminId: a.id } });
  await adminLog(req.user!.id, "Removed admin", a.name);
  res.json({ ok: true });
});
const SETTINGS = z.object({
  minBiddingHoursDistrict: z.number().int().min(1).max(72), minBiddingHoursNationwide: z.number().int().min(1).max(96), transportOfferWindowHours: z.number().int().min(1).max(48),
  resaleShelfLeftPercent: z.number().int().min(0).max(90), smallPickupMaxKg: z.number().int().min(0).max(5000), subscriptionFeePerUpazila: z.number().int().min(0).max(100000),
}).partial();
r.put("/settings", requireSuperAdmin, async (req, res) => {
  const p = SETTINGS.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the values.", fields: z.flattenError(p.error).fieldErrors });
  for (const [key, value] of Object.entries(p.data)) await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  await adminLog(req.user!.id, "Changed system settings", Object.keys(p.data).join(", "));
  res.json({ ok: true });
});
r.get("/log", requireSuperAdmin, async (req, res) => {
  const page = Math.max(0, Number(req.query.page ?? 0));
  const items = await prisma.adminLog.findMany({ orderBy: { createdAt: "desc" }, skip: page * 50, take: 50, include: { actor: { select: { name: true } } } });
  res.json({ items: items.map((l) => ({ at: l.createdAt, by: l.actor.name, action: l.action, target: l.target, reason: l.reason })) });
});

export { DEFAULT_SEASON_MONTHS };
