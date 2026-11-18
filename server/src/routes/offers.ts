// Own-price listings: dealer offers (quantity + price + reply time), farmer accept / reject / one counter-offer.
import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole, requireActive } from "../auth.js";
import { visibleTo, productInfo, deadlineWindow, code, transportWindowEnd } from "../rules.js";
import { pingListing, pingMarket, pingTransport } from "../realtime.js";
import { notify, notifyMany } from "../notify.js";
import type { Prisma } from "../generated/prisma/client.js";

export const offersRouter = Router();
offersRouter.use(requireAuth);

const H = 3600_000;
const lock = (tx: Prisma.TransactionClient, id: string) => tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id} FOR UPDATE`;
const offerBody = z.object({
  quantityKg: z.coerce.number().int("Whole kg only").positive(),
  pricePerKg: z.coerce.number().positive().max(100000),
  replyHours: z.coerce.number().int().refine((h) => [2, 6, 12, 24].includes(h), "Choose 2, 6, 12 or 24 hours"),
  note: z.string().trim().max(300).optional(),
});

async function offerLimits(l: { harvestDate: Date; scope: "UPAZILA" | "DISTRICT" | "NATION"; product: Parameters<typeof productInfo>[0]["product"]; customName: string | null; customShelfLife: number | null; customStorage: Parameters<typeof productInfo>[0]["customStorage"] }) {
  const info = productInfo(l, l.scope);
  return deadlineWindow(l.harvestDate, info.shelf, l.scope);
}

/** Dealer sends an offer (one active offer per dealer per listing). */
offersRouter.post("/listing/:id", requireRole("DEALER"), requireActive, async (req, res) => {
  const p = offerBody.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the offer.", fields: z.flattenError(p.error).fieldErrors });
  const me = req.user!, id = String(req.params.id), d = p.data;
  const l = await prisma.listing.findFirst({ where: { AND: [{ id }, visibleTo(me)] }, include: { product: true } });
  if (!l) return res.status(404).json({ error: "Listing not found in your area." });
  if (l.mode !== "OWN" || l.status !== "OPEN") return res.status(409).json({ error: "This listing is not taking offers." });
  if (d.quantityKg > l.remainingKg) return res.status(400).json({ error: `Only ${l.remainingKg} kg is left.`, fields: { quantityKg: [`At most ${l.remainingKg} kg`] } });
  if (l.minOrderKg && d.quantityKg < Math.min(l.minOrderKg, l.remainingKg)) return res.status(400).json({ error: `The farmer's minimum order is ${l.minOrderKg} kg.`, fields: { quantityKg: [`At least ${l.minOrderKg} kg`] } });
  if (l.minResponseHours && d.replyHours < l.minResponseHours) return res.status(400).json({ error: `The farmer needs at least ${l.minResponseHours} hours to reply.`, fields: { replyHours: [`At least ${l.minResponseHours} h`] } });
  const win = await offerLimits(l);
  const expiresAt = new Date(Math.min(Date.now() + d.replyHours * H, Math.max(win.latestSafe.getTime(), Date.now() + (l.minResponseHours ?? 2) * H)));
  const existing = await prisma.offer.findFirst({ where: { listingId: id, dealerId: me.id, status: { in: ["PENDING", "COUNTERED"] } } });
  if (existing) return res.status(409).json({ error: "You already have an active offer on this listing. Edit or withdraw it instead." });
  await prisma.offer.create({ data: { listingId: id, dealerId: me.id, quantityKg: d.quantityKg, pricePerKg: d.pricePerKg, expiresAt, note: d.note || null } });
  await notify(l.farmerId, "New offer", `${me.businessName ?? me.name} offers ${d.quantityKg} kg of ${productInfo(l).name} at ৳${d.pricePerKg.toFixed(2)}/kg. Reply within ${d.replyHours} h.`, "/farmer/sales?l=" + id);
  pingListing(id);
  res.status(201).json({ ok: true });
});

async function myOffer(req: Request) {
  const o = await prisma.offer.findUnique({ where: { id: String(req.params.offerId) }, include: { listing: { include: { product: true } } } });
  return o && o.dealerId === req.user!.id ? o : null;
}

/** Dealer edits a pending offer (before the farmer answers). */
offersRouter.put("/:offerId", requireRole("DEALER"), requireActive, async (req, res) => {
  const p = offerBody.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the offer." });
  const o = await myOffer(req);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  if (o.status !== "PENDING") return res.status(409).json({ error: "The farmer has already answered; the offer is locked." });
  const l = o.listing, d = p.data;
  if (d.quantityKg > l.remainingKg) return res.status(400).json({ error: `Only ${l.remainingKg} kg is left.` });
  if (l.minResponseHours && d.replyHours < l.minResponseHours) return res.status(400).json({ error: `The farmer needs at least ${l.minResponseHours} hours to reply.` });
  await prisma.offer.update({ where: { id: o.id }, data: { quantityKg: d.quantityKg, pricePerKg: d.pricePerKg, note: d.note || null, expiresAt: new Date(Date.now() + d.replyHours * H) } });
  await notify(l.farmerId, "Offer changed", `${req.user!.businessName ?? req.user!.name} changed their offer: ${d.quantityKg} kg at ৳${d.pricePerKg.toFixed(2)}/kg.`, "/farmer/sales?l=" + l.id);
  pingListing(l.id);
  res.json({ ok: true });
});

offersRouter.post("/:offerId/withdraw", requireRole("DEALER"), async (req, res) => {
  const o = await myOffer(req);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  if (!["PENDING", "COUNTERED"].includes(o.status)) return res.status(409).json({ error: "This offer is already closed." });
  await prisma.offer.update({ where: { id: o.id }, data: { status: "WITHDRAWN" } });
  await notify(o.listing.farmerId, "Offer withdrawn", `${req.user!.businessName ?? req.user!.name} withdrew their offer on ${productInfo(o.listing).name}.`, "/farmer/sales?l=" + o.listingId);
  pingListing(o.listingId);
  res.json({ ok: true });
});

/** Turns an offer into a Primary Deal. Shared by farmer-accept and dealer-accepts-counter. */
async function acceptOffer(offerId: string, by: "farmer" | "dealer") {
  return prisma.$transaction(async (tx) => {
    const o0 = await tx.offer.findUnique({ where: { id: offerId }, select: { listingId: true } });
    if (!o0) return { ok: false as const, status: 404, error: "Offer not found." };
    await lock(tx, o0.listingId);
    const o = await tx.offer.findUniqueOrThrow({ where: { id: offerId }, include: { listing: { include: { product: true } } } });
    const l = o.listing;
    const want = by === "farmer" ? "PENDING" : "COUNTERED";
    if (o.status !== want) return { ok: false as const, status: 409, error: "This offer can no longer be accepted." };
    if (o.expiresAt <= new Date()) return { ok: false as const, status: 409, error: "This offer has expired." };
    if (l.status !== "OPEN") return { ok: false as const, status: 409, error: "The listing is closed." };
    const qty = by === "dealer" && o.counterQtyKg ? o.counterQtyKg : o.quantityKg;
    const price = by === "dealer" && o.counterPrice ? o.counterPrice : o.pricePerKg;
    if (qty > l.remainingKg) return { status: 409, error: `Only ${l.remainingKg} kg is left.` } as const;
    const remaining = l.remainingKg - qty;
    await tx.offer.update({ where: { id: o.id }, data: { status: "ACCEPTED" } });
    const deal = await tx.deal.create({ data: { listingId: l.id, farmerId: l.farmerId, dealerId: o.dealerId, offerId: o.id, quantityKg: qty, pricePerKg: price, source: "OFFER", transportWindowEndsAt: await transportWindowEnd() } });
    await tx.listing.update({ where: { id: l.id }, data: { remainingKg: remaining, ...(remaining === 0 ? { status: "SOLD", closedAt: new Date() } : {}) } });
    // offers that no longer fit are cancelled automatically
    const conflicts = await tx.offer.findMany({ where: { listingId: l.id, status: { in: ["PENDING", "COUNTERED"] }, OR: [{ quantityKg: { gt: remaining } }, { counterQtyKg: { gt: remaining } }] }, select: { id: true, dealerId: true } });
    if (conflicts.length) await tx.offer.updateMany({ where: { id: { in: conflicts.map((c) => c.id) } }, data: { status: "CANCELLED" } });
    return { ok: true as const, o, l, deal, qty, price: Number(price), remaining, conflicts };
  });
}

async function afterAccept(r: Extract<Awaited<ReturnType<typeof acceptOffer>>, { ok: true }>) {
  const name = productInfo(r.l).name;
  const text = `${r.qty} kg of ${name} at ৳${r.price.toFixed(2)}/kg (৳${Math.round(r.qty * r.price).toLocaleString("en-IN")}). Deal ${code(r.deal.code)} is waiting for transport offers.`;
  await notify(r.o.dealerId, "Deal confirmed", text, "/dealer/purchases");
  await notify(r.l.farmerId, "Deal confirmed", text, "/farmer/sales?l=" + r.l.id);
  await notifyMany(r.conflicts.map((c) => c.dealerId), "Offer closed", `${name} ${code(r.l.code)}: not enough quantity left for your offer.`, "/dealer/purchases");
  pingListing(r.l.id); if (r.remaining === 0) pingMarket(); pingTransport();
}

async function farmerOffer(req: Request) {
  const o = await prisma.offer.findUnique({ where: { id: String(req.params.offerId) }, include: { listing: { include: { product: true } }, dealer: true } });
  return o && o.listing.farmerId === req.user!.id ? o : null;
}

offersRouter.post("/:offerId/accept", requireRole("FARMER"), async (req, res) => {
  const o = await farmerOffer(req);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  const r = await acceptOffer(o.id, "farmer");
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  await afterAccept(r);
  res.json({ ok: true, deal: code(r.deal.code) });
});

offersRouter.post("/:offerId/reject", requireRole("FARMER"), async (req, res) => {
  const o = await farmerOffer(req);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  if (o.status !== "PENDING") return res.status(409).json({ error: "This offer is already answered." });
  await prisma.offer.update({ where: { id: o.id }, data: { status: "REJECTED" } });
  await notify(o.dealerId, "Offer rejected", `${req.user!.name} rejected your offer on ${productInfo(o.listing).name} ${code(o.listing.code)}.`, "/dealer/purchases");
  pingListing(o.listingId);
  res.json({ ok: true });
});

/** Farmer may send ONE counter-offer; the dealer answers before their own timer ends. */
offersRouter.post("/:offerId/counter", requireRole("FARMER"), async (req, res) => {
  const p = z.object({ pricePerKg: z.coerce.number().positive().max(100000), quantityKg: z.coerce.number().int().positive().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter your counter price." });
  const o = await farmerOffer(req);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  if (o.status !== "PENDING") return res.status(409).json({ error: "You can counter only once, while the offer is waiting." });
  if (o.expiresAt <= new Date()) return res.status(409).json({ error: "This offer has expired." });
  const qty = p.data.quantityKg ?? o.quantityKg;
  if (qty > o.listing.remainingKg) return res.status(400).json({ error: `Only ${o.listing.remainingKg} kg is left.` });
  await prisma.offer.update({ where: { id: o.id }, data: { status: "COUNTERED", counterPrice: p.data.pricePerKg, counterQtyKg: qty } });
  await notify(o.dealerId, "Counter-offer", `${req.user!.name} asks ৳${p.data.pricePerKg.toFixed(2)}/kg for ${qty} kg of ${productInfo(o.listing).name}. Answer before your offer time ends.`, "/dealer/purchases");
  pingListing(o.listingId);
  res.json({ ok: true });
});

offersRouter.post("/:offerId/accept-counter", requireRole("DEALER"), requireActive, async (req, res) => {
  const o = await myOffer(req);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  const r = await acceptOffer(o.id, "dealer");
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  await afterAccept(r);
  res.json({ ok: true, deal: code(r.deal.code) });
});

offersRouter.post("/:offerId/reject-counter", requireRole("DEALER"), async (req, res) => {
  const o = await myOffer(req);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  if (o.status !== "COUNTERED") return res.status(409).json({ error: "There is no counter-offer to reject." });
  await prisma.offer.update({ where: { id: o.id }, data: { status: "REJECTED" } });
  await notify(o.listing.farmerId, "Counter-offer declined", `${req.user!.businessName ?? req.user!.name} declined your counter-offer on ${productInfo(o.listing).name}.`, "/farmer/sales?l=" + o.listingId);
  pingListing(o.listingId);
  res.json({ ok: true });
});

/** Dealer: all my offers and bids, for D3 My Purchases. */
offersRouter.get("/mine", requireRole("DEALER"), async (req, res) => {
  const me = req.user!;
  const offers = await prisma.offer.findMany({ where: { dealerId: me.id }, include: { listing: { include: { product: true, farmer: { select: { name: true } }, upazila: { include: { district: true } } } } }, orderBy: { updatedAt: "desc" }, take: 100 });
  const bidListings = await prisma.listing.findMany({ where: { bids: { some: { dealerId: me.id } } }, include: { product: true, upazila: { include: { district: true } }, bids: { orderBy: { pricePerKg: "desc" } }, farmer: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 100 });
  res.json({
    offers: offers.map((o) => ({
      id: o.id, status: o.status, quantityKg: o.quantityKg, pricePerKg: Number(o.pricePerKg), counterQtyKg: o.counterQtyKg, counterPrice: o.counterPrice === null ? null : Number(o.counterPrice),
      expiresAt: o.expiresAt, at: o.createdAt, listing: { id: o.listing.id, code: code(o.listing.code), product: productInfo(o.listing).name, farmer: o.listing.farmer.name, place: o.listing.upazila.name + ", " + o.listing.upazila.district.name, remainingKg: o.listing.remainingKg, minResponseHours: o.listing.minResponseHours },
    })),
    bids: bidListings.map((l) => {
      const mine = l.bids.filter((b) => b.dealerId === me.id)[0];
      return { listingId: l.id, code: code(l.code), product: productInfo(l).name, quantityKg: l.quantityKg, farmer: l.farmer.name, place: l.upazila.name + ", " + l.upazila.district.name, status: l.status, endsAt: l.bidEndsAt, top: Number(l.bids[0].pricePerKg), myBest: Number(mine.pricePerKg), leading: l.bids[0].dealerId === me.id };
    }),
  });
});
