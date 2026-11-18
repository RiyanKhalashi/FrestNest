// Emergency sale after an approved delivery failure (agreed 2026-11-09, tiers agreed 2026-11-17).
import { prisma } from "./db.js";
import { productInfo, newCode, code, DAY } from "./rules.js";
import { notify, notifyMany } from "./notify.js";
import { pingListing, pingMarket, pingTransport, pingUser } from "./realtime.js";
import type { Prisma, Scope } from "./generated/prisma/client.js";

const H = 3600_000;
export const TIER_LABEL = ["", "Dealers in the stuck upazila", "All dealers in the district", "District + neighbouring districts"];

/** Suggested duration + price drop from the remaining shelf life; the farmer can override both. */
export function suggest(shelfLeftMs: number, originalPrice: number) {
  const days = shelfLeftMs / DAY;
  const [hours, drop] = days <= 1 ? [1, 35] : days <= 2 ? [3, 25] : days <= 4 ? [6, 15] : [12, 10];
  const start = Math.round(originalPrice * (1 - drop / 100) * 2) / 2;
  const buyNow = Math.round(originalPrice * 0.92 * 2) / 2;
  return { hours, drop, start, buyNow: buyNow > start ? buyNow : null, shelfLeftHours: Math.max(0, Math.round(shelfLeftMs / H)) };
}

export const failureInclude = {
  deal: { include: { listing: { include: { product: true, upazila: { include: { district: true } } } }, farmer: { select: { id: true, name: true, phone: true } }, dealer: { select: { id: true, name: true, businessName: true, phone: true } }, transportOffers: { where: { status: "ACCEPTED" }, include: { vehicle: true, transporter: { select: { id: true, name: true, businessName: true, phone: true } } } } } },
  upazila: { include: { district: true } },
  reportedBy: { select: { id: true, name: true, businessName: true, phone: true } },
  emergency: { select: { id: true, code: true, status: true, tier: true, bidEndsAt: true } },
} satisfies Prisma.DeliveryFailureInclude;
export type FullFailure = Prisma.DeliveryFailureGetPayload<{ include: typeof failureInclude }>;

export function shelfLeftMs(f: FullFailure) {
  const l = f.deal.listing;
  return l.harvestDate.getTime() + productInfo(l).shelf * DAY - Date.now();
}

/** Visibility for each tier. Pickup point = the stuck vehicle's upazila. */
async function tierData(tier: number, upazilaId: number): Promise<{ scope: Scope; targetDistricts: { set: { id: number }[] } }> {
  if (tier <= 1) return { scope: "UPAZILA", targetDistricts: { set: [] } };
  if (tier === 2) return { scope: "DISTRICT", targetDistricts: { set: [] } };
  const u = await prisma.upazila.findUniqueOrThrow({ where: { id: upazilaId }, include: { district: { include: { neighbours: { select: { id: true } } } } } });
  return { scope: "DISTRICT", targetDistricts: { set: u.district.neighbours.map((n) => ({ id: n.id })) } };
}

/** Tell the dealers who can newly see the emergency sale. */
async function notifyTier(listingId: string) {
  const l = await prisma.listing.findUniqueOrThrow({ where: { id: listingId }, include: { product: true, upazila: { include: { district: true } }, targetDistricts: true } });
  const where: Prisma.UserWhereInput = l.tier === 1 ? { upazilaId: l.upazilaId } : l.tier === 2 ? { districtId: l.upazila.districtId } : { districtId: { in: l.targetDistricts.map((d) => d.id) } };
  const dealers = await prisma.user.findMany({ where: { ...where, role: "DEALER", status: "ACTIVE" }, select: { id: true } });
  const name = productInfo(l).name;
  await notifyMany(dealers.map((d) => d.id), "Emergency sale near you", `${l.quantityKg} kg of ${name} at a stuck vehicle in ${l.upazila.name}, ${l.upazila.district.name}. Starting ৳${Number(l.pricePerKg).toFixed(2)}/kg. Bidding ends soon.`, "/dealer/market?l=" + l.id);
  return dealers.length;
}

/** Start the emergency sale (by the farmer, or automatically if the farmer chose "auto"). */
export async function startEmergency(failureId: string, o: { hours: number; drop: number; buyNow?: number | null }, by: "farmer" | "auto") {
  const f = await prisma.deliveryFailure.findUniqueOrThrow({ where: { id: failureId }, include: failureInclude });
  if (f.status !== "APPROVED") throw new Error("not approved");
  if (f.emergency) return f.emergency.id;
  const l = f.deal.listing;
  const original = Number(f.deal.pricePerKg);
  const start = Math.round(original * (1 - o.drop / 100) * 100) / 100;
  const t = await tierData(1, f.upazilaId);
  const em = await prisma.listing.create({
    data: {
      farmerId: f.deal.farmerId, productId: l.productId, customName: l.customName, customShelfLife: l.customShelfLife, customStorage: l.customStorage, vehicleNeed: l.vehicleNeed, category: l.category,
      quantityKg: f.usableKg, remainingKg: f.usableKg, pricePerKg: start, harvestDate: l.harvestDate,
      description: `Emergency sale: the vehicle carrying deal ${code(f.deal.code)} is stuck${f.locationNote ? " at " + f.locationNote : ""}. ${f.canMove ? "The same vehicle can still deliver nearby." : "A local transporter collects from the vehicle."}`,
      photos: l.photos, upazilaId: f.upazilaId, scope: t.scope, mode: "BID",
      bidEndsAt: new Date(Date.now() + o.hours * H), minIncrement: 0.5, buyNowPrice: o.buyNow && o.buyNow > start ? o.buyNow : null,
      isEmergency: true, failureId: f.id, tier: 1, tierChangedAt: new Date(),
    },
  });
  const n = await notifyTier(em.id);
  const name = productInfo(l).name;
  await notify(f.deal.farmerId, by === "auto" ? "Emergency sale started automatically" : "Emergency sale is live", `${f.usableKg} kg of ${name} from ${f.upazila.name}: starting ৳${start.toFixed(2)}/kg, ${o.hours} h. ${n} dealer(s) near the vehicle were told first; it widens after 1 hour without bids.`, "/farmer/sales?l=" + em.id);
  pingMarket(); pingUser(f.deal.farmerId, "deal");
  return em.id;
}

/** Widen to the next tier (automatically after 1 h without bids, or when the farmer asks). */
export async function widen(listingId: string) {
  const l = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
  if (!l.isEmergency || l.status !== "OPEN" || (l.tier ?? 1) >= 3) return false;
  const tier = (l.tier ?? 1) + 1;
  const t = await tierData(tier, l.upazilaId);
  await prisma.listing.update({ where: { id: l.id }, data: { tier, tierChangedAt: new Date(), scope: t.scope, targetDistricts: t.targetDistricts } });
  await notifyTier(l.id);
  await notify(l.farmerId, "Emergency sale widened", `${code(l.code)} is now visible to: ${TIER_LABEL[tier].toLowerCase()}.`, "/farmer/sales?l=" + l.id);
  pingListing(l.id); pingMarket();
  return true;
}

/**
 * After an emergency sale is won (option c, agreed): if the vehicle can still move, the same vehicle
 * delivers to the new dealer (deal starts "on the road" with a new delivery code); otherwise a new
 * transport stage opens at the stuck location and the original driver hands over with a pickup code.
 */
export async function setupEmergencyDelivery(tx: Prisma.TransactionClient, dealId: string, listingId: string) {
  const l = await tx.listing.findUniqueOrThrow({ where: { id: listingId }, include: { failure: { include: { deal: { include: { transportOffers: { where: { status: "ACCEPTED" } } } } } } } });
  const f = l.failure;
  if (!l.isEmergency || !f) return null;
  const old = f.deal.transportOffers[0];
  let pickup = newCode(), delivery = newCode();
  while (delivery === pickup) delivery = newCode();
  if (f.canMove && old) {
    await tx.transportOffer.create({ data: { dealId, transporterId: old.transporterId, vehicleId: old.vehicleId, price: 0, pickupAt: new Date(), deliverBy: new Date(Date.now() + 6 * H), note: "Continues the original trip from the stuck location.", status: "ACCEPTED" } });
    await tx.deal.update({ where: { id: dealId }, data: { status: "IN_TRANSIT", pickedUpAt: new Date(), deliveryCode: delivery, handoverById: old.transporterId } });
    return { sameVehicle: true, transporterId: old.transporterId };
  }
  await tx.deal.update({ where: { id: dealId }, data: { pickupCode: pickup, deliveryCode: delivery, handoverById: old?.transporterId ?? null } });
  return { sameVehicle: false, transporterId: old?.transporterId ?? null };
}

/** Notifications after an emergency deal is created. */
export async function afterEmergencyDeal(dealId: string, setup: { sameVehicle: boolean; transporterId: string | null } | null) {
  if (!setup) return;
  const d = await prisma.deal.findUniqueOrThrow({ where: { id: dealId }, include: { listing: { include: { product: true, upazila: true } }, dealer: true } });
  const name = productInfo(d.listing).name;
  if (setup.sameVehicle && setup.transporterId) {
    await notify(setup.transporterId, "Deliver to the new buyer", `Emergency sale ${code(d.code)}: take the ${name} from ${d.listing.upazila.name} to ${d.dealer.businessName ?? d.dealer.name}. Enter their delivery code on arrival.`, "/transporter/trips");
    await notify(d.dealerId, "On the way to you", `The same vehicle brings the ${name} (${code(d.code)}). Give the driver your delivery code after checking it.`, "/dealer/purchases");
  } else {
    if (setup.transporterId) await notify(setup.transporterId, "Hand over the produce", `Emergency sale ${code(d.code)}: a local transporter will collect the ${name} from your vehicle in ${d.listing.upazila.name}. Give them the pickup code shown in My trips.`, "/transporter/trips");
    await notify(d.dealerId, "Choose local transport", `Emergency sale ${code(d.code)}: the vehicle cannot move. Local transporters will send offers to collect from ${d.listing.upazila.name}.`, "/dealer/purchases");
    pingTransport();
  }
}
