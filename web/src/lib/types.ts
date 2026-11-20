// Shapes returned by the API (see server/src/views.ts)
export type Scope = "UPAZILA" | "DISTRICT" | "NATION";
export type Storage = "NORMAL" | "VENTILATED" | "REFRIGERATED";
export type ListingStatus = "OPEN" | "SOLD" | "NO_SALE" | "WITHDRAWN" | "EXPIRED";
export type OfferStatus = "PENDING" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "EXPIRED" | "CANCELLED";

export interface Product { id: number; nameEn: string; nameBn: string; category: string; shelfLifeDays: number; storage: Storage; ventilatedForLongTrips: boolean }

export interface Listing {
  id: string; code: string; status: ListingStatus; mode: "BID" | "OWN"; scope: Scope;
  product: { id: number | null; name: string; nameBn: string | null; shelfLifeDays: number; storage: Storage; suggested: Storage; farmerSet: boolean; longTrip: Storage; vehicleNeed: Storage | null; custom: boolean; category: string };
  quantityKg: number; remainingKg: number; pricePerKg: number;
  harvestDate: string; harvested: boolean; expiresAt: string; daysLeft: number | null; urgent: boolean;
  description: string | null; photos: string[];
  place: { upazila: string; upazilaId: number; district: string; districtId: number };
  targets: { districts: { id: number; name: string }[]; upazilas: { id: number; name: string }[] };
  farmer: { id: string; name: string };
  near: { rank: number; label: string } | null;
  bidding: null | { endsAt: string; minIncrement: number; buyNowPrice: number | null; buyNowAvailable: boolean; top: number | null; count: number; bidders: number; nextMin: number; leading: boolean; myBest: number | null; relisted: boolean };
  own: null | { minOrderKg: number | null; minResponseHours: number | null };
  bids: { id: string; pricePerKg: number; total: number; at: string; who: string; mine: boolean }[];
  offers: Offer[];
  deals: { id: string; code: string; status: string; source: string; quantityKg: number; pricePerKg: number; total: number; dealer: string; at: string }[];
  emergency: null | { tier: number; tierLabel: string; locationNote: string | null; canMove: boolean; originalDeal: string | null };
  canEdit: boolean; canRelist: boolean; createdAt: string; closedAt: string | null;
}

export interface Offer {
  id: string; status: OfferStatus; quantityKg: number; pricePerKg: number; total: number;
  counterQtyKg: number | null; counterPrice: number | null; expiresAt: string; note: string | null; at: string;
  dealer: { name: string; place: string }; mine: boolean;
}

export type DealStatus = "AWAITING_TRANSPORT" | "TRANSPORT_CONFIRMED" | "IN_TRANSIT" | "COMPLETED" | "FAILURE_REQUESTED" | "FAILED" | "CANCELLED";
export interface TransportOffer {
  id: string; status: "PENDING" | "ACCEPTED" | "NOT_CHOSEN" | "WITHDRAWN" | "CANCELLED"; price: number; pickupAt: string; deliverBy: string; note: string | null; at: string; cancelReason: string | null;
  transporter: { id: string; name: string; base: string | null; rating: { avg: number; count: number } | null; failures: number; phone: string | null };
  vehicle: { id: string; label: string; regNo: string; facility: Storage; capacityKg: number };
  season: { tag: "COST_SAVING" | "WEATHER_RISK" | null; text: string | null }; mine: boolean;
  originalPrice: number | null; // the transporter's price before an accepted counter-offer
  counter: { price: number; note: string | null; state: "WAITING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CLOSED"; at: string; expiresAt: string } | null;
}
export interface Deal {
  id: string; code: string; status: DealStatus; source: "BID" | "BUY_NOW" | "OFFER" | "EMERGENCY";
  handover: boolean; emergencyAuto: boolean;
  emergencyFrom: { note: string | null; sameVehicle: boolean; originalDeal: string | null } | null;
  failure: null | { id: string; status: "PENDING" | "APPROVED" | "REJECTED"; at: string; where: string; note: string | null; reason: string; condition: string; usableKg: number; canMove: boolean; decisionNote: string | null; emergency: { id: string; code: string; status: string; tier: number | null; endsAt: string | null } | null };
  quantityKg: number; pricePerKg: number; total: number; at: string;
  cancelReason: string | null; cancelledBy: string | null; cancelledAt: string | null;
  listing: { id: string; code: string; product: string; storage: Storage; harvestDate: string; place: string; shelfLifeDays: number };
  route: { from: { upazila: string; district: string; village: string | null }; to: { name: string; upazila: string | null; district: string | null }; long: boolean };
  need: Storage; needByFarmer: boolean;
  farmer: { id: string; name: string; phone: string | null };
  dealer: { id: string; name: string; district?: string; phone: string | null };
  transport: { windowEndsAt: string; windowExtended: boolean; windowOpen: boolean; canExtend: boolean; windowHours: number | null; defaultHours: number; canSetWindow: boolean; windowOptions: { hours: number; ok: boolean }[]; counterHours: number; offers: TransportOffer[]; confirmed: TransportOffer | null };
  pickupCode: string | null; deliveryCode: string | null; pickedUpAt: string | null; deliveredAt: string | null;
  cancelRequest: { by: string; reason: string; at: string; mine: boolean } | null;
  lastCancelDecision: { status: string; note: string | null } | null;
  reviews: { given: { toId: string; stars: number; comment: string }[]; targets: { role: "FARMER" | "DEALER" | "TRANSPORTER"; id: string; name: string }[] };
}
export interface Trip extends Deal { fittingVehicles?: string[]; myVehicles?: { id: string; label: string; regNo: string; facility: Storage; capacityKg: number }[]; small?: boolean }
export interface Vehicle { id: string; type: string; label: string; regNo: string; capacityKg: number; facility: Storage; status: "PENDING" | "APPROVED" | "REJECTED"; statusNote: string | null; active: boolean; docPhoto: string | null; bookings: { deal: string; status: string; pickupAt: string; deliverBy: string }[]; tripsDone: number }

export const STATUS_TAG: Record<ListingStatus, [string, string]> = {
  OPEN: ["green", "Open"], SOLD: ["blue", "Sold"], NO_SALE: ["gold", "No bids"], WITHDRAWN: ["plain", "Withdrawn"], EXPIRED: ["plain", "Expired"],
};
export const OFFER_TAG: Record<OfferStatus, [string, string]> = {
  PENDING: ["gold", "Waiting"], COUNTERED: ["blue", "Countered"], ACCEPTED: ["green", "Accepted"], REJECTED: ["plain", "Rejected"],
  WITHDRAWN: ["plain", "Withdrawn"], EXPIRED: ["plain", "Expired"], CANCELLED: ["plain", "Closed"],
};
