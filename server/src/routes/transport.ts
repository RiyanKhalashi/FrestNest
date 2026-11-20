// Transporter: find deals to carry, send offers (one vehicle each), pickup / delivery codes, cancel a trip.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole, requireActive } from "../auth.js";
import { facilityFits, tripNeed, smallPickupAllowed, vehicleBusy, productInfo, setting, code, DAY } from "../rules.js";
import { dealInclude, dealView, vehicleLabel, type FullDeal } from "../views.js";
import { notify } from "../notify.js";
import { pingUser, pingTransport } from "../realtime.js";
import type { User, Vehicle } from "../generated/prisma/client.js";
import fs from "node:fs";
import { failurePhoto, keep } from "../uploads.js";
import { bookTransport } from "../dealOps.js";

export const transportRouter = Router();
transportRouter.use(requireAuth, requireRole("TRANSPORTER"));

export function pingDeal(d: { farmerId: string; dealerId: string }, extra: string[] = []) {
  for (const id of new Set([d.farmerId, d.dealerId, ...extra])) pingUser(id, "deal");
}

async function myVehicles(me: User) {
  return prisma.vehicle.findMany({ where: { ownerId: me.id, status: "APPROVED", active: true } });
}
/** Which of my vehicles can carry this deal (facility + full quantity). */
async function fitting(d: FullDeal, vs: Vehicle[]) {
  const { need } = await tripNeed(d);
  return { need, fits: vs.filter((v) => facilityFits(v.facility, need) && v.capacityKg >= d.quantityKg) };
}

transportRouter.get("/deals", async (req, res) => {
  const me = req.user!;
  const q = z.object({ districtIds: z.string().optional(), upazilaId: z.coerce.number().int().optional(), need: z.enum(["NORMAL", "VENTILATED", "REFRIGERATED"]).optional(), state: z.enum(["new", "mine"]).optional() }).safeParse(req.query);
  const f = q.success ? q.data : {};
  const districtIds = f.districtIds ? f.districtIds.split(",").map(Number).filter(Boolean) : null;
  const deals = await prisma.deal.findMany({
    where: {
      status: "AWAITING_TRANSPORT",
      OR: [{ transportWindowEndsAt: { gt: new Date() } }, { transportOffers: { some: { transporterId: me.id, status: "PENDING" } } }],
      ...(districtIds ? { listing: { upazila: { districtId: { in: districtIds } } } } : {}),
      ...(f.upazilaId ? { listing: { upazilaId: f.upazilaId } } : {}),
    },
    include: dealInclude, orderBy: { transportWindowEndsAt: "asc" }, take: 200,
  });
  const vs = await myVehicles(me);
  const out = []; let hiddenFacility = 0, hiddenLocal = 0;
  for (const d of deals) {
    const { need, fits } = await fitting(d, vs);
    if (!fits.length) { hiddenFacility++; continue; }
    if (!(await smallPickupAllowed(d.quantityKg, d.listing.upazilaId, me.upazilaId))) { hiddenLocal++; continue; }
    if (f.need && need !== f.need) continue;
    const mine = d.transportOffers.some((o) => o.transporterId === me.id && o.status === "PENDING");
    if (f.state === "new" && mine) continue;
    if (f.state === "mine" && !mine) continue;
    out.push({ ...(await dealView(d, me)), fittingVehicles: fits.map((v) => v.id), small: d.quantityKg < (await setting("smallPickupMaxKg", 300)), pickupDistrictId: d.listing.upazila.districtId, pickupUpazilaId: d.listing.upazilaId });
  }
  const districts = await prisma.district.findMany({ select: { id: true, name: true, upazilas: { select: { id: true, name: true } } }, orderBy: { name: "asc" } });
  res.json({ deals: out, hidden: { facility: hiddenFacility, local: hiddenLocal }, vehicles: vs.length, districts, myDistrictId: me.districtId });
});

const offerBody = z.object({
  vehicleId: z.string().min(1, "Choose a vehicle"),
  price: z.coerce.number().int("Whole taka").min(100, "At least ৳100").max(1_000_000),
  pickupAt: z.coerce.date(),
  deliverBy: z.coerce.date(),
  note: z.string().trim().max(300).optional(),
});

async function checkOffer(me: User, d: FullDeal, b: z.infer<typeof offerBody>, exceptOfferId?: string) {
  const fields: Record<string, string[]> = {};
  if (d.status !== "AWAITING_TRANSPORT") return { error: "This deal is no longer taking transport offers." };
  if (!exceptOfferId && d.transportWindowEndsAt <= new Date()) return { error: "The offer window for this deal has closed." };
  const v = await prisma.vehicle.findUnique({ where: { id: b.vehicleId } });
  if (!v || v.ownerId !== me.id) return { fields: { vehicleId: ["Choose one of your vehicles"] } };
  if (v.status !== "APPROVED") return { fields: { vehicleId: ["This vehicle is not approved by an admin yet"] } };
  if (!v.active) return { fields: { vehicleId: ["This vehicle is turned off"] } };
  const { need } = await tripNeed(d);
  if (!facilityFits(v.facility, need)) fields.vehicleId = [`This deal needs a ${need.toLowerCase()} vehicle`];
  else if (v.capacityKg < d.quantityKg) fields.vehicleId = [`Capacity ${v.capacityKg} kg is less than ${d.quantityKg} kg`];
  if (!(await smallPickupAllowed(d.quantityKg, d.listing.upazilaId, me.upazilaId))) return { error: "Small pickups go only to transporters based in or next to the pickup upazila." };
  if (b.pickupAt.getTime() < Date.now() - 5 * 60_000) fields.pickupAt = ["Pickup time is in the past"];
  if (b.deliverBy <= b.pickupAt) fields.deliverBy = ["Delivery must be after pickup"];
  const spoil = d.listing.harvestDate.getTime() + productInfo(d.listing).shelf * DAY;
  if (b.deliverBy.getTime() > spoil) fields.deliverBy = ["The produce would pass its shelf life before delivery"];
  if (Object.keys(fields).length) return { fields };
  const busy = await vehicleBusy(v.id, b.pickupAt, b.deliverBy);
  if (busy) return { fields: { pickupAt: [`${v.regNo} is already booked for ${busy} at this time`] } };
  return { vehicle: v };
}

transportRouter.post("/deals/:id/offers", requireActive, async (req, res) => {
  const me = req.user!;
  const p = offerBody.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the offer.", fields: z.flattenError(p.error).fieldErrors });
  const d = await prisma.deal.findUnique({ where: { id: String(req.params.id) }, include: dealInclude });
  if (!d) return res.status(404).json({ error: "Deal not found." });
  if (d.transportOffers.some((o) => o.transporterId === me.id && o.status === "PENDING")) return res.status(409).json({ error: "You already have an offer on this deal. Edit or withdraw it instead." });
  const c = await checkOffer(me, d, p.data);
  if ("error" in c) return res.status(409).json({ error: c.error });
  if ("fields" in c) return res.status(400).json({ error: "Please check the offer.", fields: c.fields });
  await prisma.transportOffer.create({ data: { dealId: d.id, transporterId: me.id, vehicleId: c.vehicle.id, price: p.data.price, pickupAt: p.data.pickupAt, deliverBy: p.data.deliverBy, note: p.data.note || null } });
  const who = me.businessName ?? me.name, name = productInfo(d.listing).name;
  await notify(d.dealerId, "Transport offer", `${who} offers ${vehicleLabel(c.vehicle)} for ${name} ${code(d.code)}: ৳${p.data.price.toLocaleString("en-IN")}.`, "/dealer/purchases");
  await notify(d.farmerId, "Transport offer", `${who} sent a transport offer for your ${name} deal ${code(d.code)}. The dealer chooses.`, "/farmer/sales?l=" + d.listingId);
  pingDeal(d);
  res.status(201).json({ ok: true });
});

async function myOffer(id: string, me: User) {
  const o = await prisma.transportOffer.findUnique({ where: { id }, include: { deal: { include: dealInclude } } });
  return o && o.transporterId === me.id ? o : null;
}

transportRouter.put("/offers/:id", requireActive, async (req, res) => {
  const me = req.user!;
  const p = offerBody.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the offer.", fields: z.flattenError(p.error).fieldErrors });
  const o = await myOffer(String(req.params.id), me);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  if (o.status !== "PENDING") return res.status(409).json({ error: "This offer is locked: the dealer has already decided." });
  if (o.counterState === "WAITING") return res.status(409).json({ error: "The dealer sent a counter-offer. Accept or reject it first, or withdraw your offer." });
  const c = await checkOffer(me, o.deal, p.data, o.id);
  if ("error" in c) return res.status(409).json({ error: c.error });
  if ("fields" in c) return res.status(400).json({ error: "Please check the offer.", fields: c.fields });
  await prisma.transportOffer.update({ where: { id: o.id }, data: { vehicleId: c.vehicle.id, price: p.data.price, pickupAt: p.data.pickupAt, deliverBy: p.data.deliverBy, note: p.data.note || null } });
  await notify(o.deal.dealerId, "Transport offer changed", `${me.businessName ?? me.name} changed their offer for ${code(o.deal.code)}: ৳${p.data.price.toLocaleString("en-IN")}.`, "/dealer/purchases");
  pingDeal(o.deal);
  res.json({ ok: true });
});

transportRouter.post("/offers/:id/withdraw", async (req, res) => {
  const o = await myOffer(String(req.params.id), req.user!);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  if (o.status !== "PENDING") return res.status(409).json({ error: "Only waiting offers can be withdrawn. To give up a confirmed trip, cancel it with a reason." });
  const counterOpen = o.counterState === "WAITING";
  await prisma.transportOffer.update({ where: { id: o.id }, data: { status: "WITHDRAWN", ...(counterOpen ? { counterState: "CLOSED" as const } : {}) } });
  if (counterOpen) await notify(o.deal.dealerId, "Offer withdrawn", `${req.user!.businessName ?? req.user!.name} withdrew their transport offer for ${code(o.deal.code)} instead of answering your counter-offer.`, "/dealer/purchases");
  pingDeal(o.deal);
  res.json({ ok: true });
});

/** Transporter accepts the dealer's counter-offer: the trip is booked at the counter price. */
transportRouter.post("/offers/:id/counter/accept", requireActive, async (req, res) => {
  const me = req.user!;
  const o = await myOffer(String(req.params.id), me);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  const r = await bookTransport(o.dealId, o.id, { transporterId: me.id, counter: true });
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  await notify(r.full.dealerId, "Counter accepted", `${me.businessName ?? me.name} accepted ৳${r.price.toLocaleString("en-IN")} for ${r.name} ${code(r.full.code)}. Transport is confirmed: ${r.label}, pickup ${r.when}. Your delivery code is ready.`, "/dealer/purchases");
  res.json({ ok: true });
});

/** Transporter rejects the counter-offer: their original offer stays open for the dealer. */
transportRouter.post("/offers/:id/counter/reject", async (req, res) => {
  const me = req.user!;
  const o = await myOffer(String(req.params.id), me);
  if (!o) return res.status(404).json({ error: "Offer not found." });
  if (o.status !== "PENDING" || o.counterState !== "WAITING") return res.status(409).json({ error: "This counter-offer is no longer open." });
  await prisma.transportOffer.update({ where: { id: o.id }, data: { counterState: "REJECTED" } });
  await notify(o.deal.dealerId, "Counter rejected", `${me.businessName ?? me.name} said no to ৳${o.counterPrice!.toLocaleString("en-IN")} for ${code(o.deal.code)}. Their offer of ৳${o.price.toLocaleString("en-IN")} is still open.`, "/dealer/purchases");
  pingDeal(o.deal, [me.id]);
  res.json({ ok: true });
});

/** My offers and trips (T3). */
transportRouter.get("/trips", async (req, res) => {
  const me = req.user!;
  const deals = await prisma.deal.findMany({ where: { OR: [{ transportOffers: { some: { transporterId: me.id } } }, { handoverById: me.id }] }, include: dealInclude, orderBy: { createdAt: "desc" }, take: 200 });
  const vs = await prisma.vehicle.findMany({ where: { ownerId: me.id } });
  const out = [];
  for (const d of deals) out.push({ ...(await dealView(d, me)), myVehicles: vs.filter((v) => v.status === "APPROVED").map((v) => ({ id: v.id, label: vehicleLabel(v), regNo: v.regNo, facility: v.facility, capacityKg: v.capacityKg })) });
  res.json({ trips: out });
});

const codeBody = z.object({ code: z.string().trim().regex(/^\d{4}$/, "4 digits") });
const MAX_TRIES = 5;

async function driverDeal(dealId: string, me: User) {
  const d = await prisma.deal.findUnique({ where: { id: dealId }, include: dealInclude });
  const accepted = d?.transportOffers.find((o) => o.status === "ACCEPTED");
  return d && accepted && accepted.transporterId === me.id ? { d, accepted } : null;
}

transportRouter.post("/trips/:id/pickup", async (req, res) => {
  const p = codeBody.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter the farmer's 4-digit code." });
  const r = await driverDeal(String(req.params.id), req.user!);
  if (!r) return res.status(404).json({ error: "Trip not found." });
  const { d } = r;
  if (d.status !== "TRANSPORT_CONFIRMED") return res.status(409).json({ error: "This trip is not waiting for pickup." });
  if (d.codeAttempts >= MAX_TRIES) return res.status(429).json({ error: "Too many wrong codes. Ask the farmer to read the code from their FreshNest app; an admin can reset it." });
  if (p.data.code !== d.pickupCode) {
    await prisma.deal.update({ where: { id: d.id }, data: { codeAttempts: { increment: 1 } } });
    return res.status(400).json({ error: `Wrong code. ${MAX_TRIES - d.codeAttempts - 1} tries left.` });
  }
  await prisma.deal.update({ where: { id: d.id }, data: { status: "IN_TRANSIT", pickedUpAt: new Date(), codeAttempts: 0 } });
  const name = productInfo(d.listing).name;
  await notify(d.dealerId, "Picked up", `${name} ${code(d.code)} was picked up and is on the way. Give the driver your delivery code when it arrives.`, "/dealer/purchases");
  await notify(d.farmerId, "Picked up", `${name} ${code(d.code)} was handed over to the driver.`, "/farmer/sales?l=" + d.listingId);
  pingDeal(d);
  res.json({ ok: true });
});

transportRouter.post("/trips/:id/deliver", async (req, res) => {
  const p = codeBody.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter the dealer's 4-digit code." });
  const r = await driverDeal(String(req.params.id), req.user!);
  if (!r) return res.status(404).json({ error: "Trip not found." });
  const { d } = r;
  if (d.status !== "IN_TRANSIT") return res.status(409).json({ error: "This trip is not on the road." });
  if (d.codeAttempts >= MAX_TRIES) return res.status(429).json({ error: "Too many wrong codes. Ask the dealer to read the code from their FreshNest app; an admin can reset it." });
  if (p.data.code !== d.deliveryCode) {
    await prisma.deal.update({ where: { id: d.id }, data: { codeAttempts: { increment: 1 } } });
    return res.status(400).json({ error: `Wrong code. ${MAX_TRIES - d.codeAttempts - 1} tries left.` });
  }
  await prisma.deal.update({ where: { id: d.id }, data: { status: "COMPLETED", deliveredAt: new Date(), codeAttempts: 0 } });
  const name = productInfo(d.listing).name;
  await notify(d.dealerId, "Delivered", `${name} ${code(d.code)} is delivered. Please rate the farmer and the transporter.`, "/dealer/purchases");
  await notify(d.farmerId, "Deal completed", `${name} ${code(d.code)} reached ${d.dealer.businessName ?? d.dealer.name}. Please rate the dealer and the transporter.`, "/farmer/sales?l=" + d.listingId);
  pingDeal(d);
  res.json({ ok: true });
});

/** Transporter gives up a confirmed trip before pickup → the deal reopens for transport. */
transportRouter.post("/trips/:id/cancel", async (req, res) => {
  const p = z.object({ reason: z.string().trim().min(5, "Write a short reason").max(500) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Write a short reason (at least 5 letters).", fields: { reason: ["Required"] } });
  const r = await driverDeal(String(req.params.id), req.user!);
  if (!r) return res.status(404).json({ error: "Trip not found." });
  const { d, accepted } = r;
  if (d.status !== "TRANSPORT_CONFIRMED") return res.status(409).json({ error: d.status === "IN_TRANSIT" ? "The produce is already picked up. If something went wrong on the road, report a delivery failure (coming in Phase 4)." : "This trip cannot be cancelled." });
  const hours = await setting("transportOfferWindowHours", 12);
  await prisma.$transaction([
    prisma.transportOffer.update({ where: { id: accepted.id }, data: { status: "CANCELLED", cancelReason: p.data.reason } }),
    prisma.deal.update({ where: { id: d.id }, data: { status: "AWAITING_TRANSPORT", transportWindowEndsAt: new Date(Date.now() + hours * 3600_000), windowHours: null, windowExtended: false, windowNotified: false, pickupCode: null, deliveryCode: null, codeAttempts: 0 } }),
  ]);
  const who = req.user!.businessName ?? req.user!.name;
  const text = `${who} cancelled the trip for ${code(d.code)}. Reason: ${p.data.reason}. The deal is open for new transport offers for ${hours} hours.`;
  await notify(d.dealerId, "Transport cancelled", text, "/dealer/purchases");
  await notify(d.farmerId, "Transport cancelled", text, "/farmer/sales?l=" + d.listingId);
  pingDeal(d); pingTransport();
  res.json({ ok: true });
});

/** Driver: the vehicle is stuck → Delivery Failure request (an admin approves or rejects). */
transportRouter.post("/trips/:id/failure", failurePhoto, async (req, res) => {
  const file = req.file;
  const drop = () => { if (file) fs.rm(file.path, () => {}); };
  const raw = typeof req.body?.data === "string" ? JSON.parse(req.body.data) : req.body;
  const p = z.object({
    upazilaId: z.coerce.number().int().positive("Choose where the vehicle is"),
    locationNote: z.string().trim().max(200).optional(),
    reason: z.enum(["BREAKDOWN", "ACCIDENT", "ROAD_BLOCKED", "FLOOD", "STRIKE", "OTHER"]),
    details: z.string().trim().max(500).optional(),
    condition: z.enum(["GOOD", "PARTLY_DAMAGED", "BADLY_DAMAGED"]),
    usableKg: z.coerce.number().int().min(1, "At least 1 kg"),
    canMove: z.boolean(),
  }).refine((d) => d.reason !== "OTHER" || (d.details && d.details.length >= 5), { message: "Describe what happened", path: ["details"] }).safeParse(raw);
  if (!p.success) { drop(); return res.status(400).json({ error: "Please check the report.", fields: z.flattenError(p.error).fieldErrors }); }
  const r = await driverDeal(String(req.params.id), req.user!);
  if (!r) { drop(); return res.status(404).json({ error: "Trip not found." }); }
  const { d } = r;
  if (d.status !== "IN_TRANSIT") { drop(); return res.status(409).json({ error: d.status === "FAILURE_REQUESTED" ? "A failure report is already waiting for an admin." : "You can report a failure only while the produce is on the road." }); }
  if (p.data.usableKg > d.quantityKg) { drop(); return res.status(400).json({ error: `Usable quantity cannot be more than ${d.quantityKg} kg.`, fields: { usableKg: [`At most ${d.quantityKg} kg`] } }); }
  if (!file) return res.status(400).json({ error: "Add a photo as proof.", fields: { photo: ["Required"] } });
  const f = await prisma.deliveryFailure.create({ data: { ...p.data, locationNote: p.data.locationNote || null, details: p.data.details || null, dealId: d.id, reportedById: req.user!.id, photo: await keep(file, "failures") }, include: { upazila: { include: { district: true } } } });
  await prisma.deal.update({ where: { id: d.id }, data: { status: "FAILURE_REQUESTED" } });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", OR: [{ isSuperAdmin: true }, { permissions: { has: "DEALS" } }] }, select: { id: true } });
  const name = productInfo(d.listing).name, left = Math.max(0, Math.round((d.listing.harvestDate.getTime() + productInfo(d.listing).shelf * DAY - Date.now()) / 3600_000));
  for (const a of admins) await notify(a.id, "Delivery failure", `${name} ${p.data.usableKg} kg stuck in ${f.upazila.name}, ${f.upazila.district.name}. ${left} h of shelf life left. Please decide quickly.`, "/admin/failures");
  pingDeal(d);
  res.status(201).json({ ok: true });
});
