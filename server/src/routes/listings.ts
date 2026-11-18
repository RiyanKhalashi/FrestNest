// Farmer: create, edit, withdraw and relist listings. Anyone allowed: view one listing.
import { Router, type Request } from "express";
import { z } from "zod";
import fs from "node:fs";
import { prisma } from "../db.js";
import { requireAuth, requireRole, requireActive } from "../auth.js";
import { listingPhotos, keep } from "../uploads.js";
import { productInfo, seasonOf, suggestScope, deadlineWindow, visibleTo, closeness, DAY, GRACE_MS } from "../rules.js";
import { listingInclude, listingView } from "../views.js";
import { pingListing, pingMarket } from "../realtime.js";
import { notifyMany } from "../notify.js";
import type { Scope, StorageNeed } from "../generated/prisma/client.js";

export const listingsRouter = Router();
listingsRouter.use(requireAuth);

const storage = z.enum(["NORMAL", "VENTILATED", "REFRIGERATED"]);
const scope = z.enum(["UPAZILA", "DISTRICT", "NATION"]);
const price = z.coerce.number().positive("Must be more than 0").max(100000);

const productPart = z.object({
  productId: z.coerce.number().int().positive().optional(),
  customName: z.string().trim().min(2).max(60).optional(),
  customShelfLife: z.coerce.number().int().min(1).max(365).optional(),
  customStorage: storage.optional(),
  category: z.enum(["Vegetable", "Fruit"]).default("Vegetable"),
});

const listingSchema = productPart.extend({
  quantityKg: z.coerce.number().int("Whole kg only").positive().max(1_000_000),
  pricePerKg: price,
  harvestDate: z.coerce.date(),
  description: z.string().trim().max(500).optional(),
  scope,
  vehicleNeed: storage.optional().nullable(),
  targetDistrictIds: z.array(z.coerce.number().int()).max(20).default([]),
  targetUpazilaIds: z.array(z.coerce.number().int()).max(20).default([]),
  mode: z.enum(["BID", "OWN"]),
  bidEndsAt: z.coerce.date().optional(),
  minIncrement: price.optional(),
  buyNowPrice: price.optional().nullable(),
  minOrderKg: z.coerce.number().int().positive().optional().nullable(),
  minResponseHours: z.coerce.number().int().refine((h) => [2, 6, 12, 24].includes(h), "Choose 2, 6, 12 or 24 hours").optional(),
});
type ListingInput = z.infer<typeof listingSchema>;

async function resolveProduct(d: z.infer<typeof productPart>) {
  if (d.productId) {
    const p = await prisma.product.findFirst({ where: { id: d.productId, active: true } });
    if (!p) return { error: "Choose a product from the list." };
    return { product: p, info: productInfo({ product: p }) };
  }
  if (!d.customName || !d.customShelfLife || !d.customStorage) return { error: "For a product not in the list, give its name, shelf life (days) and the vehicle it needs." };
  return { product: null, info: productInfo({ customName: d.customName, customShelfLife: d.customShelfLife, customStorage: d.customStorage as StorageNeed }) };
}

/** Validates the business rules; returns field errors or the data to save. */
async function check(d: ListingInput) {
  const fields: Record<string, string[]> = {};
  const r = await resolveProduct(d);
  if ("error" in r) return { fields: { productId: [r.error as string] } };
  const shelf = r.info.shelf;
  const now = Date.now();
  if (d.harvestDate.getTime() + shelf * DAY <= now) fields.harvestDate = ["This harvest date is too old: the produce would already be past its shelf life."];
  if (d.harvestDate.getTime() > now + 120 * DAY) fields.harvestDate = ["Harvest date can be at most 120 days ahead."];
  const win = await deadlineWindow(d.harvestDate, shelf, d.scope);
  let warning: string | undefined;
  if (d.mode === "BID") {
    if (!d.bidEndsAt) fields.bidEndsAt = ["Choose when bidding ends."];
    else if (d.bidEndsAt.getTime() < win.min.getTime() - GRACE_MS) fields.bidEndsAt = [`Bidding must run at least ${d.scope === "NATION" ? 24 : 12} hours.`];
    else if (d.bidEndsAt > win.latestSafe) warning = "Bidding ends after the safe time: the produce may reach the dealer with less than 40% shelf life left.";
    if (d.buyNowPrice && d.buyNowPrice <= d.pricePerKg) fields.buyNowPrice = ["Buy Now price must be higher than the base price."];
    if (d.minIncrement && d.minIncrement > d.pricePerKg) fields.minIncrement = ["Increment is larger than the price itself."];
  } else {
    if (!d.minResponseHours) fields.minResponseHours = ["Choose the shortest time dealers must give you to reply."];
    if (d.minOrderKg && d.minOrderKg > d.quantityKg) fields.minOrderKg = ["Minimum order is more than the quantity."];
  }
  if (Object.keys(fields).length) return { fields };
  return { product: r.product, info: r.info, warning, win };
}

function dataFor(d: ListingInput, ownDistrictId: number, op: "set" | "connect" = "set") {
  return {
    productId: d.productId ?? null,
    customName: d.productId ? null : d.customName,
    customShelfLife: d.productId ? null : d.customShelfLife,
    customStorage: d.productId ? null : (d.customStorage as StorageNeed),
    category: d.category,
    quantityKg: d.quantityKg, remainingKg: d.quantityKg,
    pricePerKg: d.pricePerKg, harvestDate: d.harvestDate, description: d.description || null,
    scope: d.scope as Scope, mode: d.mode,
    vehicleNeed: d.vehicleNeed && d.vehicleNeed !== "NORMAL" ? (d.vehicleNeed as StorageNeed) : null,
    bidEndsAt: d.mode === "BID" ? d.bidEndsAt : null,
    minIncrement: d.mode === "BID" ? d.minIncrement ?? 0.5 : null,
    buyNowPrice: d.mode === "BID" ? d.buyNowPrice ?? null : null,
    minOrderKg: d.mode === "OWN" ? d.minOrderKg ?? null : null,
    minResponseHours: d.mode === "OWN" ? d.minResponseHours : null,
    targetDistricts: { [op]: d.scope === "DISTRICT" ? d.targetDistrictIds.filter((x) => x !== ownDistrictId).map((id) => ({ id })) : [] },
    targetUpazilas: { [op]: d.scope === "UPAZILA" ? d.targetUpazilaIds.map((id) => ({ id })) : [] },
  };
}

function parseBody(req: Request) {
  // multipart (with photos) sends the form as a JSON string in "data"; plain JSON otherwise
  const raw = typeof req.body?.data === "string" ? JSON.parse(req.body.data) : req.body;
  return listingSchema.safeParse(raw);
}

/** Live help for the create form: shelf life, suggested visibility, deadline window. */
listingsRouter.post("/preview", requireRole("FARMER"), async (req, res) => {
  const p = productPart.extend({ harvestDate: z.coerce.date(), scope: scope.optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Need product and harvest date." });
  const r = await resolveProduct(p.data);
  if ("error" in r) return res.status(400).json({ error: r.error });
  const sug = suggestScope(r.info.shelf, r.info.longTrip);
  const sc = (p.data.scope ?? sug.scope) as Scope;
  const info = r.product ? productInfo({ product: r.product }, sc) : productInfo({ customName: p.data.customName, customShelfLife: p.data.customShelfLife, customStorage: p.data.customStorage as StorageNeed }, sc);
  const s = seasonOf(p.data.harvestDate);
  res.json({ info, suggestion: sug, season: { name: s.name, months: s.months, risk: s.risk }, window: await deadlineWindow(p.data.harvestDate, info.shelf, sc) });
});

/** Neighbouring upazilas / districts for the visibility quick-select. */
listingsRouter.get("/nearby", requireRole("FARMER"), async (req, res) => {
  const me = req.user!;
  const [up, dist] = await Promise.all([
    prisma.upazila.findUnique({ where: { id: me.upazilaId ?? -1 }, include: { neighbours: { select: { id: true, name: true } }, district: { include: { upazilas: { select: { id: true, name: true } } } } } }),
    prisma.district.findUnique({ where: { id: me.districtId ?? -1 }, include: { neighbours: { select: { id: true, name: true } } } }),
  ]);
  const others = await prisma.district.findMany({ where: { id: { not: me.districtId ?? -1 } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const neighbourUpazilas = up?.neighbours.length ? up.neighbours : (up?.district.upazilas ?? []).filter((u) => u.id !== up?.id);
  res.json({ upazila: up ? { id: up.id, name: up.name } : null, district: dist ? { id: dist.id, name: dist.name } : null, neighbourUpazilas, neighbourDistricts: dist?.neighbours ?? [], otherDistricts: others });
});

listingsRouter.post("/", requireRole("FARMER"), requireActive, listingPhotos, async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const cleanup = () => files.forEach((f) => fs.rm(f.path, () => {}));
  const parsed = parseBody(req);
  if (!parsed.success) { cleanup(); return res.status(400).json({ error: "Please check the form.", fields: z.flattenError(parsed.error).fieldErrors }); }
  const me = req.user!;
  if (!me.upazilaId || !me.districtId) { cleanup(); return res.status(400).json({ error: "Add your upazila in your profile first." }); }
  const c = await check(parsed.data);
  if ("fields" in c) { cleanup(); return res.status(400).json({ error: "Please check the form.", fields: c.fields }); }
  const l = await prisma.listing.create({
    data: { ...dataFor(parsed.data, me.districtId, "connect"), farmerId: me.id, upazilaId: me.upazilaId, photos: await Promise.all(files.map((f) => keep(f, "listings"))) },
    include: listingInclude,
  });
  pingMarket();
  res.status(201).json({ listing: listingView(l, me), warning: c.warning });
});

listingsRouter.get("/mine", requireRole("FARMER"), async (req, res) => {
  const ls = await prisma.listing.findMany({ where: { farmerId: req.user!.id }, include: listingInclude, orderBy: { createdAt: "desc" } });
  res.json({ listings: ls.map((l) => listingView(l, req.user!)) });
});

listingsRouter.get("/:id", async (req, res) => {
  const me = req.user!;
  const l = await prisma.listing.findUnique({ where: { id: String(req.params.id) }, include: listingInclude });
  if (!l) return res.status(404).json({ error: "Listing not found." });
  if (me.role === "FARMER" && l.farmerId !== me.id) return res.status(404).json({ error: "Listing not found." });
  if (me.role === "DEALER") {
    const ok = await prisma.listing.count({ where: { id: l.id, ...visibleTo(me) } });
    const involved = l.bids.some((b) => b.dealerId === me.id) || l.offers.some((o) => o.dealerId === me.id);
    if (!ok && !involved) return res.status(404).json({ error: "This listing is not visible in your area." });
    const near = (await closeness(me))(l.upazilaId, l.upazila.districtId);
    return res.json({ listing: listingView(l, me, near) });
  }
  if (me.role === "TRANSPORTER") return res.status(403).json({ error: "Not allowed." });
  res.json({ listing: listingView(l, me) });
});

async function ownListing(req: Request) {
  const l = await prisma.listing.findUnique({ where: { id: String(req.params.id) }, include: { _count: { select: { bids: true, offers: true } } } });
  return l && l.farmerId === req.user!.id ? l : null;
}

listingsRouter.put("/:id", requireRole("FARMER"), async (req, res) => {
  const l = await ownListing(req);
  if (!l) return res.status(404).json({ error: "Listing not found." });
  if (l.status !== "OPEN" || l._count.bids + l._count.offers > 0) return res.status(409).json({ error: "This listing is locked: it already has a bid or offer." });
  const parsed = parseBody(req);
  if (!parsed.success) return res.status(400).json({ error: "Please check the form.", fields: z.flattenError(parsed.error).fieldErrors });
  const c = await check(parsed.data);
  if ("fields" in c) return res.status(400).json({ error: "Please check the form.", fields: c.fields });
  const upd = await prisma.listing.update({ where: { id: l.id }, data: dataFor(parsed.data, req.user!.districtId!), include: listingInclude });
  pingListing(l.id); pingMarket();
  res.json({ listing: listingView(upd, req.user!), warning: c.warning });
});

listingsRouter.post("/:id/withdraw", requireRole("FARMER"), async (req, res) => {
  const l = await ownListing(req);
  if (!l) return res.status(404).json({ error: "Listing not found." });
  if (l.status !== "OPEN") return res.status(409).json({ error: "Only open listings can be withdrawn." });
  if (l._count.bids + l._count.offers > 0) return res.status(409).json({ error: "Dealers have already bid or made offers, so it can no longer be withdrawn." });
  await prisma.listing.update({ where: { id: l.id }, data: { status: "WITHDRAWN", closedAt: new Date() } });
  pingListing(l.id); pingMarket();
  res.json({ ok: true });
});

/** Bidding ended without bids: relist once with a new end time, a lower price, or switch to own price. */
listingsRouter.post("/:id/relist", requireRole("FARMER"), requireActive, async (req, res) => {
  const p = z.object({
    mode: z.enum(["BID", "OWN"]),
    bidEndsAt: z.coerce.date().optional(),
    pricePerKg: price.optional(),
    minResponseHours: z.coerce.number().int().refine((h) => [2, 6, 12, 24].includes(h)).optional(),
    minOrderKg: z.coerce.number().int().positive().optional().nullable(),
  }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the form." });
  const l = await prisma.listing.findUnique({ where: { id: String(req.params.id) }, include: { product: true } });
  if (!l || l.farmerId !== req.user!.id) return res.status(404).json({ error: "Listing not found." });
  if (l.status !== "NO_SALE" || l.relisted) return res.status(409).json({ error: "This listing cannot be relisted again." });
  const d = p.data, info = productInfo(l, l.scope);
  const win = await deadlineWindow(l.harvestDate, info.shelf, l.scope);
  if (Date.now() >= win.expiresAt.getTime()) return res.status(409).json({ error: "The shelf life has run out." });
  if (d.mode === "BID" && (!d.bidEndsAt || d.bidEndsAt.getTime() < win.min.getTime() - GRACE_MS)) return res.status(400).json({ error: `Bidding must run at least ${l.scope === "NATION" ? 24 : 12} hours.`, fields: { bidEndsAt: ["Too soon"] } });
  if (d.mode === "OWN" && !d.minResponseHours) return res.status(400).json({ error: "Choose the minimum reply time." });
  const newPrice = d.pricePerKg ?? Number(l.pricePerKg);
  const upd = await prisma.listing.update({
    where: { id: l.id },
    data: {
      status: "OPEN", relisted: true, closedAt: null, mode: d.mode, pricePerKg: newPrice, remainingKg: l.quantityKg,
      bidEndsAt: d.mode === "BID" ? d.bidEndsAt : null,
      buyNowPrice: d.mode === "BID" && l.buyNowPrice && Number(l.buyNowPrice) > newPrice ? l.buyNowPrice : null,
      minIncrement: d.mode === "BID" ? l.minIncrement ?? 0.5 : null,
      minResponseHours: d.mode === "OWN" ? d.minResponseHours : null, minOrderKg: d.mode === "OWN" ? d.minOrderKg ?? null : null,
    },
    include: listingInclude,
  });
  pingListing(l.id); pingMarket();
  res.json({ listing: listingView(upd, req.user!), warning: d.mode === "BID" && d.bidEndsAt! > win.latestSafe ? "Bidding ends after the safe time." : undefined });
});

export async function cancelOpenOffers(listingId: string, why: string) {
  const open = await prisma.offer.findMany({ where: { listingId, status: { in: ["PENDING", "COUNTERED"] } }, select: { id: true, dealerId: true } });
  if (!open.length) return;
  await prisma.offer.updateMany({ where: { id: { in: open.map((o) => o.id) } }, data: { status: "CANCELLED" } });
  await notifyMany(open.map((o) => o.dealerId), "Offer closed", why, "/dealer/purchases");
}
