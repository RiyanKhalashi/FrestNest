// Shared deal operations (used by users and by admins).
import { prisma } from "./db.js";
import { notify, notifyMany } from "./notify.js";
import { pingListing, pingMarket, pingTransport, pingUser } from "./realtime.js";
import { code, newCode, productInfo, vehicleBusy } from "./rules.js";
import { dealInclude, vehicleLabel } from "./views.js";

/**
 * Book one transport offer for a deal: the offer is accepted, the other offers close, the same vehicle's
 * overlapping offers elsewhere are withdrawn, and pickup/delivery codes are made.
 * - by the dealer choosing an offer (`dealerId`), or
 * - by the transporter accepting the dealer's counter-offer (`transporterId` + `counter`): the price becomes the counter.
 * Tells the farmer and the transporters who were not chosen; the caller tells the other side.
 */
export async function bookTransport(dealId: string, offerId: string, by: { dealerId: string } | { transporterId: string; counter: true }) {
  const r = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${dealId} FOR UPDATE`;
    const d = await tx.deal.findUnique({ where: { id: dealId }, include: { transportOffers: { include: { vehicle: true } } } });
    const o = d?.transportOffers.find((x) => x.id === offerId);
    if (!d || !o || ("dealerId" in by ? d.dealerId !== by.dealerId : o.transporterId !== by.transporterId)) return { ok: false as const, status: 404, error: "Deal not found." };
    if (d.status !== "AWAITING_TRANSPORT") return { ok: false as const, status: 409, error: "Transport is already arranged for this deal." };
    if (o.status !== "PENDING") return { ok: false as const, status: 409, error: "This offer is no longer available." };
    const counter = "counter" in by;
    if (counter && (o.counterState !== "WAITING" || !o.counterExpiresAt || o.counterExpiresAt <= new Date())) return { ok: false as const, status: 409, error: "This counter-offer is no longer open." };
    const busy = await vehicleBusy(o.vehicleId, o.pickupAt, o.deliverBy);
    if (busy) return { ok: false as const, status: 409, error: counter ? `${o.vehicle.regNo} is already booked for ${busy} at this time, so you cannot accept.` : `That vehicle was just booked for ${busy}. Choose another offer.` };
    await tx.transportOffer.update({ where: { id: o.id }, data: counter
      ? { status: "ACCEPTED", price: o.counterPrice!, originalPrice: o.price, counterState: "ACCEPTED" }
      : { status: "ACCEPTED", ...(o.counterState === "WAITING" ? { counterState: "CLOSED" as const } : {}) } });
    const others = d.transportOffers.filter((x) => x.id !== o.id && x.status === "PENDING");
    await tx.transportOffer.updateMany({ where: { id: { in: others.map((x) => x.id) } }, data: { status: "NOT_CHOSEN" } });
    // the same vehicle cannot be offered elsewhere at an overlapping time
    const clashes = await tx.transportOffer.findMany({ where: { vehicleId: o.vehicleId, status: "PENDING", pickupAt: { lt: o.deliverBy }, deliverBy: { gt: o.pickupAt } }, select: { id: true, dealId: true } });
    await tx.transportOffer.updateMany({ where: { id: { in: clashes.map((c) => c.id) } }, data: { status: "WITHDRAWN" } });
    await tx.transportOffer.updateMany({ where: { id: { in: [...others, ...clashes].map((x) => x.id) }, counterState: "WAITING" }, data: { counterState: "CLOSED" } });
    let pickup = newCode(), delivery = newCode();
    while (delivery === pickup) delivery = newCode();
    await tx.deal.update({ where: { id: dealId }, data: { status: "TRANSPORT_CONFIRMED", pickupCode: pickup, deliveryCode: delivery, codeAttempts: 0 } });
    return { ok: true as const, o, others, clashes, price: counter ? o.counterPrice! : o.price };
  });
  if (!r.ok) return r;
  const full = await prisma.deal.findUniqueOrThrow({ where: { id: dealId }, include: dealInclude });
  const name = productInfo(full.listing).name;
  const when = r.o.pickupAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka" });
  await notify(full.farmerId, "Transport confirmed", `${name} ${code(full.code)}: pickup ${when}. Give the driver your pickup code only when the produce is loaded.`, "/farmer/sales?l=" + full.listingId);
  await notifyMany(r.others.map((x) => x.transporterId), "Offer not chosen", `The dealer chose another transport offer for ${code(full.code)}.`, "/transporter/trips");
  if (r.clashes.length) await notify(r.o.transporterId, "Offers withdrawn", `${r.clashes.length} other offer(s) with ${r.o.vehicle.regNo} at overlapping times were withdrawn, because the vehicle is now booked.`, "/transporter/trips");
  for (const id of new Set([full.farmerId, full.dealerId, r.o.transporterId, ...r.others.map((x) => x.transporterId)])) pingUser(id, "deal");
  pingTransport();
  return { ...r, full, name, when, label: `${vehicleLabel(r.o.vehicle)} (${r.o.vehicle.regNo})` };
}

/**
 * Cancel a Primary Deal and put the produce back on sale:
 * own-price listing → the quantity returns; bidding lot → "no sale" so the farmer can relist.
 * Pending transport offers close; a confirmed transport (admin-approved cancel) is released too.
 */
export async function cancelDeal(dealId: string, byRole: string, reason: string) {
  const d = await prisma.deal.findUniqueOrThrow({ where: { id: dealId }, include: { transportOffers: { where: { status: { in: ["PENDING", "ACCEPTED"] } } } } });
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${d.listingId} FOR UPDATE`;
    await tx.deal.update({ where: { id: d.id }, data: { status: "CANCELLED", cancelledBy: byRole, cancelReason: reason, cancelledAt: new Date(), pickupCode: null, deliveryCode: null } });
    await tx.transportOffer.updateMany({ where: { dealId: d.id, counterState: "WAITING" }, data: { counterState: "CLOSED" } });
    await tx.transportOffer.updateMany({ where: { dealId: d.id, status: { in: ["PENDING", "ACCEPTED"] } }, data: { status: "CANCELLED" } });
    const l = await tx.listing.findUniqueOrThrow({ where: { id: d.listingId } });
    if (l.mode === "OWN") await tx.listing.update({ where: { id: l.id }, data: { remainingKg: l.remainingKg + d.quantityKg, ...(l.status === "SOLD" ? { status: "OPEN", closedAt: null } : {}) } });
    else await tx.listing.update({ where: { id: l.id }, data: { status: "NO_SALE", remainingKg: l.quantityKg, relisted: false } });
  });
  const transporters = d.transportOffers.map((o) => o.transporterId);
  await notifyMany(transporters, "Deal cancelled", `Deal ${code(d.code)} was cancelled, so your transport ${d.transportOffers.some((o) => o.status === "ACCEPTED") ? "booking" : "offer"} is closed.`, "/transporter/trips");
  for (const id of new Set([d.farmerId, d.dealerId, ...transporters])) pingUser(id, "deal");
  pingListing(d.listingId); pingMarket(); pingTransport();
  return d;
}
