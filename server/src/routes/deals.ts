// Primary deals (farmer + dealer): list, choose transport, extend the offer window, cancel, review.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { productInfo, vehicleBusy, setting, newCode, code, tripNeed, windowOptions } from "../rules.js";
import { dealInclude, dealView, vehicleLabel } from "../views.js";
import { pingListing, pingMarket, pingTransport } from "../realtime.js";
import { notify, notifyMany } from "../notify.js";
import { pingDeal } from "./transport.js";
import { cancelDeal } from "../dealOps.js";

export const dealsRouter = Router();
dealsRouter.use(requireAuth, requireRole("FARMER", "DEALER"));

dealsRouter.get("/", async (req, res) => {
  const me = req.user!;
  const deals = await prisma.deal.findMany({ where: me.role === "FARMER" ? { farmerId: me.id } : { dealerId: me.id }, include: dealInclude, orderBy: { createdAt: "desc" } });
  const out = [];
  for (const d of deals) out.push(await dealView(d, me));
  res.json({ deals: out });
});

async function mine(id: string, userId: string) {
  const d = await prisma.deal.findUnique({ where: { id }, include: dealInclude });
  return d && (d.farmerId === userId || d.dealerId === userId) ? d : null;
}

/** Dealer confirms one transport offer (dealer pays). */
dealsRouter.post("/:id/transport/:offerId/accept", requireRole("DEALER"), async (req, res) => {
  const me = req.user!, id = String(req.params.id), offerId = String(req.params.offerId);
  const r = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${id} FOR UPDATE`;
    const d = await tx.deal.findUnique({ where: { id }, include: { transportOffers: { include: { vehicle: true } } } });
    if (!d || d.dealerId !== me.id) return { ok: false as const, status: 404, error: "Deal not found." };
    if (d.status !== "AWAITING_TRANSPORT") return { ok: false as const, status: 409, error: "Transport is already arranged for this deal." };
    const o = d.transportOffers.find((x) => x.id === offerId);
    if (!o || o.status !== "PENDING") return { ok: false as const, status: 409, error: "This offer is no longer available." };
    const busy = await vehicleBusy(o.vehicleId, o.pickupAt, o.deliverBy);
    if (busy) return { ok: false as const, status: 409, error: `That vehicle was just booked for ${busy}. Choose another offer.` };
    await tx.transportOffer.update({ where: { id: o.id }, data: { status: "ACCEPTED" } });
    const others = d.transportOffers.filter((x) => x.id !== o.id && x.status === "PENDING");
    await tx.transportOffer.updateMany({ where: { id: { in: others.map((x) => x.id) } }, data: { status: "NOT_CHOSEN" } });
    // the same vehicle cannot be offered elsewhere at an overlapping time
    const clashes = await tx.transportOffer.findMany({ where: { vehicleId: o.vehicleId, status: "PENDING", pickupAt: { lt: o.deliverBy }, deliverBy: { gt: o.pickupAt } }, select: { id: true, dealId: true } });
    await tx.transportOffer.updateMany({ where: { id: { in: clashes.map((c) => c.id) } }, data: { status: "WITHDRAWN" } });
    let pickup = newCode(), delivery = newCode();
    while (delivery === pickup) delivery = newCode();
    await tx.deal.update({ where: { id }, data: { status: "TRANSPORT_CONFIRMED", pickupCode: pickup, deliveryCode: delivery, codeAttempts: 0 } });
    return { ok: true as const, d, o, others, clashes };
  });
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  const full = await prisma.deal.findUniqueOrThrow({ where: { id }, include: dealInclude });
  const name = productInfo(full.listing).name, when = r.o.pickupAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  await notify(r.o.transporterId, "Offer accepted", `${me.businessName ?? me.name} chose your ${vehicleLabel(r.o.vehicle)} (${r.o.vehicle.regNo}) for ${name} ${code(full.code)}. Pickup ${when} in ${full.listing.upazila.name}. Ask the farmer for the pickup code.`, "/transporter/trips");
  await notify(full.farmerId, "Transport confirmed", `${name} ${code(full.code)}: pickup ${when}. Give the driver your pickup code only when the produce is loaded.`, "/farmer/sales?l=" + full.listingId);
  await notifyMany(r.others.map((x) => x.transporterId), "Offer not chosen", `The dealer chose another transport offer for ${code(full.code)}.`, "/transporter/trips");
  if (r.clashes.length) await notify(r.o.transporterId, "Offers withdrawn", `${r.clashes.length} other offer(s) with ${r.o.vehicle.regNo} at overlapping times were withdrawn, because the vehicle is now booked.`, "/transporter/trips");
  pingDeal(full, [r.o.transporterId, ...r.others.map((x) => x.transporterId)]); pingTransport();
  res.json({ ok: true });
});

/** The dealer chooses how long transporters can send offers (3/6/12/24 h), counted from now, until the first offer arrives. */
dealsRouter.post("/:id/window", requireRole("DEALER"), async (req, res) => {
  const p = z.object({ hours: z.coerce.number().int() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Choose a time." });
  const d = await prisma.deal.findUnique({ where: { id: String(req.params.id) }, include: { dealer: { select: { districtId: true } }, listing: { include: { product: true, upazila: true } }, _count: { select: { transportOffers: true } } } });
  if (!d || d.dealerId !== req.user!.id) return res.status(404).json({ error: "Deal not found." });
  if (d.status !== "AWAITING_TRANSPORT") return res.status(409).json({ error: "Transport is already arranged." });
  if (d.windowExtended) return res.status(409).json({ error: "The window was already extended." });
  if (d._count.transportOffers > 0) return res.status(409).json({ error: "An offer has already arrived, so the time cannot change now." });
  const { long } = await tripNeed(d);
  const o = (await windowOptions(d.listing, long)).options.find((x) => x.hours === p.data.hours);
  if (!o) return res.status(400).json({ error: "Choose 3, 6, 12 or 24 hours." });
  if (!o.ok) return res.status(400).json({ error: `${o.hours} hours is too long for this produce: it would not arrive fresh enough. Choose a shorter time.` });
  await prisma.deal.update({ where: { id: d.id }, data: { windowHours: o.hours, transportWindowEndsAt: new Date(Date.now() + o.hours * 3600_000), windowNotified: false } });
  pingDeal(d); pingTransport();
  res.json({ ok: true, hours: o.hours });
});

/** No (good) offers in the window → the dealer can extend it once. */
dealsRouter.post("/:id/extend", requireRole("DEALER"), async (req, res) => {
  const d = await mine(String(req.params.id), req.user!.id);
  if (!d || d.dealerId !== req.user!.id) return res.status(404).json({ error: "Deal not found." });
  if (d.status !== "AWAITING_TRANSPORT") return res.status(409).json({ error: "Transport is already arranged." });
  if (d.windowExtended) return res.status(409).json({ error: "The offer window can be extended only once." });
  if (d.transportWindowEndsAt > new Date()) return res.status(409).json({ error: "The window is still open." });
  const hours = await setting("transportOfferWindowHours", 12);
  await prisma.deal.update({ where: { id: d.id }, data: { transportWindowEndsAt: new Date(Date.now() + hours * 3600_000), windowExtended: true, windowNotified: false } });
  pingDeal(d); pingTransport();
  res.json({ ok: true, hours });
});

/**
 * Cancel (agreed 2026-11-13, same rule for farmer and dealer):
 * - no transport booked → cancelled at once (reason required)
 * - transport booked → request; an admin approves or rejects (Phase 5 screens)
 * - after pickup → not possible (delivery-failure process, Phase 4)
 */
dealsRouter.post("/:id/cancel", async (req, res) => {
  const p = z.object({ reason: z.string().trim().min(5, "Write a short reason (at least 5 letters).").max(500) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Write a short reason (at least 5 letters).", fields: { reason: ["Required"] } });
  const me = req.user!;
  const d = await mine(String(req.params.id), me.id);
  if (!d) return res.status(404).json({ error: "Deal not found." });
  const who = me.businessName ?? me.name, other = me.role === "FARMER" ? d.dealerId : d.farmerId;
  const otherLink = me.role === "FARMER" ? "/dealer/purchases" : "/farmer/sales?l=" + d.listingId;
  const name = productInfo(d.listing).name;

  if (d.status === "TRANSPORT_CONFIRMED") {
    if (d.cancelRequests.some((c) => c.status === "PENDING")) return res.status(409).json({ error: "A cancellation request is already waiting for an admin." });
    await prisma.cancelRequest.create({ data: { dealId: d.id, byId: me.id, byRole: me.role, reason: p.data.reason } });
    await notify(other, "Cancellation requested", `${who} asked an admin to cancel deal ${code(d.code)} (${name}). Reason: ${p.data.reason}. Until an admin decides, the deal and the transport stay as they are.`, otherLink);
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", OR: [{ isSuperAdmin: true }, { permissions: { has: "DEALS" } }] }, select: { id: true } });
    await notifyMany(admins.map((a) => a.id), "Cancellation request", `${who} (${me.role.toLowerCase()}) wants to cancel ${code(d.code)} with transport booked.`, "/admin/cases");
    pingDeal(d);
    return res.json({ ok: true, requested: true });
  }
  if (d.status !== "AWAITING_TRANSPORT") return res.status(409).json({ error: d.status === "IN_TRANSIT" ? "The produce is already picked up, so the deal cannot be cancelled. Problems on the road go through the delivery-failure process." : "This deal can no longer be cancelled." });

  await cancelDeal(d.id, me.role, p.data.reason);
  await notify(other, "Deal cancelled", `${who} cancelled deal ${code(d.code)} (${name}). Reason: ${p.data.reason}`, otherLink);
  res.json({ ok: true });
});

/** Ratings after a completed deal: farmer → dealer + transporter, dealer → farmer + transporter. */
dealsRouter.post("/:id/review", async (req, res) => {
  const p = z.object({ toId: z.string(), stars: z.coerce.number().int().min(1).max(5), comment: z.string().trim().min(5, "Write a few words").max(600) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Choose 1–5 stars and write a short comment.", fields: z.flattenError(p.error).fieldErrors });
  const me = req.user!;
  const d = await mine(String(req.params.id), me.id);
  if (!d) return res.status(404).json({ error: "Deal not found." });
  const v = await dealView(d, me);
  if (d.status !== "COMPLETED") return res.status(409).json({ error: "You can review after the deal is completed." });
  const target = v.reviews.targets.find((t) => t.id === p.data.toId);
  if (!target) return res.status(409).json({ error: "You have already reviewed them for this deal." });
  await prisma.review.create({ data: { dealId: d.id, fromId: me.id, toId: target.id, stars: p.data.stars, comment: p.data.comment } });
  await notify(target.id, "New review", `${me.businessName ?? me.name} gave you ${p.data.stars} star${p.data.stars > 1 ? "s" : ""} for ${code(d.code)}.`, target.role === "TRANSPORTER" ? "/transporter/profile" : target.role === "DEALER" ? "/dealer/profile" : "/farmer/profile");
  res.json({ ok: true });
});
