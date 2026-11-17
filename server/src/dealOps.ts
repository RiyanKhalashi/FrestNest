// Shared deal operations (used by users and by admins).
import { prisma } from "./db.js";
import { notifyMany } from "./notify.js";
import { pingListing, pingMarket, pingTransport, pingUser } from "./realtime.js";
import { code } from "./rules.js";

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
