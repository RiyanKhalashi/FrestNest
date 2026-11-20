// Shapes a listing for the person looking at it (farmer sees real bidder names; dealers see "Dealer #n").
import type { Prisma, User } from "./generated/prisma/client.js";
import { productInfo, money, code, DAY } from "./rules.js";

export const listingInclude = {
  product: true,
  upazila: { include: { district: true } },
  farmer: { select: { id: true, name: true, upazila: { select: { name: true } }, district: { select: { name: true } } } },
  targetDistricts: { select: { id: true, name: true } },
  targetUpazilas: { select: { id: true, name: true } },
  bids: { orderBy: [{ pricePerKg: "desc" }, { createdAt: "asc" }], include: { dealer: { select: { id: true, name: true, businessName: true, upazila: { select: { name: true } }, district: { select: { name: true } } } } } },
  offers: { orderBy: { createdAt: "desc" }, include: { dealer: { select: { id: true, name: true, businessName: true, district: { select: { name: true } }, upazila: { select: { name: true } } } } } },
  deals: { include: { dealer: { select: { id: true, name: true, businessName: true } } }, orderBy: { createdAt: "desc" } },
  failure: { select: { locationNote: true, canMove: true, deal: { select: { code: true } } } },
} satisfies Prisma.ListingInclude;

export type FullListing = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

export function listingView(l: FullListing, viewer: User, near?: [number, string]) {
  const info = productInfo(l, l.scope);
  const now = Date.now();
  const harvested = l.harvestDate.getTime() <= now;
  const expiresAt = new Date(l.harvestDate.getTime() + info.shelf * DAY);
  const daysLeft = harvested ? Math.max(0, Math.ceil((expiresAt.getTime() - now) / DAY)) : null;
  const isFarmer = viewer.id === l.farmerId;

  // anonymous labels in order of each dealer's first bid
  const order: string[] = [];
  [...l.bids].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).forEach((b) => { if (!order.includes(b.dealerId)) order.push(b.dealerId); });
  const label = (dealerId: string) => "Dealer #" + (order.indexOf(dealerId) + 1);
  const top = l.bids[0];
  const topPrice = money(top?.pricePerKg);
  const inc = money(l.minIncrement) ?? 0.5;
  const buyNow = money(l.buyNowPrice);

  const bids = l.bids.map((b) => ({
    id: b.id,
    pricePerKg: money(b.pricePerKg),
    total: Math.round(Number(b.pricePerKg) * l.quantityKg),
    at: b.createdAt,
    who: isFarmer ? (b.dealer.businessName ?? b.dealer.name) + " · " + (b.dealer.district?.name ?? "") : label(b.dealerId) + (b.dealerId === viewer.id ? " (you)" : ""),
    mine: b.dealerId === viewer.id,
  }));

  const offers = l.offers
    .filter((o) => isFarmer || o.dealerId === viewer.id)
    .map((o) => ({
      id: o.id, status: o.status, quantityKg: o.quantityKg, pricePerKg: money(o.pricePerKg), total: Math.round(Number(o.pricePerKg) * o.quantityKg),
      counterQtyKg: o.counterQtyKg, counterPrice: money(o.counterPrice), expiresAt: o.expiresAt, note: o.note, at: o.createdAt,
      dealer: { name: o.dealer.businessName ?? o.dealer.name, place: [o.dealer.upazila?.name, o.dealer.district?.name].filter(Boolean).join(", ") },
      mine: o.dealerId === viewer.id,
    }));

  const deals = l.deals.filter((d) => isFarmer || d.dealerId === viewer.id).map((d) => ({
    id: d.id, code: code(d.code), status: d.status, source: d.source, quantityKg: d.quantityKg, pricePerKg: money(d.pricePerKg),
    total: Math.round(Number(d.pricePerKg) * d.quantityKg), dealer: d.dealer.businessName ?? d.dealer.name, at: d.createdAt,
  }));

  const locked = l.bids.length > 0 || l.offers.length > 0;
  const myBid = l.bids.find((b) => b.dealerId === viewer.id);

  return {
    id: l.id, code: code(l.code), status: l.status, mode: l.mode, scope: l.scope,
    product: { id: l.productId, name: info.name, nameBn: info.nameBn, shelfLifeDays: info.shelf, storage: info.storage, suggested: info.suggested, farmerSet: info.farmerSet, longTrip: info.longTrip, vehicleNeed: l.vehicleNeed, custom: info.custom, category: l.category },
    quantityKg: l.quantityKg, remainingKg: l.remainingKg, pricePerKg: money(l.pricePerKg),
    harvestDate: l.harvestDate, harvested, expiresAt, daysLeft, urgent: daysLeft !== null && daysLeft <= Math.max(1, Math.ceil(info.shelf * 0.4)),
    description: l.description, photos: l.photos,
    place: { upazila: l.upazila.name, upazilaId: l.upazilaId, district: l.upazila.district.name, districtId: l.upazila.districtId },
    targets: { districts: l.targetDistricts, upazilas: l.targetUpazilas },
    farmer: { id: l.farmer.id, name: l.farmer.name },
    near: near ? { rank: near[0], label: near[1] } : null,
    bidding: l.mode === "BID" ? {
      endsAt: l.bidEndsAt, minIncrement: inc, buyNowPrice: buyNow,
      buyNowAvailable: !!buyNow && (topPrice ?? 0) < buyNow && l.status === "OPEN",
      top: topPrice, count: l.bids.length, bidders: order.length,
      nextMin: topPrice !== null ? Math.round((topPrice + inc) * 100) / 100 : money(l.pricePerKg),
      leading: !!top && top.dealerId === viewer.id, myBest: money(myBid?.pricePerKg), relisted: l.relisted,
    } : null,
    own: l.mode === "OWN" ? { minOrderKg: l.minOrderKg, minResponseHours: l.minResponseHours } : null,
    bids, offers, deals,
    emergency: l.isEmergency ? { tier: l.tier ?? 1, tierLabel: ["", "Dealers in the stuck upazila", "All dealers in the district", "District + neighbouring districts"][l.tier ?? 1], locationNote: l.failure?.locationNote ?? null, canMove: l.failure?.canMove ?? false, originalDeal: l.failure ? code(l.failure.deal.code) : null } : null,
    canEdit: isFarmer && l.status === "OPEN" && !locked && !l.isEmergency,
    canRelist: isFarmer && l.status === "NO_SALE" && !l.relisted,
    createdAt: l.createdAt, closedAt: l.closedAt,
  };
}

// ---------------------------------------------------------------- deals (Phase 3)
import { prisma } from "./db.js";
import { tripNeed, seasonTag, windowOptions, setting } from "./rules.js";

export const dealInclude = {
  listing: { include: { product: true, upazila: { include: { district: true } }, failure: { select: { locationNote: true, canMove: true, deal: { select: { code: true } } } } } },
  farmer: { select: { id: true, name: true, phone: true, village: true } },
  failures: { orderBy: { createdAt: "desc" }, take: 1, include: { upazila: { include: { district: true } }, emergency: { select: { id: true, code: true, status: true, tier: true, bidEndsAt: true } } } },
  dealer: { select: { id: true, name: true, businessName: true, phone: true, districtId: true, upazila: { select: { name: true } }, district: { select: { name: true } } } },
  transportOffers: { orderBy: { price: "asc" }, include: { vehicle: true, transporter: { select: { id: true, name: true, businessName: true, phone: true, upazila: { select: { name: true } } } } } },
  cancelRequests: { orderBy: { createdAt: "desc" } },
  reviews: true,
} satisfies Prisma.DealInclude;
export type FullDeal = Prisma.DealGetPayload<{ include: typeof dealInclude }>;

/** Average rating per user (visible reviews only). */
export async function ratings(userIds: string[]) {
  if (!userIds.length) return new Map<string, { avg: number; count: number }>();
  const rows = await prisma.review.groupBy({ by: ["toId"], where: { toId: { in: userIds }, hidden: false }, _avg: { stars: true }, _count: true });
  return new Map(rows.map((r) => [r.toId, { avg: Math.round((r._avg.stars ?? 0) * 10) / 10, count: r._count }]));
}

const VEHICLE_LABEL: Record<string, string> = { PICKUP: "Pickup", MINI_TRUCK: "Mini truck", TRUCK: "Truck", COVERED_VAN: "Covered van" };
export const vehicleLabel = (v: { type: string; capacityKg: number }) => `${VEHICLE_LABEL[v.type]} ${v.capacityKg >= 1000 ? v.capacityKg / 1000 + " t" : v.capacityKg + " kg"}`;

/** Approved delivery failures in the last 90 days (shown next to transporter ratings). */
export async function failureCounts(userIds: string[]) {
  if (!userIds.length) return new Map<string, number>();
  const rows = await prisma.deliveryFailure.groupBy({ by: ["reportedById"], where: { reportedById: { in: userIds }, status: "APPROVED", createdAt: { gte: new Date(Date.now() - 90 * 86400_000) } }, _count: true });
  return new Map(rows.map((r) => [r.reportedById, r._count]));
}

export async function dealView(d: FullDeal, viewer: User) {
  const role = viewer.role;
  const isFarmer = viewer.id === d.farmerId, isDealer = viewer.id === d.dealerId;
  const { need, farmerSet: needByFarmer, long } = await tripNeed(d);
  const accepted = d.transportOffers.find((o) => o.status === "ACCEPTED");
  const isDriver = !!accepted && accepted.transporterId === viewer.id;
  const rate = await ratings(d.transportOffers.map((o) => o.transporterId));
  const fails = await failureCounts(d.transportOffers.map((o) => o.transporterId));
  const now = Date.now();
  const win = isDealer && d.status === "AWAITING_TRANSPORT" && !d.windowExtended && d.transportOffers.length === 0 && d.transportWindowEndsAt.getTime() > now
    ? await windowOptions(d.listing, long) : null;
  const booked = ["TRANSPORT_CONFIRMED", "IN_TRANSIT", "COMPLETED"].includes(d.status);
  const offerView = (o: FullDeal["transportOffers"][number]) => ({
    id: o.id, status: o.status, price: o.price, pickupAt: o.pickupAt, deliverBy: o.deliverBy, note: o.note, at: o.createdAt, cancelReason: o.cancelReason,
    transporter: { id: o.transporterId, name: o.transporter.businessName ?? o.transporter.name, base: o.transporter.upazila?.name ?? null, rating: rate.get(o.transporterId) ?? null, failures: fails.get(o.transporterId) ?? 0, phone: booked && o.status === "ACCEPTED" && (isFarmer || isDealer) ? o.transporter.phone : null },
    vehicle: { id: o.vehicleId, label: vehicleLabel(o.vehicle), regNo: o.vehicle.regNo, facility: o.vehicle.facility, capacityKg: o.vehicle.capacityKg },
    season: seasonTag(o.vehicle.facility, o.pickupAt), mine: o.transporterId === viewer.id,
    originalPrice: o.originalPrice,
    counter: o.counterState ? { price: o.counterPrice!, note: o.counterNote, state: o.counterState, at: o.counterAt, expiresAt: o.counterExpiresAt } : null,
  });
  const visibleOffers = role === "TRANSPORTER" ? d.transportOffers.filter((o) => o.transporterId === viewer.id) : d.transportOffers.filter((o) => o.status !== "WITHDRAWN");
  const pendingCancel = d.cancelRequests.find((c) => c.status === "PENDING");
  const reviewTargets: { role: "FARMER" | "DEALER" | "TRANSPORTER"; id: string; name: string }[] = [];
  if (d.status === "COMPLETED") {
    if (isFarmer) reviewTargets.push({ role: "DEALER", id: d.dealerId, name: d.dealer.businessName ?? d.dealer.name });
    if (isDealer) reviewTargets.push({ role: "FARMER", id: d.farmerId, name: d.farmer.name });
    if ((isFarmer || isDealer) && accepted) reviewTargets.push({ role: "TRANSPORTER", id: accepted.transporterId, name: accepted.transporter.businessName ?? accepted.transporter.name });
  }
  const info = productInfo(d.listing, long ? "NATION" : "DISTRICT");
  return {
    id: d.id, code: code(d.code), status: d.status, source: d.source,
    quantityKg: d.quantityKg, pricePerKg: money(d.pricePerKg), total: Math.round(Number(d.pricePerKg) * d.quantityKg),
    at: d.createdAt, cancelReason: d.cancelReason, cancelledBy: d.cancelledBy, cancelledAt: d.cancelledAt,
    listing: { id: d.listingId, code: code(d.listing.code), product: info.name, storage: need, harvestDate: d.listing.harvestDate, place: d.listing.upazila.name + ", " + d.listing.upazila.district.name, shelfLifeDays: info.shelf },
    route: {
      from: { upazila: d.listing.upazila.name, district: d.listing.upazila.district.name, village: booked && (isDriver || isDealer || isFarmer) ? d.farmer.village : null },
      to: { name: d.dealer.businessName ?? d.dealer.name, upazila: d.dealer.upazila?.name ?? null, district: d.dealer.district?.name ?? null },
      long,
    },
    need, needByFarmer,
    farmer: { id: d.farmerId, name: d.farmer.name, phone: d.status === "CANCELLED" || role === "TRANSPORTER" && !isDriver ? null : d.farmer.phone },
    dealer: { id: d.dealerId, name: d.dealer.businessName ?? d.dealer.name, district: d.dealer.district?.name, phone: d.status === "CANCELLED" || role === "TRANSPORTER" && !isDriver ? null : d.dealer.phone },
    transport: {
      windowEndsAt: d.transportWindowEndsAt, windowExtended: d.windowExtended,
      windowOpen: d.status === "AWAITING_TRANSPORT" && d.transportWindowEndsAt.getTime() > now,
      canExtend: isDealer && d.status === "AWAITING_TRANSPORT" && !d.windowExtended && d.transportWindowEndsAt.getTime() <= now,
      windowHours: d.windowHours, defaultHours: win?.def ?? await setting("transportOfferWindowHours", 12),
      // the dealer can pick the window length until the first offer arrives
      canSetWindow: !!win, windowOptions: win?.options ?? [],
      counterHours: await setting("transportCounterHours", 2),
      offers: visibleOffers.map(offerView),
      confirmed: accepted ? offerView(accepted) : null,
    },
    pickupCode: (isFarmer || viewer.id === d.handoverById) && d.status === "TRANSPORT_CONFIRMED" ? d.pickupCode : null,
    handover: viewer.id === d.handoverById && !isDriver,
    emergencyFrom: d.listing.isEmergency ? { note: d.listing.failure?.locationNote ?? null, sameVehicle: d.listing.failure?.canMove ?? false, originalDeal: d.listing.failure ? code(d.listing.failure.deal.code) : null } : null,
    emergencyAuto: d.emergencyAuto,
    failure: d.failures[0] ? (() => { const f = d.failures[0]; return {
      id: f.id, status: f.status, at: f.createdAt, where: f.upazila.name + ", " + f.upazila.district.name, note: f.locationNote, reason: f.reason, condition: f.condition, usableKg: f.usableKg, canMove: f.canMove, decisionNote: f.decisionNote,
      emergency: f.emergency ? { id: f.emergency.id, code: code(f.emergency.code), status: f.emergency.status, tier: f.emergency.tier, endsAt: f.emergency.bidEndsAt } : null,
    }; })() : null,
    deliveryCode: isDealer && (d.status === "TRANSPORT_CONFIRMED" || d.status === "IN_TRANSIT") ? d.deliveryCode : null,
    pickedUpAt: d.pickedUpAt, deliveredAt: d.deliveredAt,
    cancelRequest: pendingCancel ? { by: pendingCancel.byRole, reason: pendingCancel.reason, at: pendingCancel.createdAt, mine: pendingCancel.byId === viewer.id } : null,
    lastCancelDecision: d.cancelRequests.find((c) => c.status !== "PENDING") ? { status: d.cancelRequests.find((c) => c.status !== "PENDING")!.status, note: d.cancelRequests.find((c) => c.status !== "PENDING")!.decisionNote } : null,
    reviews: {
      given: d.reviews.filter((r) => r.fromId === viewer.id).map((r) => ({ toId: r.toId, stars: r.stars, comment: r.comment })),
      targets: reviewTargets.filter((t) => !d.reviews.some((r) => r.fromId === viewer.id && r.toId === t.id)),
    },
  };
}
