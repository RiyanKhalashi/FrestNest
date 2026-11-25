// Primary deals (farmer + dealer): list, choose transport, extend the offer window, cancel, review.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { productInfo, setting, code, tripNeed, windowOptions } from "../services/rules.js";
import { dealInclude, dealView } from "../services/views.js";
import { pingListing, pingMarket, pingTransport } from "../lib/realtime.js";
import { notify, notifyMany } from "../services/notify.js";
import { pingDeal } from "./transport.js";
import { bookTransport, cancelDeal } from "../services/dealOps.js";

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
  const me = req.user!;
  const r = await bookTransport(String(req.params.id), String(req.params.offerId), { dealerId: me.id });
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  await notify(r.o.transporterId, "Offer accepted", `${me.businessName ?? me.name} chose your ${r.label} for ${r.name} ${code(r.full.code)}. Pickup ${r.when} in ${r.full.listing.upazila.name}. Ask the farmer for the pickup code.`, "/transporter/trips");
  res.json({ ok: true });
});

/** Dealer makes ONE lower counter-price on a waiting transport offer; the transporter accepts (= booked) or rejects. */
dealsRouter.post("/:id/transport/:offerId/counter", requireRole("DEALER"), async (req, res) => {
  const me = req.user!;
  const p = z.object({ price: z.coerce.number().int("Whole taka").min(100, "At least ৳100"), note: z.string().trim().max(200).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the counter-offer.", fields: z.flattenError(p.error).fieldErrors });
  const d = await prisma.deal.findUnique({ where: { id: String(req.params.id) }, include: dealInclude });
  const o = d?.transportOffers.find((x) => x.id === String(req.params.offerId));
  if (!d || !o || d.dealerId !== me.id) return res.status(404).json({ error: "Offer not found." });
  if (d.status !== "AWAITING_TRANSPORT" || o.status !== "PENDING") return res.status(409).json({ error: "This offer is no longer open." });
  if (o.counterState) return res.status(409).json({ error: "You already countered this offer. Each offer gets one counter." });
  if (p.data.price >= o.price) return res.status(400).json({ error: "Please check the counter-offer.", fields: { price: [`A counter must be lower than the offer (৳${o.price.toLocaleString("en-IN")})`] } });
  const hours = await setting("transportCounterHours", 2);
  const expires = new Date(Date.now() + hours * 3600_000);
  await prisma.transportOffer.update({ where: { id: o.id }, data: { counterPrice: p.data.price, counterNote: p.data.note || null, counterState: "WAITING", counterAt: new Date(), counterExpiresAt: expires } });
  const name = productInfo(d.listing).name;
  await notify(o.transporterId, "Counter-offer", `${me.businessName ?? me.name} asks ৳${p.data.price.toLocaleString("en-IN")} instead of ৳${o.price.toLocaleString("en-IN")} for ${name} ${code(d.code)}${p.data.note ? `: “${p.data.note}”` : ""}. Accept to get the trip, or reject to keep your offer. Answer within ${hours} hours.`, "/transporter/trips");
  pingDeal(d, [o.transporterId]);
  res.json({ ok: true, expiresAt: expires });
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
