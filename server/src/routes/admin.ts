// Admin (Phase 4 part): delivery-failure queue. Phase 5 adds verification, cases, users, products, etc.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requirePermission } from "../auth.js";
import { productInfo, code } from "../rules.js";
import { failureInclude, shelfLeftMs, suggest, type FullFailure } from "../emergency.js";
import { vehicleLabel } from "../views.js";
import { notify } from "../notify.js";
import { pingUser } from "../realtime.js";
import { locks, guard, release } from "../locks.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);

export async function adminLog(actorId: string, action: string, target?: string, reason?: string) {
  await prisma.adminLog.create({ data: { actorId, action, target, reason } });
}

const REASON: Record<string, string> = { BREAKDOWN: "Engine breakdown", ACCIDENT: "Accident", ROAD_BLOCKED: "Road blocked", FLOOD: "Flood or heavy rain", STRIKE: "Strike / hartal", OTHER: "Other" };
const CONDITION: Record<string, string> = { GOOD: "Good", PARTLY_DAMAGED: "Partly damaged", BADLY_DAMAGED: "Badly damaged" };

async function view(f: FullFailure) {
  const t = f.deal.transportOffers[0];
  const left = shelfLeftMs(f);
  const since = new Date(Date.now() - 30 * 86400_000);
  const [failures30, trips] = t ? await Promise.all([
    prisma.deliveryFailure.count({ where: { reportedById: t.transporterId, createdAt: { gte: since } } }),
    prisma.transportOffer.count({ where: { transporterId: t.transporterId, status: "ACCEPTED" } }),
  ]) : [0, 0];
  return {
    id: f.id, status: f.status, at: f.createdAt, escalated: !!f.escalatedAt, decidedAt: f.decidedAt, decisionNote: f.decisionNote,
    deal: { id: f.deal.id, code: code(f.deal.code), quantityKg: f.deal.quantityKg, pricePerKg: Number(f.deal.pricePerKg) },
    product: productInfo(f.deal.listing).name,
    where: { upazila: f.upazila.name, district: f.upazila.district.name, note: f.locationNote },
    from: f.deal.listing.upazila.name + ", " + f.deal.listing.upazila.district.name,
    reason: REASON[f.reason], details: f.details, photo: f.photo, condition: CONDITION[f.condition], usableKg: f.usableKg, canMove: f.canMove,
    shelfLeftHours: Math.max(0, Math.round(left / 3600_000)),
    farmer: { name: f.deal.farmer.name, phone: f.deal.farmer.phone, auto: f.deal.emergencyAuto },
    dealer: { name: f.deal.dealer.businessName ?? f.deal.dealer.name, phone: f.deal.dealer.phone },
    transporter: t ? { name: t.transporter.businessName ?? t.transporter.name, phone: t.transporter.phone, vehicle: vehicleLabel(t.vehicle) + " · " + t.vehicle.regNo, failures30, trips } : null,
    suggestion: suggest(left, Number(f.deal.pricePerKg)),
    emergency: f.emergency ? { id: f.emergency.id, code: code(f.emergency.code), status: f.emergency.status, tier: f.emergency.tier } : null,
  };
}

/** Queue: waiting first, most urgent (least shelf life) on top. */
adminRouter.get("/failures", requirePermission("DEALS"), async (_req, res) => {
  const all = await prisma.deliveryFailure.findMany({ include: failureInclude, orderBy: { createdAt: "desc" }, take: 100 });
  const lk = await locks(all.map((f) => "failure:" + f.id));
  const out = (await Promise.all(all.map(view))).map((f) => ({ ...f, lock: lk.get("failure:" + f.id) ?? null }));
  const waiting = out.filter((f) => f.status === "PENDING").sort((a, b) => a.shelfLeftHours - b.shelfLeftHours);
  res.json({ waiting, done: out.filter((f) => f.status !== "PENDING") });
});

async function pending(id: string) {
  const f = await prisma.deliveryFailure.findUnique({ where: { id }, include: failureInclude });
  return f && f.status === "PENDING" ? f : null;
}

adminRouter.post("/failures/:id/approve", requirePermission("DEALS"), async (req, res) => {
  if (!(await guard(req, res, "failure:" + String(req.params.id)))) return;
  const f = await pending(String(req.params.id));
  if (!f) return res.status(409).json({ error: "This report was already decided." });
  const me = req.user!;
  const n = await prisma.deliveryFailure.updateMany({ where: { id: f.id, status: "PENDING" }, data: { status: "APPROVED", decidedById: me.id, decidedAt: new Date() } });
  if (!n.count) return res.status(409).json({ error: "Another admin decided this report just now." });
  await prisma.deal.update({ where: { id: f.dealId }, data: { status: "FAILED" } });
  await adminLog(me.id, "Approved delivery failure", code(f.deal.code), `${f.usableKg} kg stuck in ${f.upazila.name}`);
  const name = productInfo(f.deal.listing).name, s = suggest(shelfLeftMs(f), Number(f.deal.pricePerKg));
  const t = f.deal.transportOffers[0];
  await notify(f.deal.farmerId, "Set up the emergency sale", `Your ${name} (${code(f.deal.code)}) is stuck in ${f.upazila.name}. ${f.usableKg} kg is usable with about ${s.shelfLeftHours} h of shelf life. Suggested: drop the price ${s.drop}% and bid for ${s.hours} h.${f.deal.emergencyAuto ? " If you do not respond in 30 minutes, it starts automatically with these values." : ""}`, "/farmer/sales?l=" + f.deal.listingId);
  await notify(f.deal.dealerId, "Delivery failed", `The vehicle carrying your ${name} (${code(f.deal.code)}) is stuck in ${f.upazila.name}. An admin approved the failure report, so the deal is marked "Failed: released for emergency sale".`, "/dealer/purchases");
  if (t) await notify(t.transporterId, "Failure report approved", `Stay with the vehicle. The produce is offered to dealers near ${f.upazila.name}. You will be told who collects it${f.canMove ? " or where to drive it" : ""}.`, "/transporter/trips");
  for (const id of [f.deal.farmerId, f.deal.dealerId, t?.transporterId]) if (id) pingUser(id, "deal");
  await release("failure:" + f.id);
  res.json({ ok: true });
});

adminRouter.post("/failures/:id/reject", requirePermission("DEALS"), async (req, res) => {
  const p = z.object({ reason: z.string().trim().min(5, "Write the reason the driver will see") .max(300) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Write the reason the driver will see.", fields: { reason: ["Required"] } });
  if (!(await guard(req, res, "failure:" + String(req.params.id)))) return;
  const f = await pending(String(req.params.id));
  if (!f) return res.status(409).json({ error: "This report was already decided." });
  const me = req.user!;
  await release("failure:" + f.id);
  const n = await prisma.deliveryFailure.updateMany({ where: { id: f.id, status: "PENDING" }, data: { status: "REJECTED", decidedById: me.id, decidedAt: new Date(), decisionNote: p.data.reason } });
  if (!n.count) return res.status(409).json({ error: "Another admin decided this report just now." });
  await prisma.deal.update({ where: { id: f.dealId }, data: { status: "IN_TRANSIT" } });
  await adminLog(me.id, "Rejected delivery failure", code(f.deal.code), p.data.reason);
  const t = f.deal.transportOffers[0];
  if (t) { await notify(t.transporterId, "Failure report rejected", `${code(f.deal.code)}: ${p.data.reason}. The trip continues; deliver as planned.`, "/transporter/trips"); pingUser(t.transporterId, "deal"); }
  res.json({ ok: true });
});
