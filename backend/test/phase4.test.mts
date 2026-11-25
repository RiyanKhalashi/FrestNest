// Phase 4 rule tests (delivery failure → admin → emergency sale) against the running API.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db.js";

const API = "http://localhost:4000/api";
const H = 3600_000, D = 24 * H;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function session(phone: string) {
  let cookie = "";
  const call = async (path: string, body?: unknown, method?: string) => {
    const isForm = body instanceof FormData;
    const r = await fetch(API + path, { method: method ?? (body ? "POST" : "GET"), headers: { ...(isForm ? {} : { "content-type": "application/json" }), cookie }, body: isForm ? body : body ? JSON.stringify(body) : undefined });
    const set = r.headers.get("set-cookie"); if (set) cookie = set.split(";")[0];
    return { status: r.status, data: (await r.json().catch(() => ({}))) as any };
  };
  assert.equal((await call("/auth/login", { phone, password: "freshnest123" })).status, 200);
  return Object.assign(call, { cookie: () => cookie });
}
let pass = 0;
async function test(name: string, fn: () => Promise<void>) { try { await fn(); pass++; console.log("  ✓", name); } catch (e) { console.log("  ✗", name); throw e; } }
const sweep = () => new Promise((r) => setTimeout(r, 6500));

const karim = await session("01712345678"), hasan = await session("01811000001"), joyp = await session("01811000002"), kawran = await session("01811000003");
const driver = await session("01911000001"), tanvir = await session("01700000002"), mitu = await session("01700000003");
const upa = async (n: string) => (await prisma.upazila.findFirstOrThrow({ where: { name: n } })).id;
const created: string[] = [];

/** Karim → Hasan, Bogura Logistics truck, already picked up. */
async function onTheRoad(qty = 1000) {
  const r = await karim("/listings", { productId: (await prisma.product.findUniqueOrThrow({ where: { nameEn: "Tomato" } })).id, category: "Vegetable", quantityKg: qty, pricePerKg: 30, harvestDate: new Date(Date.now() - 6 * H).toISOString(), scope: "DISTRICT", mode: "BID", bidEndsAt: new Date(Date.now() + 13 * H).toISOString(), buyNowPrice: 36 });
  assert.equal(r.status, 201, JSON.stringify(r.data)); created.push(r.data.listing.id);
  await hasan(`/market/${r.data.listing.id}/buy-now`, {});
  const deal = await prisma.deal.findFirstOrThrow({ where: { listingId: r.data.listing.id } });
  const truck = await prisma.vehicle.findUniqueOrThrow({ where: { regNo: "Bogura-Ta 14-1177" } });
  await prisma.transportOffer.create({ data: { dealId: deal.id, transporterId: truck.ownerId, vehicleId: truck.id, price: 3000, pickupAt: new Date(Date.now() - H), deliverBy: new Date(Date.now() + 5 * H), status: "ACCEPTED" } });
  await prisma.deal.update({ where: { id: deal.id }, data: { status: "IN_TRANSIT", pickedUpAt: new Date(), deliveryCode: "5555" } });
  return deal.id;
}
function report(fields: Record<string, unknown>, photo = true) {
  const fd = new FormData();
  fd.append("data", JSON.stringify(fields));
  if (photo) fd.append("photo", new Blob([PNG], { type: "image/png" }), "proof.png");
  return fd;
}

console.log("Phase 4 rules");
try {
  const d1 = await onTheRoad();
  const base = { upazilaId: await upa("Joypurhat Sadar"), locationNote: "Bogura–Joypurhat road", reason: "BREAKDOWN", condition: "GOOD", usableKg: 950, canMove: true };

  await test("driver report: photo required, usable ≤ quantity, then FAILURE_REQUESTED", async () => {
    assert.equal((await driver(`/transport/trips/${d1}/failure`, report(base, false))).status, 400);
    assert.equal((await driver(`/transport/trips/${d1}/failure`, report({ ...base, usableKg: 1200 }))).status, 400);
    assert.equal((await driver(`/transport/trips/${d1}/failure`, report(base))).status, 201);
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: d1 } })).status, "FAILURE_REQUESTED");
    assert.equal((await driver(`/transport/trips/${d1}/failure`, report(base))).status, 409);
  });

  await test("only admins with the 'deals' permission see the queue", async () => {
    assert.equal((await mitu("/admin/failures")).status, 403);
    assert.equal((await karim("/admin/failures")).status, 403);
    const q = (await tanvir("/admin/failures")).data;
    assert.ok(q.waiting.some((f: any) => f.deal.id === d1));
    assert.ok((await tanvir("/notifications")).data.items.some((n: any) => n.title === "Delivery failure"));
  });

  await test("photo proof is private to the deal and admins", async () => {
    const f = await prisma.deliveryFailure.findFirstOrThrow({ where: { dealId: d1 } });
    const get = (s: typeof karim) => fetch(API.replace("/api", "") + f.photo!, { headers: { cookie: s.cookie() } }).then((r) => r.status);
    assert.equal(await get(karim), 200); assert.equal(await get(tanvir), 200); assert.equal(await get(kawran), 404);
  });

  await test("farmer cannot start an emergency sale before approval", async () => {
    assert.equal((await karim(`/emergency/deal/${d1}/start`, { hours: 3, drop: 25 })).status, 404);
  });

  await test("admin rejects with a reason → trip continues; driver can report again", async () => {
    const f = (await tanvir("/admin/failures")).data.waiting.find((x: any) => x.deal.id === d1);
    assert.equal((await tanvir(`/admin/failures/${f.id}/reject`, { reason: "" })).status, 400);
    assert.equal((await tanvir(`/admin/failures/${f.id}/reject`, { reason: "Photo does not show the problem" })).status, 200);
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: d1 } })).status, "IN_TRANSIT");
    assert.equal((await driver(`/transport/trips/${d1}/failure`, report(base))).status, 201);
  });

  await test("admin approves → deal FAILED, farmer gets suggested values", async () => {
    const f = (await tanvir("/admin/failures")).data.waiting.find((x: any) => x.deal.id === d1);
    assert.equal((await tanvir(`/admin/failures/${f.id}/approve`, {})).status, 200);
    assert.equal((await tanvir(`/admin/failures/${f.id}/approve`, {})).status, 409);
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: d1 } })).status, "FAILED");
    const e = (await karim(`/emergency/deal/${d1}`)).data;
    assert.ok(e.suggestion.drop > 0 && e.suggestion.hours > 0);
    assert.ok((await hasan("/notifications")).data.items.some((n: any) => n.title === "Delivery failed"));
    assert.ok(await prisma.adminLog.findFirst({ where: { action: "Approved delivery failure" } }));
  });

  let em = "";
  await test("emergency sale: tier 1 = only dealers in the stuck upazila", async () => {
    const r = await karim(`/emergency/deal/${d1}/start`, { hours: 3, drop: 25, buyNow: 29 });
    assert.equal(r.status, 201, JSON.stringify(r.data)); em = r.data.listingId; created.push(em);
    const l = (await joyp("/listings/" + em)).data.listing;
    assert.equal(l.emergency.tier, 1); assert.equal(l.pricePerKg, 27); // original ৳36 (Buy Now) − 25%
    assert.equal(l.quantityKg, 950);
    assert.equal((await hasan("/listings/" + em)).status, 404);
    assert.ok((await joyp("/notifications")).data.items.some((n: any) => n.title === "Emergency sale near you"));
  });

  await test("widening: district, then neighbouring districts (Bogura dealer sees it at tier 3)", async () => {
    assert.equal((await karim(`/emergency/listing/${em}/widen`, {})).status, 200);
    assert.equal((await hasan("/listings/" + em)).status, 404);
    assert.equal((await karim(`/emergency/listing/${em}/widen`, {})).status, 200);
    assert.equal((await hasan("/listings/" + em)).status, 200);
    assert.equal((await karim(`/emergency/listing/${em}/widen`, {})).status, 409);
    assert.equal((await kawran("/listings/" + em)).status, 404);
  });

  await test("highest bid wins → EMERGENCY deal; vehicle can move → same truck delivers", async () => {
    const start = (await joyp("/listings/" + em)).data.listing.pricePerKg;
    assert.equal((await joyp(`/market/${em}/bid`, { pricePerKg: start + 1 })).status, 200);
    await prisma.listing.update({ where: { id: em }, data: { bidEndsAt: new Date(Date.now() - 1000) } });
    await sweep();
    const nd = await prisma.deal.findFirstOrThrow({ where: { listingId: em }, include: { transportOffers: true } });
    assert.equal(nd.source, "EMERGENCY"); assert.equal(nd.status, "IN_TRANSIT"); assert.equal(nd.quantityKg, 950);
    assert.equal(nd.transportOffers[0].status, "ACCEPTED");
    assert.equal((await driver(`/transport/trips/${nd.id}/deliver`, { code: nd.deliveryCode! })).status, 200);
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: nd.id } })).status, "COMPLETED");
  });

  await test("vehicle cannot move + farmer chose auto → sale starts by itself; Buy Now → local transport + handover code", async () => {
    const d2 = await onTheRoad(600);
    assert.equal((await driver(`/transport/trips/${d2}/failure`, report({ ...base, canMove: false, usableKg: 600, reason: "ACCIDENT" }))).status, 201);
    const f = (await tanvir("/admin/failures")).data.waiting.find((x: any) => x.deal.id === d2);
    assert.equal((await tanvir(`/admin/failures/${f.id}/approve`, {})).status, 200);
    await prisma.deliveryFailure.update({ where: { id: f.id }, data: { decidedAt: new Date(Date.now() - 31 * 60_000) } });
    await sweep();
    const l = await prisma.listing.findFirstOrThrow({ where: { failureId: f.id } }); created.push(l.id);
    assert.ok((await karim("/notifications")).data.items.some((n: any) => n.title === "Emergency sale started automatically"));
    assert.equal((await joyp(`/market/${l.id}/buy-now`, {})).status, 200);
    const nd = await prisma.deal.findFirstOrThrow({ where: { listingId: l.id } });
    assert.equal(nd.status, "AWAITING_TRANSPORT"); assert.match(nd.pickupCode!, /^\d{4}$/);
    const trip = (await driver("/transport/trips")).data.trips.find((t: any) => t.id === nd.id);
    assert.equal(trip.handover, true);
    assert.equal(trip.route.from.upazila, "Joypurhat Sadar");
  });

  await test("a failure waiting 30 min alerts admins as urgent", async () => {
    const d3 = await onTheRoad(500);
    assert.equal((await driver(`/transport/trips/${d3}/failure`, report({ ...base, usableKg: 500 }))).status, 201);
    await prisma.deliveryFailure.updateMany({ where: { dealId: d3 }, data: { createdAt: new Date(Date.now() - 31 * 60_000) } });
    await sweep();
    assert.ok((await tanvir("/notifications")).data.items.some((n: any) => n.title.startsWith("URGENT")));
    assert.ok((await tanvir("/admin/failures")).data.waiting.find((x: any) => x.deal.id === d3).escalated);
  });

  console.log(`\n${pass} passed`);
} finally {
  const deals = await prisma.deal.findMany({ where: { listingId: { in: created } }, select: { id: true } });
  await prisma.deliveryFailure.deleteMany({ where: { dealId: { in: deals.map((d) => d.id) } } });
  await prisma.listing.updateMany({ where: { id: { in: created } }, data: { failureId: null } });
  await prisma.deal.deleteMany({ where: { listingId: { in: created } } });
  await prisma.listing.deleteMany({ where: { id: { in: created } } });
  await prisma.adminLog.deleteMany({ where: { createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  await prisma.notification.deleteMany({ where: { createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  await prisma.$disconnect();
}
