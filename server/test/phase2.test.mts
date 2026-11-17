// Phase 2 rule tests against the running API (npm run test -w server).
// Uses the demo accounts; creates its own listings and cleans up afterwards.
import assert from "node:assert/strict";
import { prisma } from "../src/db.js";

const API = "http://localhost:4000/api";
const PW = "freshnest123";
const day = 86400_000, hour = 3600_000;

async function session(phone: string) {
  let cookie = "";
  const call = async (path: string, body?: unknown, method?: string) => {
    const r = await fetch(API + path, { method: method ?? (body ? "POST" : "GET"), headers: { "content-type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined });
    const set = r.headers.get("set-cookie"); if (set) cookie = set.split(";")[0];
    return { status: r.status, data: (await r.json()) as any };
  };
  const r = await call("/auth/login", { phone, password: PW });
  assert.equal(r.status, 200, "login " + phone);
  return call;
}

const created: string[] = [];
let pass = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); pass++; console.log("  ✓", name); } catch (e) { console.log("  ✗", name); throw e; }
}
async function sweep() { await new Promise((r) => setTimeout(r, 6500)); } // jobs run every 5 s

const karim = await session("01712345678");      // farmer, Bogura Sadar
const hasan = await session("01811000001");      // dealer, Bogura Sadar
const joypurhat = await session("01811000002");  // dealer, Joypurhat Sadar (neighbouring district)
const kawran = await session("01811000003");     // dealer, Dhaka (far)
const potato = (await prisma.product.findUniqueOrThrow({ where: { nameEn: "Potato" } })).id;
const tomato = (await prisma.product.findUniqueOrThrow({ where: { nameEn: "Tomato" } })).id;
const joypurhatId = (await prisma.district.findUniqueOrThrow({ where: { name: "Joypurhat" } })).id;

const base = { category: "Vegetable", quantityKg: 1000, pricePerKg: 20, harvestDate: new Date(Date.now() + 3 * day).toISOString() };

console.log("Phase 2 rules");
try {
  await test("preview suggests nationwide for potato and gives a deadline window", async () => {
    const r = await karim("/listings/preview", { productId: potato, harvestDate: base.harvestDate });
    assert.equal(r.status, 200); assert.equal(r.data.suggestion.scope, "NATION");
    assert.ok(new Date(r.data.window.min) < new Date(r.data.window.latestSafe));
  });

  await test("bidding shorter than 12 h is refused", async () => {
    const r = await karim("/listings", { ...base, productId: tomato, scope: "DISTRICT", mode: "BID", bidEndsAt: new Date(Date.now() + 2 * hour).toISOString() });
    assert.equal(r.status, 400); assert.ok(r.data.fields.bidEndsAt);
  });

  let bidL = "";
  await test("farmer creates a district bidding listing with Buy Now", async () => {
    const r = await karim("/listings", { ...base, productId: tomato, scope: "DISTRICT", targetDistrictIds: [joypurhatId], mode: "BID", bidEndsAt: new Date(Date.now() + 20 * hour).toISOString(), minIncrement: 1, buyNowPrice: 30 });
    assert.equal(r.status, 201, JSON.stringify(r.data)); bidL = r.data.listing.id; created.push(bidL);
    assert.match(r.data.listing.code, /^FN-1\d{3}$/);
  });

  await test("visibility: Bogura + targeted Joypurhat see it, Dhaka does not", async () => {
    const ids = async (s: typeof hasan) => (await s("/market")).data.listings.map((l: any) => l.id);
    assert.ok((await ids(hasan)).includes(bidL));
    assert.ok((await ids(joypurhat)).includes(bidL));
    assert.ok(!(await ids(kawran)).includes(bidL));
    assert.equal((await kawran("/listings/" + bidL)).status, 404);
  });

  await test("bid below base price is refused; valid bid accepted", async () => {
    assert.equal((await hasan(`/market/${bidL}/bid`, { pricePerKg: 19 })).status, 400);
    assert.equal((await hasan(`/market/${bidL}/bid`, { pricePerKg: 21 })).status, 200);
  });

  await test("next bid must beat highest + increment; leader cannot outbid self", async () => {
    assert.equal((await joypurhat(`/market/${bidL}/bid`, { pricePerKg: 21.5 })).status, 400);
    assert.equal((await hasan(`/market/${bidL}/bid`, { pricePerKg: 25 })).status, 409);
    assert.equal((await joypurhat(`/market/${bidL}/bid`, { pricePerKg: 22 })).status, 200);
  });

  await test("dealers see anonymous labels, farmer sees names", async () => {
    const d = (await hasan("/listings/" + bidL)).data.listing;
    assert.ok(d.bids.every((b: any) => b.who.startsWith("Dealer #")));
    const f = (await karim("/listings/" + bidL)).data.listing;
    assert.ok(f.bids.some((b: any) => b.who.includes("Joypurhat Fresh")));
    assert.equal(f.canEdit, false);
  });

  await test("outbid dealer is notified", async () => {
    const n = (await hasan("/notifications")).data.items;
    assert.ok(n.some((x: any) => x.title === "You were outbid"));
  });

  await test("Buy Now creates an instant deal; a second Buy Now fails", async () => {
    const r = await hasan(`/market/${bidL}/buy-now`, {});
    assert.equal(r.status, 200, JSON.stringify(r.data)); assert.match(r.data.deal, /^FN-/);
    assert.equal((await joypurhat(`/market/${bidL}/buy-now`, {})).status, 409);
    const l = (await karim("/listings/" + bidL)).data.listing;
    assert.equal(l.status, "SOLD"); assert.equal(l.deals[0].source, "BUY_NOW"); assert.equal(l.deals[0].pricePerKg, 30);
  });

  await test("two dealers press Buy Now at the same moment → exactly one deal", async () => {
    const r = await karim("/listings", { ...base, productId: tomato, scope: "DISTRICT", targetDistrictIds: [joypurhatId], mode: "BID", bidEndsAt: new Date(Date.now() + 20 * hour).toISOString(), buyNowPrice: 30 });
    const id = r.data.listing.id; created.push(id);
    const [a, b] = await Promise.all([hasan(`/market/${id}/buy-now`, {}), joypurhat(`/market/${id}/buy-now`, {})]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    assert.equal(await prisma.deal.count({ where: { listingId: id } }), 1);
  });

  let autoL = "";
  await test("bidding end → highest bid wins automatically", async () => {
    const r = await karim("/listings", { ...base, productId: potato, scope: "NATION", mode: "BID", bidEndsAt: new Date(Date.now() + 30 * hour).toISOString() });
    autoL = r.data.listing.id; created.push(autoL);
    assert.equal((await kawran(`/market/${autoL}/bid`, { pricePerKg: 20 })).status, 200);
    assert.equal((await hasan(`/market/${autoL}/bid`, { pricePerKg: 20.5 })).status, 200);
    await prisma.listing.update({ where: { id: autoL }, data: { bidEndsAt: new Date(Date.now() - 1000) } });
    await sweep();
    const l = (await karim("/listings/" + autoL)).data.listing;
    assert.equal(l.status, "SOLD"); assert.equal(l.deals[0].dealer, "Hasan Traders"); assert.equal(l.deals[0].source, "BID");
  });

  let noL = "";
  await test("no bids → NO_SALE, relist once as own price", async () => {
    const r = await karim("/listings", { ...base, productId: potato, scope: "DISTRICT", mode: "BID", bidEndsAt: new Date(Date.now() + 13 * hour).toISOString() });
    noL = r.data.listing.id; created.push(noL);
    await prisma.listing.update({ where: { id: noL }, data: { bidEndsAt: new Date(Date.now() - 1000) } });
    await sweep();
    assert.equal((await karim("/listings/" + noL)).data.listing.status, "NO_SALE");
    const re = await karim(`/listings/${noL}/relist`, { mode: "OWN", minResponseHours: 6, pricePerKg: 18 });
    assert.equal(re.status, 200, JSON.stringify(re.data)); assert.equal(re.data.listing.mode, "OWN");
    await prisma.listing.update({ where: { id: noL }, data: { status: "NO_SALE" } });
    assert.equal((await karim(`/listings/${noL}/relist`, { mode: "OWN", minResponseHours: 6 })).status, 409);
    await prisma.listing.update({ where: { id: noL }, data: { status: "OPEN" } });
  });

  let ownL = "";
  await test("own-price listing: offer rules (reply time, quantity, one active offer)", async () => {
    const r = await karim("/listings", { ...base, productId: potato, scope: "DISTRICT", targetDistrictIds: [joypurhatId], mode: "OWN", quantityKg: 800, pricePerKg: 22, minResponseHours: 6, minOrderKg: 100 });
    ownL = r.data.listing.id; created.push(ownL);
    assert.equal((await hasan(`/offers/listing/${ownL}`, { quantityKg: 300, pricePerKg: 21, replyHours: 2 })).status, 400); // under farmer's 6 h
    assert.equal((await hasan(`/offers/listing/${ownL}`, { quantityKg: 50, pricePerKg: 21, replyHours: 6 })).status, 400);  // under min order
    assert.equal((await hasan(`/offers/listing/${ownL}`, { quantityKg: 900, pricePerKg: 21, replyHours: 6 })).status, 400); // over quantity
    assert.equal((await hasan(`/offers/listing/${ownL}`, { quantityKg: 500, pricePerKg: 21, replyHours: 6 })).status, 201);
    assert.equal((await hasan(`/offers/listing/${ownL}`, { quantityKg: 100, pricePerKg: 21, replyHours: 6 })).status, 409);
    assert.equal((await joypurhat(`/offers/listing/${ownL}`, { quantityKg: 400, pricePerKg: 21.5, replyHours: 12 })).status, 201);
  });

  await test("farmer edit is locked after the first offer", async () => {
    assert.equal((await karim("/listings/" + ownL, { ...base, productId: potato, scope: "DISTRICT", mode: "OWN", minResponseHours: 6 }, "PUT")).status, 409);
  });

  await test("accept one offer → deal; conflicting offer auto-cancelled", async () => {
    const offers = (await karim("/listings/" + ownL)).data.listing.offers;
    const h = offers.find((o: any) => o.dealer.name === "Hasan Traders");
    assert.equal((await karim(`/offers/${h.id}/accept`, {})).status, 200);
    const l = (await karim("/listings/" + ownL)).data.listing;
    assert.equal(l.remainingKg, 300);
    assert.equal(l.offers.find((o: any) => o.dealer.name === "Joypurhat Fresh").status, "CANCELLED"); // wanted 400 > 300 left
  });

  await test("counter-offer once; dealer accepts counter → deal; listing sold out", async () => {
    assert.equal((await joypurhat(`/offers/listing/${ownL}`, { quantityKg: 300, pricePerKg: 20, replyHours: 6 })).status, 201);
    const o = (await karim("/listings/" + ownL)).data.listing.offers.find((x: any) => x.status === "PENDING");
    assert.equal((await karim(`/offers/${o.id}/counter`, { pricePerKg: 21 })).status, 200);
    assert.equal((await karim(`/offers/${o.id}/counter`, { pricePerKg: 21.5 })).status, 409);
    assert.equal((await joypurhat(`/offers/${o.id}/accept-counter`, {})).status, 200);
    const l = (await karim("/listings/" + ownL)).data.listing;
    assert.equal(l.status, "SOLD"); assert.equal(l.remainingKg, 0);
    assert.ok(l.deals.some((d: any) => d.pricePerKg === 21 && d.quantityKg === 300));
  });

  await test("cancel needs a reason; cancelling an own-price deal returns the quantity", async () => {
    const deals = (await joypurhat("/deals")).data.deals.filter((d: any) => d.listing.id === ownL);
    assert.equal((await joypurhat(`/deals/${deals[0].id}/cancel`, { reason: "" })).status, 400);
    assert.equal((await joypurhat(`/deals/${deals[0].id}/cancel`, { reason: "Truck not available this week" })).status, 200);
    const l = (await karim("/listings/" + ownL)).data.listing;
    assert.equal(l.status, "OPEN"); assert.equal(l.remainingKg, 300);
    assert.ok((await karim("/notifications")).data.items.some((n: any) => n.title === "Deal cancelled"));
  });

  await test("offer expiry", async () => {
    assert.equal((await kawran(`/offers/listing/${noL}`, { quantityKg: 200, pricePerKg: 17, replyHours: 6 })).status, 404); // district listing, Dhaka dealer cannot see
    assert.equal((await hasan(`/offers/listing/${noL}`, { quantityKg: 200, pricePerKg: 17, replyHours: 6 })).status, 201);
    await prisma.offer.updateMany({ where: { listingId: noL, status: "PENDING" }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await sweep();
    assert.equal((await karim("/listings/" + noL)).data.listing.offers[0].status, "EXPIRED");
  });

  await test("pending dealer cannot bid", async () => {
    await prisma.user.update({ where: { phone: "01811000002" }, data: { status: "PENDING" } });
    const r = await karim("/listings", { ...base, productId: potato, scope: "NATION", mode: "BID", bidEndsAt: new Date(Date.now() + 30 * hour).toISOString() });
    created.push(r.data.listing.id);
    const b = await joypurhat(`/market/${r.data.listing.id}/bid`, { pricePerKg: 25 });
    await prisma.user.update({ where: { phone: "01811000002" }, data: { status: "ACTIVE" } });
    assert.equal(b.status, 403);
  });

  console.log(`\n${pass} passed`);
} finally {
  // clean up everything this test created
  await prisma.deal.deleteMany({ where: { listingId: { in: created } } });
  await prisma.listing.deleteMany({ where: { id: { in: created } } });
  await prisma.notification.deleteMany({ where: { createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  await prisma.$disconnect();
}
