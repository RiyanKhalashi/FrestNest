// Business rules shared by listings, market, offers and jobs (agreed in docs/decisions).
import { randomInt } from "node:crypto";
import { prisma } from "./db.js";
import type { Scope, StorageNeed, User, Prisma } from "./generated/prisma/client.js";

const H = 3600_000;
export const DAY = 24 * H;

export async function setting<T = number>(key: string, fallback: T): Promise<T> {
  const s = await prisma.setting.findUnique({ where: { key } });
  return (s?.value as T) ?? fallback;
}

/** Shelf life + vehicle need for a listing (from the product list, or the farmer's own values). */
export function productInfo(l: { product?: { nameEn: string; nameBn: string; shelfLifeDays: number; storage: StorageNeed; ventilatedForLongTrips: boolean } | null; customName?: string | null; customShelfLife?: number | null; customStorage?: StorageNeed | null }, scope?: Scope) {
  const p = l.product;
  const shelf = p ? p.shelfLifeDays : l.customShelfLife ?? 1;
  let storage: StorageNeed = p ? p.storage : l.customStorage ?? "NORMAL";
  // e.g. tomato: normal locally, ventilated only for long (nationwide) trips
  if (p?.ventilatedForLongTrips && scope !== "NATION" && storage === "VENTILATED") storage = "NORMAL";
  if (p?.ventilatedForLongTrips && scope === "NATION" && storage === "NORMAL") storage = "VENTILATED";
  return { name: p ? p.nameEn : l.customName ?? "Produce", nameBn: p?.nameBn ?? null, shelf, storage, custom: !p };
}

/** Suggested visibility for a product (farmer can override). */
export function suggestScope(shelf: number, storage: StorageNeed): { scope: Scope; why: string } {
  if (shelf > 14 && storage === "NORMAL") return { scope: "NATION", why: "It keeps well, so nationwide is suggested and a normal vehicle is fine." };
  if (shelf <= 2) return { scope: "UPAZILA", why: "It spoils fast, so selling near your upazila is suggested. Buyers are close and it arrives fresh." };
  return { scope: "DISTRICT", why: "Within district is suggested, where a normal vehicle is enough." + (storage !== "NORMAL" ? ` Nationwide needs a ${storage.toLowerCase()} vehicle.` : "") };
}

const TRAVEL_H: Record<Scope, number> = { UPAZILA: 3, DISTRICT: 6, NATION: 24 };

/**
 * Bidding deadline window (agreed 2026-11-07):
 * min = now + 12 h (upazila/district) or 24 h (nationwide)
 * latest safe = harvest + shelf × (1 − 40%) − transport offer window − travel time
 * recommended ≈ one day before harvest (so pickup is on harvest day), kept inside the window
 */
export async function deadlineWindow(harvest: Date, shelfDays: number, scope: Scope, now = new Date()) {
  const minH = scope === "NATION" ? await setting("minBiddingHoursNationwide", 24) : await setting("minBiddingHoursDistrict", 12);
  const offerWin = await setting("transportOfferWindowHours", 12);
  const leftPct = await setting("resaleShelfLeftPercent", 40);
  const min = new Date(now.getTime() + minH * H);
  const latestSafe = new Date(harvest.getTime() + shelfDays * DAY * (1 - leftPct / 100) - (offerWin + TRAVEL_H[scope]) * H);
  // suggestions are rounded up to the next quarter hour, so they stay valid while the farmer fills in the form
  const q = 15 * 60_000, up = (d: Date) => new Date(Math.ceil(d.getTime() / q) * q);
  let recommended = up(new Date(harvest.getTime() - DAY));
  if (recommended < min) recommended = up(new Date(min.getTime() + q));
  if (recommended > latestSafe && latestSafe > min) recommended = latestSafe;
  const expiresAt = new Date(harvest.getTime() + shelfDays * DAY);
  return { min, latestSafe, recommended, expiresAt, tooShort: latestSafe < min };
}

/** A form can take a few minutes to fill in: the minimum bidding time is checked with this grace. */
export const GRACE_MS = 15 * 60_000;


/** Prisma filter: listings this dealer is allowed to see. */
export function visibleTo(dealer: Pick<User, "districtId" | "upazilaId">): Prisma.ListingWhereInput {
  const d = dealer.districtId ?? -1, u = dealer.upazilaId ?? -1;
  return {
    OR: [
      { scope: "NATION" },
      { scope: "DISTRICT", OR: [{ upazila: { districtId: d } }, { targetDistricts: { some: { id: d } } }] },
      { scope: "UPAZILA", OR: [{ upazilaId: u }, { targetUpazilas: { some: { id: u } } }] },
    ],
  };
}

/** How close a listing is to the dealer (no GPS yet; uses upazila/district relations). */
export async function closeness(dealer: Pick<User, "districtId" | "upazilaId">) {
  const [up, dist] = await Promise.all([
    dealer.upazilaId ? prisma.upazila.findUnique({ where: { id: dealer.upazilaId }, select: { neighbours: { select: { id: true } } } }) : null,
    dealer.districtId ? prisma.district.findUnique({ where: { id: dealer.districtId }, select: { neighbours: { select: { id: true } } } }) : null,
  ]);
  const nu = new Set(up?.neighbours.map((x) => x.id)), nd = new Set(dist?.neighbours.map((x) => x.id));
  return (upazilaId: number, districtId: number): [number, string] => {
    if (upazilaId === dealer.upazilaId) return [0, "Your upazila"];
    if (nu.has(upazilaId)) return [1, "Next upazila"];
    if (districtId === dealer.districtId) return [2, "Your district"];
    if (nd.has(districtId)) return [3, "Nearby district"];
    return [4, "Far"];
  };
}

export const money = (d: Prisma.Decimal | number | string | null | undefined) => (d === null || d === undefined ? null : Number(d));
export const code = (n: number) => "FN-" + n;

// ---------------------------------------------------------------- Phase 3: transport

const RANK: Record<StorageNeed, number> = { NORMAL: 0, VENTILATED: 1, REFRIGERATED: 2 };
/** A refrigerated vehicle can carry what needs ventilation; a normal one cannot. */
export const facilityFits = (have: StorageNeed, need: StorageNeed) => RANK[have] >= RANK[need];

/** Vehicle needed for this trip: "ventilated for long trips" products need it only when the dealer is far from the pickup. */
export async function tripNeed(deal: { dealer: { districtId: number | null }; listing: Parameters<typeof productInfo>[0] & { upazila: { districtId: number } } }) {
  const pickup = deal.listing.upazila.districtId, to = deal.dealer.districtId ?? -1;
  let long = pickup !== to;
  if (long) {
    const d = await prisma.district.findUnique({ where: { id: pickup }, select: { neighbours: { select: { id: true } } } });
    if (d?.neighbours.some((n) => n.id === to)) long = false;
  }
  return { need: productInfo(deal.listing, long ? "NATION" : "DISTRICT").storage, long };
}

export type Season = { key: "winter" | "summer" | "monsoon"; name: string; months: string; risk: boolean; advice: string };
const SEASONS: Season[] = [
  { key: "winter", name: "Winter", months: "Nov–Feb", risk: false, advice: "Good weather for transport. A normal vehicle is fine and costs less. Morning fog: allow extra travel time." },
  { key: "summer", name: "Summer", months: "Mar–May", risk: true, advice: "Heat can spoil produce in a normal vehicle. Prefer ventilated vehicles or travel at night / early morning." },
  { key: "monsoon", name: "Monsoon", months: "Jun–Oct", risk: true, advice: "Rain and humidity: a normal vehicle needs a cover or tarpaulin. Expect delays." },
];
/** Season calendar (months 1–12), editable by the Super Admin (A6). Cached; refreshed every minute and on save. */
export const DEFAULT_SEASON_MONTHS: Record<Season["key"], number[]> = { winter: [11, 12, 1, 2], summer: [3, 4, 5], monsoon: [6, 7, 8, 9, 10] };
let seasonMonths = DEFAULT_SEASON_MONTHS;
export async function refreshSeasons() { seasonMonths = await setting("seasonMonths", DEFAULT_SEASON_MONTHS); }
export const seasonList = () => SEASONS.map((s) => ({ ...s, monthsList: seasonMonths[s.key] }));
/** Advice only: it never blocks a choice (agreed 2026-11-08). */
export function seasonOf(d: Date): Season {
  const m = d.getMonth() + 1;
  return SEASONS.find((s) => seasonMonths[s.key]?.includes(m)) ?? SEASONS[0];
}
export function seasonTag(facility: StorageNeed, pickupAt: Date): { tag: "COST_SAVING" | "WEATHER_RISK" | null; text: string | null } {
  if (facility !== "NORMAL") return { tag: null, text: null };
  const s = seasonOf(pickupAt);
  return s.risk ? { tag: "WEATHER_RISK", text: `${s.name}: ${s.advice}` } : { tag: "COST_SAVING", text: "Normal vehicle in suitable weather: cheaper and safe." };
}

/** Vehicle is booked if an accepted offer overlaps [from, to] on a trip that is not finished. */
export async function vehicleBusy(vehicleId: string, from: Date, to: Date, exceptOfferId?: string) {
  const clash = await prisma.transportOffer.findFirst({
    where: {
      vehicleId, status: "ACCEPTED", id: exceptOfferId ? { not: exceptOfferId } : undefined,
      deal: { status: { in: ["TRANSPORT_CONFIRMED", "IN_TRANSIT", "FAILURE_REQUESTED"] } },
      pickupAt: { lt: to }, deliverBy: { gt: from },
    },
    include: { deal: { select: { code: true } } },
  });
  return clash ? "FN-" + clash.deal.code : null;
}

/** Small pickups (under the limit) go only to transporters based in the pickup upazila or a neighbouring one. */
export async function smallPickupAllowed(qtyKg: number, pickupUpazilaId: number, transporterUpazilaId: number | null) {
  const max = await setting("smallPickupMaxKg", 300);
  if (qtyKg >= max) return true;
  if (!transporterUpazilaId) return false;
  if (transporterUpazilaId === pickupUpazilaId) return true;
  const u = await prisma.upazila.findUnique({ where: { id: pickupUpazilaId }, select: { neighbours: { select: { id: true } } } });
  return !!u?.neighbours.some((n) => n.id === transporterUpazilaId);
}

/** 4-digit one-time code (cryptographically random). */
export const newCode = () => String(randomInt(1000, 10000));
