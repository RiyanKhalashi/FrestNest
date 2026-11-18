// Dealer: browse the marketplace, bid, Buy Now.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole, requireActive } from "../auth.js";
import { visibleTo, closeness, productInfo, money, code, transportWindowEnd } from "../rules.js";
import { listingInclude, listingView } from "../views.js";
import { pingListing, pingMarket, pingTransport } from "../realtime.js";
import { notify, notifyMany } from "../notify.js";
import type { Prisma } from "../generated/prisma/client.js";
import { setupEmergencyDelivery, afterEmergencyDeal } from "../emergency.js";

export const marketRouter = Router();
marketRouter.use(requireAuth, requireRole("DEALER"));

marketRouter.get("/", async (req, res) => {
  const me = req.user!;
  const q = z.object({
    productId: z.coerce.number().int().optional(), districtId: z.coerce.number().int().optional(), upazilaId: z.coerce.number().int().optional(),
    mode: z.enum(["BID", "OWN"]).optional(), harvest: z.enum(["done", "soon"]).optional(),
    sort: z.enum(["near", "new", "ending"]).default("near"),
  }).safeParse(req.query);
  const f = q.success ? q.data : { sort: "near" as const };
  const where: Prisma.ListingWhereInput = {
    AND: [visibleTo(me), { status: "OPEN" }],
    ...("productId" in f && f.productId ? { productId: f.productId } : {}),
    ...("upazilaId" in f && f.upazilaId ? { upazilaId: f.upazilaId } : "districtId" in f && f.districtId ? { upazila: { districtId: f.districtId } } : {}),
    ...("mode" in f && f.mode ? { mode: f.mode } : {}),
    ...("harvest" in f && f.harvest ? { harvestDate: f.harvest === "done" ? { lte: new Date() } : { gt: new Date() } } : {}),
  };
  const ls = await prisma.listing.findMany({ where, include: listingInclude, take: 200 });
  const near = await closeness(me);
  let views = ls.map((l) => listingView(l, me, near(l.upazilaId, l.upazila.districtId)));
  views = views.filter((v) => v.daysLeft === null || v.daysLeft > 0);
  if (f.sort === "near") views.sort((a, b) => a.near!.rank - b.near!.rank || +new Date(b.createdAt) - +new Date(a.createdAt));
  else if (f.sort === "new") views.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  else views.sort((a, b) => +new Date(a.bidding?.endsAt ?? a.expiresAt) - +new Date(b.bidding?.endsAt ?? b.expiresAt));
  // filter options = what this dealer can see at all
  const all = await prisma.listing.findMany({ where: { AND: [visibleTo(me), { status: "OPEN" }] }, select: { product: { select: { id: true, nameEn: true } }, upazila: { select: { id: true, name: true, district: { select: { id: true, name: true } } } } } });
  const opt = <T extends { id: number }>(xs: T[]) => [...new Map(xs.map((x) => [x.id, x])).values()];
  res.json({
    listings: views,
    options: {
      products: opt(all.flatMap((l) => (l.product ? [{ id: l.product.id, name: l.product.nameEn }] : []))),
      districts: opt(all.map((l) => ({ id: l.upazila.district.id, name: l.upazila.district.name }))),
      upazilas: opt(all.map((l) => ({ id: l.upazila.id, name: l.upazila.name, districtId: l.upazila.district.id }))),
    },
  });
});

/** Lock the listing row so two dealers cannot win at the same moment. */
const lock = (tx: Prisma.TransactionClient, id: string) => tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id} FOR UPDATE`;

marketRouter.post("/:id/bid", requireActive, async (req, res) => {
  const p = z.object({ pricePerKg: z.coerce.number().positive().max(100000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter a valid price per kg." });
  const me = req.user!, id = String(req.params.id), price = Math.round(p.data.pricePerKg * 100) / 100;
  const r = await prisma.$transaction(async (tx) => {
    await lock(tx, id);
    const l = await tx.listing.findFirst({ where: { AND: [{ id }, visibleTo(me)] }, include: { bids: { orderBy: { pricePerKg: "desc" }, take: 1 }, product: true } });
    if (!l) return { ok: false as const, status: 404, error: "Listing not found in your area." };
    if (l.mode !== "BID" || l.status !== "OPEN" || !l.bidEndsAt || l.bidEndsAt <= new Date()) return { ok: false as const, status: 409, error: "Bidding is closed." };
    const top = l.bids[0];
    const min = top ? Number(top.pricePerKg) + Number(l.minIncrement ?? 0.5) : Number(l.pricePerKg);
    if (price + 1e-9 < min) return { ok: false as const, status: 400, error: top ? `Your bid must be at least ৳${min.toFixed(2)} (highest ৳${Number(top.pricePerKg).toFixed(2)} + ৳${Number(l.minIncrement ?? 0.5).toFixed(2)}).` : `Your bid must be at least the base price ৳${min.toFixed(2)}.` };
    if (top && top.dealerId === me.id) return { ok: false as const, status: 409, error: "You already have the highest bid." };
    await tx.bid.create({ data: { listingId: id, dealerId: me.id, pricePerKg: price } });
    return { ok: true as const, l, prevTop: top };
  });
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  const name = productInfo(r.l).name;
  await notify(r.l.farmerId, "New bid", `${name} ${code(r.l.code)}: new highest bid ৳${price.toFixed(2)}/kg.`, "/farmer/sales?l=" + id);
  if (r.prevTop && r.prevTop.dealerId !== me.id) await notify(r.prevTop.dealerId, "You were outbid", `${name} ${code(r.l.code)}: highest bid is now ৳${price.toFixed(2)}/kg.`, "/dealer/market?l=" + id);
  pingListing(id);
  res.json({ ok: true });
});

marketRouter.post("/:id/buy-now", requireActive, async (req, res) => {
  const me = req.user!, id = String(req.params.id);
  const r = await prisma.$transaction(async (tx) => {
    await lock(tx, id);
    const l = await tx.listing.findFirst({ where: { AND: [{ id }, visibleTo(me)] }, include: { bids: { orderBy: { pricePerKg: "desc" } }, product: true } });
    if (!l) return { ok: false as const, status: 404, error: "Listing not found in your area." };
    if (l.mode !== "BID" || l.status !== "OPEN" || !l.bidEndsAt || l.bidEndsAt <= new Date()) return { ok: false as const, status: 409, error: "This listing is already closed." };
    if (!l.buyNowPrice) return { ok: false as const, status: 409, error: "This listing has no Buy Now price." };
    if (l.bids[0] && Number(l.bids[0].pricePerKg) >= Number(l.buyNowPrice)) return { ok: false as const, status: 409, error: "Buy Now is gone: bids have reached the Buy Now price." };
    await tx.listing.update({ where: { id }, data: { status: "SOLD", remainingKg: 0, closedAt: new Date() } });
    const deal = await tx.deal.create({ data: { listingId: id, farmerId: l.farmerId, dealerId: me.id, quantityKg: l.quantityKg, pricePerKg: l.buyNowPrice, source: l.isEmergency ? "EMERGENCY" : "BUY_NOW", transportWindowEndsAt: await transportWindowEnd() } });
    const setup = l.isEmergency ? await setupEmergencyDelivery(tx, deal.id, id) : null;
    return { ok: true as const, l, deal, setup };
  });
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  const name = productInfo(r.l).name, total = Math.round(Number(r.l.buyNowPrice) * r.l.quantityKg);
  await notify(r.l.farmerId, "Sold with Buy Now", `${me.businessName ?? me.name} bought all ${r.l.quantityKg} kg of ${name} at ৳${money(r.l.buyNowPrice)}/kg (৳${total.toLocaleString("en-IN")}). Deal ${code(r.deal.code)}.`, "/farmer/sales?l=" + id);
  await notifyMany(r.l.bids.map((b) => b.dealerId).filter((d) => d !== me.id), "Bidding closed", `${name} ${code(r.l.code)} was bought with Buy Now.`, "/dealer/market");
  if (r.setup) await afterEmergencyDeal(r.deal.id, r.setup);
  pingListing(id); pingMarket(); pingTransport();
  res.json({ ok: true, deal: code(r.deal.code) });
});
