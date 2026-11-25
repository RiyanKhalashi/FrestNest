// A8 analytics on real data: market by upazila (for the business model) + platform & operations.
import { z } from "zod";
import { prisma } from "../../lib/db.js";
import { requirePermission } from "../../lib/auth.js";
import { productInfo } from "../../services/rules.js";
import { adminRouter as r } from "./failures.js";
import type { Prisma } from "../../generated/prisma/client.js";

const DAY = 86400_000, WEEK = 7 * DAY;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// what each product means for agri companies (insights + company report)
const TARGET: Record<string, string> = {
  Potato: "seed potato, cold storage and late-blight fungicide", Tomato: "hybrid tomato seed, staking and fruit-borer control", Cauliflower: "hybrid cauliflower seed and boron fertiliser",
  Brinjal: "shoot-and-fruit-borer control and Bt brinjal seed", "Green chili": "chili seed, mite control and drying equipment", "Lal shak": "fast-growing leafy seed and organic fertiliser",
};

const filters = z.object({ months: z.coerce.number().refine((m) => [1, 3, 12].includes(m)).default(3), districtId: z.coerce.number().optional(), upazilaId: z.coerce.number().optional(), productId: z.coerce.number().optional() });
type F = z.infer<typeof filters>;
const SOLD: Prisma.DealWhereInput = { status: { notIn: ["CANCELLED", "FAILED"] } };
const area = (f: F): Prisma.ListingWhereInput => (f.upazilaId ? { upazilaId: f.upazilaId } : f.districtId ? { upazila: { districtId: f.districtId } } : {});

async function soldRows(f: F, since: Date, withProduct = true) {
  return prisma.deal.findMany({
    where: { ...SOLD, createdAt: { gte: since }, listing: { ...area(f), ...(withProduct && f.productId ? { productId: f.productId } : {}) } },
    select: { quantityKg: true, pricePerKg: true, createdAt: true, source: true, farmerId: true, dealer: { select: { district: { select: { name: true } } } }, listing: { select: { productId: true, customName: true, upazilaId: true, upazila: { select: { name: true, districtId: true, district: { select: { name: true } } } } } } },
  });
}

r.get("/analytics/market", requirePermission("ANALYTICS"), async (req, res) => {
  const f = filters.parse(req.query);
  const now = Date.now(), since = new Date(now - f.months * 30 * DAY), year = new Date(now - 365 * DAY);
  const [products, districts, rows, yearRows] = await Promise.all([
    prisma.product.findMany({ where: { nameEn: { in: Object.keys(TARGET) } }, orderBy: { id: "asc" } }),
    prisma.district.findMany({ where: { upazilas: { some: { listings: { some: {} } } } }, include: { upazilas: { select: { id: true, name: true } } }, orderBy: { name: "asc" } }),
    soldRows(f, since, false), soldRows(f, year, false),
  ]);
  const pid = new Set(products.map((p) => p.id));
  const inP = (x: { listing: { productId: number | null } }) => x.listing.productId !== null && pid.has(x.listing.productId);
  const sel = rows.filter(inP).filter((x) => !f.productId || x.listing.productId === f.productId);
  const t = (kg: number) => Math.round(kg / 100) / 10; // tonnes, 1 decimal

  // KPIs
  const tonnes = sel.reduce((s, x) => s + x.quantityKg, 0);
  const value = sel.reduce((s, x) => s + x.quantityKg * Number(x.pricePerKg), 0);
  const farmersSelling = new Set(sel.map((x) => x.farmerId)).size;
  const saved = rows.filter((x) => x.source === "EMERGENCY").reduce((s, x) => s + x.quantityKg, 0);

  // heatmap: districts (or upazilas inside the chosen district) × products
  const rowsBy = f.districtId || f.upazilaId
    ? districts.find((d) => d.id === (f.districtId ?? rows[0]?.listing.upazila.districtId))?.upazilas.map((u) => ({ id: u.id, name: u.name, match: (x: (typeof rows)[number]) => x.listing.upazilaId === u.id })) ?? []
    : districts.map((d) => ({ id: d.id, name: d.name, match: (x: (typeof rows)[number]) => x.listing.upazila.districtId === d.id }));
  const allArea = f.upazilaId ? await soldRows({ ...f, upazilaId: undefined, districtId: (await prisma.upazila.findUnique({ where: { id: f.upazilaId } }))?.districtId }, since, false) : rows;
  const heat = rowsBy.map((a) => ({ id: a.id, name: a.name, values: products.map((p) => t(allArea.filter((x) => a.match(x) && x.listing.productId === p.id).reduce((s, x) => s + x.quantityKg, 0))) })).filter((x) => x.values.some((v) => v > 0));

  // top products
  const top = products.map((p) => { const xs = rows.filter((x) => x.listing.productId === p.id); return { id: p.id, name: p.nameEn, tonnes: t(xs.reduce((s, x) => s + x.quantityKg, 0)), price: xs.length ? Math.round(xs.reduce((s, x) => s + Number(x.pricePerKg) * x.quantityKg, 0) / xs.reduce((s, x) => s + x.quantityKg, 0) * 10) / 10 : null }; }).filter((x) => x.tonnes > 0).sort((a, b) => b.tonnes - a.tonnes);

  // weekly average price, last 12 weeks (weighted by kg)
  const weeks = Array.from({ length: 12 }, (_, i) => now - (11 - i) * WEEK);
  const weekRows = await soldRows(f, new Date(now - 12 * WEEK), false);
  const price = products.map((p) => ({ id: p.id, name: p.nameEn, values: weeks.map((end) => { const xs = weekRows.filter((x) => x.listing.productId === p.id && x.createdAt.getTime() <= end && x.createdAt.getTime() > end - WEEK); const kg = xs.reduce((s, x) => s + x.quantityKg, 0); return kg ? Math.round(xs.reduce((s, x) => s + Number(x.pricePerKg) * x.quantityKg, 0) / kg * 10) / 10 : null; }) }));

  // farmers by quantity (names shareable with companies only if the farmer opted in)
  const fq = new Map<string, number>(); sel.forEach((x) => fq.set(x.farmerId, (fq.get(x.farmerId) ?? 0) + x.quantityKg));
  const topF = [...fq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const fu = await prisma.user.findMany({ where: { id: { in: topF.map(([id]) => id) } }, include: { upazila: true, district: true } });
  const fdeals = new Map<string, number>(); sel.forEach((x) => fdeals.set(x.farmerId, (fdeals.get(x.farmerId) ?? 0) + 1));
  const farmers = topF.map(([id, kg]) => { const u = fu.find((x) => x.id === id)!; const xs = sel.filter((x) => x.farmerId === id); return { name: u.name, place: [u.upazila?.name, u.district?.name].filter(Boolean).join(", "), kg, deals: fdeals.get(id) ?? 0, avgPrice: Math.round(xs.reduce((s, x) => s + Number(x.pricePerKg) * x.quantityKg, 0) / kg * 10) / 10, consent: u.partnerOffers, crops: [...new Set(xs.map((x) => products.find((p) => p.id === x.listing.productId)?.nameEn))].filter(Boolean) }; });

  // coming supply: open listings harvesting in the next 30 days
  const coming = await prisma.listing.findMany({ where: { status: "OPEN", harvestDate: { gte: new Date(now - DAY), lte: new Date(now + 30 * DAY) }, ...area(f) }, select: { productId: true, remainingKg: true } });
  const supply = products.map((p) => ({ id: p.id, name: p.nameEn, tonnes: t(coming.filter((x) => x.productId === p.id).reduce((s, x) => s + x.remainingKg, 0)) }));

  // flows: pickup upazila → buyer's district
  const flow = new Map<string, { from: string; district: string; to: string; kg: number }>();
  sel.forEach((x) => { const to = x.dealer.district?.name ?? "—"; const k = x.listing.upazila.name + "→" + to; const e = flow.get(k) ?? { from: x.listing.upazila.name, district: x.listing.upazila.district.name, to, kg: 0 }; e.kg += x.quantityKg; flow.set(k, e); });
  const flows = [...flow.values()].sort((a, b) => b.kg - a.kg).slice(0, 8).map((x) => ({ ...x, tonnes: t(x.kg), local: x.to === x.district }));

  // seasonality: product × month (last 12 months, months in calendar order ending this month)
  const mOrder = Array.from({ length: 12 }, (_, i) => (new Date().getMonth() + 1 + i) % 12);
  const yearSel = yearRows.filter(inP);
  const seasonality = { months: mOrder.map((m) => MONTHS[m]), rows: products.map((p) => ({ name: p.nameEn, values: mOrder.map((m) => t(yearSel.filter((x) => x.listing.productId === p.id && x.createdAt.getMonth() === m).reduce((s, x) => s + x.quantityKg, 0))) })) };
  const savedByMonth = mOrder.map((m) => ({ month: MONTHS[m], kg: yearRows.filter((x) => x.source === "EMERGENCY" && x.createdAt.getMonth() === m).reduce((s, x) => s + x.quantityKg, 0) }));

  // insights: top upazila per product + 12-week price change
  const insights = products.filter((p) => !f.productId || p.id === f.productId).map((p) => {
    const by = new Map<string, number>(); rows.filter((x) => x.listing.productId === p.id).forEach((x) => by.set(x.listing.upazila.name + ", " + x.listing.upazila.district.name, (by.get(x.listing.upazila.name + ", " + x.listing.upazila.district.name) ?? 0) + x.quantityKg));
    const best = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
    const pv = price.find((x) => x.id === p.id)!.values.filter((v): v is number => v !== null);
    return best ? { product: p.nameEn, where: best[0], tonnes: t(best[1]), change: pv.length >= 2 ? Math.round((pv[pv.length - 1] - pv[0]) / pv[0] * 100) : null, target: TARGET[p.nameEn] } : null;
  }).filter(Boolean).sort((a, b) => b!.tonnes - a!.tonnes).slice(0, 4);

  const optedIn = await prisma.user.count({ where: { role: "FARMER", partnerOffers: true } });
  res.json({
    filters: { districts: districts.map((d) => ({ id: d.id, name: d.name, upazilas: d.upazilas })), products: products.map((p) => ({ id: p.id, name: p.nameEn })) },
    kpis: { tonnes: t(tonnes), value: Math.round(value), farmers: farmersSelling, price: f.productId ? top.find((x) => x.id === f.productId)?.price ?? null : null, savedKg: saved, optedIn },
    products: products.map((p) => p.nameEn), heat, heatBy: f.districtId || f.upazilaId ? "Upazila" : "District", top, weeks: weeks.map((w) => new Date(w).toLocaleDateString("en-GB", { day: "numeric", month: "short" })), price, farmers, supply, flows, seasonality, savedByMonth, insights,
  });
});

/** Monthly company report: upazila totals only (no farmer names). */
r.get("/analytics/market.csv", requirePermission("ANALYTICS"), async (req, res) => {
  const f = filters.parse(req.query);
  const rows = await soldRows(f, new Date(Date.now() - f.months * 30 * DAY));
  const agg = new Map<string, { upazila: string; district: string; product: string; kg: number; value: number }>();
  const ps = await prisma.product.findMany();
  rows.forEach((x) => {
    const product = ps.find((p) => p.id === x.listing.productId)?.nameEn ?? productInfo({ customName: x.listing.customName }).name;
    const k = x.listing.upazila.name + "|" + product;
    const e = agg.get(k) ?? { upazila: x.listing.upazila.name, district: x.listing.upazila.district.name, product, kg: 0, value: 0 };
    e.kg += x.quantityKg; e.value += x.quantityKg * Number(x.pricePerKg); agg.set(k, e);
  });
  const lines = ["upazila,district,product,tonnes,avg_price_tk_per_kg,period_months", ...[...agg.values()].sort((a, b) => a.district.localeCompare(b.district) || a.upazila.localeCompare(b.upazila)).map((e) => [e.upazila, e.district, e.product, (e.kg / 1000).toFixed(1), (e.value / e.kg).toFixed(1), f.months].join(","))];
  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", `attachment; filename="freshnest-company-report.csv"`);
  res.send(lines.join("\n"));
});

r.get("/analytics/platform", requirePermission("ANALYTICS"), async (_req, res) => {
  const now = Date.now(), weeks = Array.from({ length: 12 }, (_, i) => now - (11 - i) * WEEK), from12w = new Date(now - 12 * WEEK);
  const label = (ms: number) => new Date(ms - WEEK + DAY).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const inWeek = (d: Date, end: number) => d.getTime() <= end && d.getTime() > end - WEEK;
  const [deals, users, offers, fails, logs, reports, cancels] = await Promise.all([
    prisma.deal.findMany({ where: { createdAt: { gte: from12w } }, select: { createdAt: true, source: true, status: true, quantityKg: true, pricePerKg: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: new Date(now - 365 * DAY) }, role: { not: "ADMIN" } }, select: { role: true, createdAt: true } }),
    prisma.transportOffer.findMany({ where: { status: "ACCEPTED", pickupAt: { gte: new Date(now - 90 * DAY) } }, select: { pickupAt: true, deliverBy: true, vehicle: { select: { facility: true } }, deal: { select: { status: true, deliveredAt: true, pickedUpAt: true, failures: { select: { canMove: true }, take: 1 } } } } }),
    prisma.deliveryFailure.findMany({ where: { status: "APPROVED", createdAt: { gte: new Date(now - 90 * DAY) } }, select: { reason: true } }),
    prisma.adminLog.findMany({ where: { createdAt: { gte: from12w } }, select: { action: true, createdAt: true, actor: { select: { name: true } } } }),
    prisma.report.findMany({ where: { createdAt: { gte: new Date(now - 90 * DAY) } }, select: { kind: true, status: true } }),
    prisma.deal.findMany({ where: { cancelledAt: { gte: from12w } }, select: { cancelledAt: true, cancelledBy: true } }),
  ]);
  const ok = deals.filter((d) => d.status !== "CANCELLED");
  const src = (s: string[]) => weeks.map((w) => ok.filter((d) => s.includes(d.source) && inWeek(d.createdAt, w)).length);
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 11 + i); return d; });
  const signups = (role: string) => months.map((m) => users.filter((u) => u.role === role && u.createdAt.getMonth() === m.getMonth() && u.createdAt.getFullYear() === m.getFullYear()).length);
  // delivery outcome by vehicle facility
  const outcome = (["NORMAL", "VENTILATED", "REFRIGERATED"] as const).map((fac) => {
    const xs = offers.filter((o) => o.vehicle.facility === fac && o.deal.status !== "CANCELLED");
    const failed = xs.filter((o) => o.deal.status === "FAILED");
    const done = xs.filter((o) => o.deal.deliveredAt);
    const late = done.filter((o) => o.deal.deliveredAt!.getTime() > o.deliverBy.getTime());
    return { name: fac === "NORMAL" ? "Normal" : fac === "VENTILATED" ? "Ventilated" : "Refrigerated", values: [done.length - late.length, late.length, failed.filter((o) => o.deal.failures[0]?.canMove).length, failed.filter((o) => !o.deal.failures[0]?.canMove).length] };
  }).filter((r) => r.values.some((v) => v > 0));
  const REASON: Record<string, string> = { BREAKDOWN: "Engine breakdown", ROAD_BLOCKED: "Road blocked", FLOOD: "Flood or heavy rain", ACCIDENT: "Accident", STRIKE: "Strike / hartal", OTHER: "Other" };
  const failReasons = Object.entries(REASON).map(([k, n]) => ({ name: n, value: fails.filter((x) => x.reason === k).length })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const verify = (actions: string[]) => weeks.map((w) => logs.filter((l) => actions.includes(l.action) && inWeek(l.createdAt, w)).length);
  const KIND: Record<string, string> = { PRICE_CHANGED: "Price changed later", NO_SHOW: "No-show", WRONG_QUALITY: "Wrong quality", RUDE: "Rude behaviour", FAKE_REVIEW: "Fake review", OTHER: "Other" };
  const reportsBy = Object.entries(KIND).map(([k, n]) => ({ name: n, values: [["WARNED"], ["SUSPENDED"], ["DISMISSED", "REVIEW_HIDDEN"], ["OPEN"]].map((st) => reports.filter((r) => r.kind === k && st.includes(r.status)).length) })).filter((r) => r.values.some((v) => v > 0));
  const hours = Array.from({ length: 24 }, (_, h) => offers.filter((o) => o.deal.pickedUpAt && o.pickupAt.getTime() > now - 30 * DAY && o.pickupAt.getHours() === h).length);
  const cancelBy = (role: string) => weeks.map((w) => cancels.filter((c) => c.cancelledBy === role && c.cancelledAt && inWeek(c.cancelledAt, w)).length);
  const recentLogs = logs.filter((l) => l.createdAt.getTime() > now - 30 * DAY);
  const cat = (a: string) => /Verif|re-upload|vehicle/i.test(a) ? 0 : /failure/i.test(a) ? 1 : /cancel/i.test(a) ? 2 : /report|Warn|Suspend|Ban|review|Dismiss/i.test(a) ? 3 : -1;
  const workload = [...new Set(recentLogs.map((l) => l.actor.name))].map((n) => ({ name: n, values: [0, 1, 2, 3].map((c) => recentLogs.filter((l) => l.actor.name === n && cat(l.action) === c).length) })).filter((x) => x.values.some((v) => v > 0));
  const delivered = offers.filter((o) => o.deal.deliveredAt), onTime = delivered.filter((o) => o.deal.deliveredAt!.getTime() <= o.deliverBy.getTime());
  const vrecent = logs.filter((l) => l.action === "Verified user");
  res.json({
    kpis: {
      deals: ok.length, bidShare: ok.length ? Math.round(ok.filter((d) => d.source === "BID" || d.source === "BUY_NOW").length / ok.length * 100) : 0,
      users: await prisma.user.count({ where: { role: { not: "ADMIN" }, status: { not: "BANNED" } } }),
      onTime: delivered.length ? Math.round(onTime.length / delivered.length * 1000) / 10 : null,
      cancelRate: deals.length ? Math.round(deals.filter((d) => d.status === "CANCELLED" && d.createdAt.getTime() > now - 30 * DAY).length / Math.max(1, deals.filter((d) => d.createdAt.getTime() > now - 30 * DAY).length) * 1000) / 10 : 0,
      verifiedWeeks: vrecent.length,
    },
    weeks: weeks.map(label),
    dealsBySource: [{ name: "Open bidding", values: src(["BID", "BUY_NOW"]) }, { name: "Own price + offers", values: src(["OFFER"]) }, { name: "Emergency sale", values: src(["EMERGENCY"]) }],
    valueByWeek: weeks.map((w) => Math.round(ok.filter((d) => inWeek(d.createdAt, w)).reduce((s, d) => s + d.quantityKg * Number(d.pricePerKg), 0) / 100000 * 10) / 10),
    months: months.map((m) => MONTHS[m.getMonth()]),
    signups: [{ name: "Farmers", values: signups("FARMER") }, { name: "Dealers", values: signups("DEALER") }, { name: "Transporters", values: signups("TRANSPORTER") }],
    outcome, failReasons,
    verification: [{ name: "Approved", values: verify(["Verified user", "Approved vehicle"]) }, { name: "Asked to re-upload", values: verify(["Asked for re-upload", "Asked for vehicle re-upload"]) }, { name: "Rejected", values: verify(["Rejected verification", "Rejected vehicle"]) }],
    reportsBy, hours,
    cancellations: [{ name: "Dealer", values: cancelBy("DEALER") }, { name: "Farmer", values: cancelBy("FARMER") }, { name: "Transporter", values: cancelBy("TRANSPORTER") }],
    workload,
  });
});
