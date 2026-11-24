// 12 months of realistic past trading for the analytics demo (npm run demo:history -w server).
// Generated users have phones starting 0155…; running it again replaces the previous history.
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db.js";
import type { Role, StorageNeed } from "../src/generated/prisma/client.js";

const H = 3600_000, D = 24 * H;
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const between = (a: number, b: number) => a + rnd() * (b - a);

// product: base price ৳/kg (in-season low … off-season high) and monthly volume shape (index 0 = January)
const PRODUCTS: Record<string, { lo: number; hi: number; s: number[] }> = {
  Potato: { lo: 18, hi: 30, s: [1.6, 1.8, 1.2, .9, .7, .6, .6, .6, .6, .7, .5, .9] },
  Tomato: { lo: 22, hi: 70, s: [1.6, 1.4, .9, .4, .2, .1, .1, .15, .3, .7, 1.2, 1.4] },
  Cauliflower: { lo: 25, hi: 60, s: [1.5, 1, .4, .15, .1, .05, .05, .1, .3, .9, 1.4, 1.6] },
  Brinjal: { lo: 28, hi: 45, s: [1, .9, .8, .8, .9, 1, 1, 1, 1, 1, 1, 1] },
  "Green chili": { lo: 50, hi: 120, s: [.7, .8, 1, 1.1, 1.2, 1.3, 1.2, 1, .9, .8, .8, .8] },
  "Lal shak": { lo: 20, hi: 32, s: [.6, .5, .4, .3, .3, .3, .3, .3, .4, .6, .9, 1] },
};
// upazila specialities (primary, secondary)
const SPEC: Record<string, [string, string]> = {
  "Bogura Sadar": ["Tomato", "Cauliflower"], Shibganj: ["Potato", "Brinjal"], Sherpur: ["Brinjal", "Green chili"], Shajahanpur: ["Tomato", "Cauliflower"], Gabtali: ["Green chili", "Brinjal"], Kahaloo: ["Potato", "Tomato"],
  Nandigram: ["Potato", "Brinjal"], Dhunat: ["Cauliflower", "Brinjal"], Sonatala: ["Green chili", "Potato"], Sariakandi: ["Green chili", "Brinjal"], Adamdighi: ["Potato", "Tomato"], Dhupchanchia: ["Potato", "Cauliflower"],
  "Gaibandha Sadar": ["Tomato", "Brinjal"], Gobindaganj: ["Potato", "Tomato"], Palashbari: ["Tomato", "Potato"], Sadullapur: ["Green chili", "Brinjal"], Saghata: ["Brinjal", "Green chili"], Sundarganj: ["Green chili", "Potato"], Phulchhari: ["Green chili", "Brinjal"],
  "Joypurhat Sadar": ["Tomato", "Potato"], Panchbibi: ["Potato", "Brinjal"], Akkelpur: ["Potato", "Cauliflower"], Kalai: ["Potato", "Tomato"], Khetlal: ["Potato", "Brinjal"],
  "Rangpur Sadar": ["Cauliflower", "Tomato"], Pirganj: ["Potato", "Brinjal"], Mithapukur: ["Potato", "Tomato"], Badarganj: ["Potato", "Cauliflower"], Gangachara: ["Tomato", "Green chili"], Kaunia: ["Cauliflower", "Brinjal"], Pirgachha: ["Brinjal", "Potato"], Taraganj: ["Green chili", "Potato"],
  "Sirajganj Sadar": ["Cauliflower", "Brinjal"], Ullapara: ["Green chili", "Potato"], Shahjadpur: ["Brinjal", "Green chili"], Belkuchi: ["Brinjal", "Tomato"], Raiganj: ["Potato", "Brinjal"], Tarash: ["Green chili", "Potato"], Kazipur: ["Green chili", "Brinjal"], Chauhali: ["Green chili", "Cauliflower"], Kamarkhanda: ["Tomato", "Brinjal"],
};
const FIRST = ["Abdul", "Rahim", "Shafiq", "Nurul", "Kamal", "Jamal", "Rafiq", "Habib", "Mizan", "Sohel", "Anwar", "Belal", "Delwar", "Faruk", "Golam", "Hanif", "Ismail", "Jalil", "Khalek", "Latif", "Moslem", "Nazrul", "Obaid", "Rashida", "Salma", "Taslima", "Morjina", "Hasina", "Rokeya", "Shirin"];
const LAST = ["Mia", "Uddin", "Hossain", "Islam", "Sarkar", "Mondol", "Pramanik", "Akand", "Sheikh", "Begum", "Khatun", "Ali", "Rahman", "Talukdar"];
const SHOP = ["Traders", "Agro", "Kacha Bazar", "Fresh", "Enterprise", "Store", "Wholesale"];
const NOW = Date.now();

async function main() {
  // remove the previous history (users with 0155… phones and everything they did)
  const old = (await prisma.user.findMany({ where: { phone: { startsWith: "0155" } }, select: { id: true } })).map((u) => u.id);
  if (old.length) {
    const deals = (await prisma.deal.findMany({ where: { OR: [{ farmerId: { in: old } }, { dealerId: { in: old } }] }, select: { id: true, listingId: true } }));
    await prisma.deliveryFailure.deleteMany({ where: { OR: [{ reportedById: { in: old } }, { dealId: { in: deals.map((d) => d.id) } }] } });
    await prisma.review.deleteMany({ where: { OR: [{ fromId: { in: old } }, { toId: { in: old } }] } });
    await prisma.report.deleteMany({ where: { OR: [{ byId: { in: old } }, { againstId: { in: old } }] } });
    await prisma.transportOffer.deleteMany({ where: { OR: [{ transporterId: { in: old } }, { dealId: { in: deals.map((d) => d.id) } }] } });
    await prisma.deal.deleteMany({ where: { id: { in: deals.map((d) => d.id) } } });
    await prisma.listing.deleteMany({ where: { farmerId: { in: old } } });
    await prisma.vehicle.deleteMany({ where: { ownerId: { in: old } } });
    await prisma.adminLog.deleteMany({ where: { targetUserId: { in: old } } });
    await prisma.notification.deleteMany({ where: { userId: { in: old } } });
    await prisma.user.deleteMany({ where: { id: { in: old } } });
  }

  // only the demo area (names like Shibganj or Pirganj also exist in other districts)
  const ups = await prisma.upazila.findMany({ where: { district: { name: { in: ["Bogura", "Gaibandha", "Joypurhat", "Rangpur", "Sirajganj", "Dhaka"] } } }, include: { district: true } });
  const products = await prisma.product.findMany({ where: { nameEn: { in: Object.keys(PRODUCTS) } } });
  const P = new Map(products.map((p) => [p.nameEn, p]));
  const hash = await bcrypt.hash("freshnest123", 8);
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  const tanvir = admins.find((a) => a.name.startsWith("Tanvir"))!, mitu = admins.find((a) => a.name.startsWith("Mitu"))!, nusrat = admins.find((a) => a.isSuperAdmin)!;
  let phoneN = 0;
  const phone = () => "0155" + String(1000000 + phoneN++).slice(-7);

  // signups grow towards the winter season (createdAt spread over the year)
  const joinDate = () => { const back = Math.pow(rnd(), 0.6) * 360; return new Date(NOW - back * D); };
  type U = { id: string; role: Role; upazilaId: number; districtId: number; name: string; createdAt: Date };
  const users: U[] = [];
  const mk = (role: Role, u: (typeof ups)[number], name: string, business?: string, partner = false): U & Record<string, unknown> => {
    const createdAt = joinDate();
    const x = { id: randomUUID(), role, phone: phone(), passwordHash: hash, name, businessName: business ?? null, upazilaId: u.id, districtId: u.districtId, status: "ACTIVE" as const, partnerOffers: partner, createdAt, updatedAt: createdAt };
    users.push({ id: x.id, role, upazilaId: u.id, districtId: u.districtId, name, createdAt });
    return x;
  };
  const rows: Record<string, unknown>[] = [];
  for (const u of ups.filter((x) => SPEC[x.name])) for (let i = 0; i < 6 + Math.floor(rnd() * 6); i++) rows.push(mk("FARMER", u, `${pick(FIRST)} ${pick(LAST)}`, undefined, rnd() < 0.35));
  const dealerUps = ups.filter((x) => SPEC[x.name] || x.name === "Tejgaon");
  for (let i = 0; i < 45; i++) { const u = i < 12 ? ups.find((x) => x.name === "Tejgaon")! : pick(dealerUps); rows.push(mk("DEALER", u, `${pick(FIRST)} ${pick(LAST)}`, `${u.name.split(" ")[0]} ${pick(SHOP)}`)); }
  for (let i = 0; i < 16; i++) { const u = pick(ups.filter((x) => SPEC[x.name])); rows.push(mk("TRANSPORTER", u, `${pick(FIRST)} ${pick(LAST)}`, `${u.name.split(" ")[0]} ${pick(["Logistics", "Carriers", "Transport", "Movers"])}`)); }
  await prisma.user.createMany({ data: rows as never });
  const farmers = users.filter((u) => u.role === "FARMER"), dealers = users.filter((u) => u.role === "DEALER"), carriers = users.filter((u) => u.role === "TRANSPORTER");

  // vehicles
  const vehicles: { id: string; ownerId: string; facility: StorageNeed; capacityKg: number }[] = [];
  const vrows = carriers.flatMap((c, i) => [0, 1].map((k) => {
    const facility: StorageNeed = k === 1 && i % 3 === 0 ? "VENTILATED" : k === 1 && i % 5 === 0 ? "REFRIGERATED" : "NORMAL";
    const v = { id: randomUUID(), ownerId: c.id, type: facility === "NORMAL" ? "TRUCK" : facility === "VENTILATED" ? "COVERED_VAN" : "TRUCK", regNo: `HIST-${i}-${k}-${Date.now() % 100000}`, capacityKg: 3000 + (k ? 2000 : 0), facility, status: "APPROVED", createdAt: c.createdAt };
    vehicles.push(v); return v;
  }));
  await prisma.vehicle.createMany({ data: vrows as never });

  // verification decisions in the activity log (A8 "verification per week")
  const logs: Record<string, unknown>[] = [];
  for (const u of [...dealers, ...carriers]) {
    const t = new Date(u.createdAt.getTime() + between(2, 20) * H);
    if (t.getTime() > NOW) continue;
    if (rnd() < 0.2) logs.push({ id: randomUUID(), actorId: tanvir.id, action: "Asked for re-upload", target: u.name, targetUserId: u.id, reason: pick(["Blurry photo", "Expired licence", "Name does not match"]), createdAt: new Date(t.getTime() - 4 * H) });
    logs.push({ id: randomUUID(), actorId: rnd() < 0.8 ? tanvir.id : nusrat.id, action: "Verified user", target: u.name, targetUserId: u.id, createdAt: t });
  }
  for (let i = 0; i < 9; i++) logs.push({ id: randomUUID(), actorId: tanvir.id, action: "Rejected verification", target: "Applicant " + i, createdAt: new Date(NOW - between(1, 80) * D), reason: "Documents do not match" });

  // ---- trading: deals per month follow each upazila's crops and the seasons
  const listings: Record<string, unknown>[] = [], deals: Record<string, unknown>[] = [], offers: Record<string, unknown>[] = [], failures: Record<string, unknown>[] = [], reviews: Record<string, unknown>[] = [], reports: Record<string, unknown>[] = [];
  const byUp = new Map<number, U[]>(); farmers.forEach((f) => byUp.set(f.upazilaId, [...(byUp.get(f.upazilaId) ?? []), f]));
  const dealersNear = (districtId: number) => { const local = dealers.filter((d) => d.districtId === districtId); return rnd() < 0.55 && local.length ? local : dealers; };
  let code = 50000;
  for (let day = 365; day >= 1; day--) {
    const date = new Date(NOW - day * D), m = date.getMonth();
    const growth = 0.55 + 0.45 * (1 - day / 365); // the platform grows over the year
    for (const u of ups) {
      const spec = SPEC[u.name]; if (!spec) continue;
      const fs = byUp.get(u.id) ?? []; if (!fs.length) continue;
      for (const [k, prod] of [[1, spec[0]], [0.45, spec[1]], [0.12, pick(Object.keys(PRODUCTS))]] as [number, string][]) {
        const shape = PRODUCTS[prod].s[m];
        const expected = 0.32 * k * shape * growth * (fs.length / 8);
        if (rnd() > expected) continue;
        const p = P.get(prod); if (!p) continue;
        const farmer = pick(fs), dealer = pick(dealersNear(u.districtId));
        const qty = Math.round(between(150, 1600) * (prod === "Lal shak" ? 0.25 : prod === "Green chili" ? 0.5 : 1) / 10) * 10;
        // price: cheap when plentiful, dearer off-season, + district offset + weekly noise
        const lvl = Math.min(1, shape / 1.6);
        const price = Math.round((PRODUCTS[prod].hi - (PRODUCTS[prod].hi - PRODUCTS[prod].lo) * lvl) * (1 + (u.district.name === "Rangpur" ? -0.05 : u.district.name === "Sirajganj" ? 0.03 : 0)) * between(0.92, 1.08) * 2) / 2;
        const listingId = randomUUID(), dealId = randomUUID();
        const created = new Date(date.getTime() + between(6, 14) * H);
        const source = rnd() < 0.55 ? "BID" : rnd() < 0.2 ? "BUY_NOW" : "OFFER";
        listings.push({ id: listingId, code: ++code, farmerId: farmer.id, productId: p.id, category: p.category, quantityKg: qty, remainingKg: 0, pricePerKg: price, harvestDate: date, upazilaId: u.id, scope: "DISTRICT", mode: source === "OFFER" ? "OWN" : "BID", status: "SOLD", createdAt: new Date(created.getTime() - 20 * H), closedAt: created, updatedAt: created });
        // outcome
        const r = rnd();
        const cancelled = r < 0.035, failed = !cancelled && r < 0.05;
        const fit = vehicles.filter((v) => v.capacityKg >= qty && (p.storage === "NORMAL" || v.facility !== "NORMAL"));
        const v = pick(fit.length ? fit : vehicles);
        const pickHour = pick([4, 5, 5, 6, 6, 6, 7, 7, 8, 9, 10, 15, 16, 16, 17]);
        const pickupAt = new Date(created.getTime() + between(10, 30) * H); pickupAt.setHours(pickHour, Math.floor(between(0, 59)));
        const travel = between(3, 9) * H, late = rnd() < 0.08;
        const deliveredAt = new Date(pickupAt.getTime() + travel * (late ? 1.6 : 0.9));
        const doneInPast = deliveredAt.getTime() < NOW;
        const status = cancelled ? "CANCELLED" : failed ? "FAILED" : doneInPast ? "COMPLETED" : "IN_TRANSIT";
        deals.push({ id: dealId, code: ++code, listingId, farmerId: farmer.id, dealerId: dealer.id, quantityKg: qty, pricePerKg: source === "BUY_NOW" ? price * 1.12 : price, source, status, createdAt: created, transportWindowEndsAt: new Date(created.getTime() + 12 * H), windowNotified: true,
          ...(cancelled ? { cancelledBy: rnd() < 0.6 ? "DEALER" : "FARMER", cancelReason: pick(["Price changed in the market", "Truck not available", "Crop damaged by rain", "Buyer cancelled the order"]), cancelledAt: new Date(created.getTime() + 5 * H) } : {}),
          ...(!cancelled ? { pickedUpAt: pickupAt, ...(status === "COMPLETED" ? { deliveredAt } : {}) } : {}) });
        if (!cancelled) {
          offers.push({ id: randomUUID(), dealId, transporterId: v.ownerId, vehicleId: v.id, price: Math.round(qty * between(2.5, 5.5) / 50) * 50, pickupAt, deliverBy: new Date(pickupAt.getTime() + travel), status: "ACCEPTED", createdAt: new Date(created.getTime() + 2 * H), updatedAt: pickupAt });
          if (rnd() < 0.5) offers.push({ id: randomUUID(), dealId, transporterId: pick(vehicles).ownerId, vehicleId: pick(vehicles).id, price: Math.round(qty * between(3, 6) / 50) * 50, pickupAt, deliverBy: new Date(pickupAt.getTime() + travel), status: "NOT_CHOSEN", createdAt: new Date(created.getTime() + 3 * H), updatedAt: pickupAt });
        }
        if (failed) {
          const usable = Math.round(qty * between(0.8, 1));
          failures.push({ id: randomUUID(), dealId, reportedById: v.ownerId, upazilaId: pick(ups).id, reason: pick(["BREAKDOWN", "BREAKDOWN", "BREAKDOWN", "ROAD_BLOCKED", "ROAD_BLOCKED", "FLOOD", "ACCIDENT", "OTHER"]), details: "Recorded history", condition: "GOOD", usableKg: usable, canMove: rnd() < 0.5, status: "APPROVED", decidedById: tanvir.id, decidedAt: new Date(pickupAt.getTime() + 2 * H), createdAt: new Date(pickupAt.getTime() + 1.5 * H) });
          const eid = randomUUID();
          listings.push({ id: eid, code: ++code, farmerId: farmer.id, productId: p.id, category: p.category, quantityKg: usable, remainingKg: 0, pricePerKg: price * 0.8, harvestDate: date, upazilaId: u.id, scope: "DISTRICT", mode: "BID", status: "SOLD", isEmergency: true, tier: 2, createdAt: new Date(pickupAt.getTime() + 3 * H), closedAt: new Date(pickupAt.getTime() + 6 * H), updatedAt: pickupAt });
          deals.push({ id: randomUUID(), code: ++code, listingId: eid, farmerId: farmer.id, dealerId: pick(dealers).id, quantityKg: usable, pricePerKg: price * 0.85, source: "EMERGENCY", status: "COMPLETED", createdAt: new Date(pickupAt.getTime() + 6 * H), pickedUpAt: new Date(pickupAt.getTime() + 6 * H), deliveredAt: new Date(pickupAt.getTime() + 9 * H), transportWindowEndsAt: pickupAt, windowNotified: true });
        }
        if (status === "COMPLETED" && rnd() < 0.45) {
          reviews.push({ id: randomUUID(), dealId, fromId: dealer.id, toId: farmer.id, stars: pick([5, 5, 5, 4, 4, 4, 3, 2]), comment: pick(["Good quality, honest weight.", "Well sorted and fresh.", "Some pieces were small.", "Loaded on time."]), createdAt: deliveredAt });
          reviews.push({ id: randomUUID(), dealId, fromId: farmer.id, toId: v.ownerId, stars: pick([5, 5, 4, 4, 4, 3]), comment: pick(["Arrived on time.", "Careful loading.", "A little late because of fog."]), createdAt: deliveredAt });
        }
        if (rnd() < 0.012) reports.push({ id: randomUUID(), byId: farmer.id, againstId: dealer.id, dealCode: code, kind: pick(["PRICE_CHANGED", "PRICE_CHANGED", "NO_SHOW", "WRONG_QUALITY", "RUDE"]), details: "Recorded history", status: pick(["WARNED", "WARNED", "DISMISSED", "SUSPENDED", "DISMISSED"]), decidedById: mitu.id, decidedAt: new Date(created.getTime() + 2 * D), createdAt: new Date(created.getTime() + D) });
      }
    }
  }
  // admin workload in the log (last 30 days)
  for (const f of failures) if ((f.createdAt as Date).getTime() > NOW - 30 * D) logs.push({ id: randomUUID(), actorId: tanvir.id, action: "Approved delivery failure", target: "history", createdAt: f.decidedAt });
  for (const r of reports) if ((r.createdAt as Date).getTime() > NOW - 30 * D) logs.push({ id: randomUUID(), actorId: mitu.id, action: r.status === "DISMISSED" ? "Dismissed report" : "Warned user", target: "history", createdAt: r.decidedAt });

  const chunks = async (model: { createMany: (a: { data: never }) => Promise<unknown> }, data: Record<string, unknown>[]) => { for (let i = 0; i < data.length; i += 1000) await model.createMany({ data: data.slice(i, i + 1000) as never }); };
  await chunks(prisma.listing, listings);
  await chunks(prisma.deal, deals);
  await chunks(prisma.transportOffer, offers);
  await chunks(prisma.deliveryFailure, failures);
  await chunks(prisma.review, reviews);
  await chunks(prisma.report, reports);
  await chunks(prisma.adminLog, logs);
  // history uses codes from 50 001 up, so new live listings and deals keep their own FN-1001… numbers
  console.log(`History: ${farmers.length} farmers, ${dealers.length} dealers, ${carriers.length} transporters, ${deals.length} deals, ${failures.length} failures, ${reviews.length} reviews over 12 months.`);
}

main().finally(() => prisma.$disconnect());
