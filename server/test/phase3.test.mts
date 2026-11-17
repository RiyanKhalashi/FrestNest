// Phase 3 rule tests (transport, codes, cancel requests, reviews) against the running API.
import assert from "node:assert/strict";
import { prisma } from "../src/db.js";

const API = "http://localhost:4000/api";
const H = 3600_000, D = 24 * H;

async function session(phone: string) {
  let cookie = "";
  const call = async (path: string, body?: unknown, method?: string) => {
    const r = await fetch(API + path, { method: method ?? (body ? "POST" : "GET"), headers: { "content-type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined });
    const set = r.headers.get("set-cookie"); if (set) cookie = set.split(";")[0];
    return { status: r.status, data: (await r.json().catch(() => ({}))) as any };
  };
  assert.equal((await call("/auth/login", { phone, password: "freshnest123" })).status, 200);
  return call;
}
let pass = 0;
async function test(name: string, fn: () => Promise<void>) { try { await fn(); pass++; console.log("  ✓", name); } catch (e) { console.log("  ✗", name); throw e; } }
const sweep = () => new Promise((r) => setTimeout(r, 6500));

const karim = await session("01712345678"), hasan = await session("01811000001");
const logistics = await session("01911000001"), mintu = await session("01911000002"), coldline = await session("01911000003");
const ids = { karim: (await prisma.user.findUniqueOrThrow({ where: { phone: "01712345678" } })).id, hasan: (await prisma.user.findUniqueOrThrow({ where: { phone: "01811000001" } })).id };
const product = async (n: string) => (await prisma.product.findUniqueOrThrow({ where: { nameEn: n } })).id;
const veh = async (reg: string) => (await prisma.vehicle.findUniqueOrThrow({ where: { regNo: reg } })).id;
const created: string[] = [];

/** Farmer lists, dealer uses Buy Now → a fresh deal waiting for transport. */
async function newDeal(productName: string, qty: number) {
  const r = await karim("/listings", { productId: await product(productName), category: "Vegetable", quantityKg: qty, pricePerKg: 20, harvestDate: new Date(Date.now() + 2 * D).toISOString(), scope: "DISTRICT", mode: "BID", bidEndsAt: new Date(Date.now() + 20 * H).toISOString(), buyNowPrice: 25 });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  created.push(r.data.listing.id);
  assert.equal((await hasan(`/market/${r.data.listing.id}/buy-now`, {})).status, 200);
  return (await prisma.deal.findFirstOrThrow({ where: { listingId: r.data.listing.id } })).id;
}
const offer = (vehicleId: string, price: number, hFrom = 20, hTo = 26) => ({ vehicleId, price, pickupAt: new Date(Date.now() + hFrom * H).toISOString(), deliverBy: new Date(Date.now() + hTo * H).toISOString() });
const boardIds = async (s: typeof hasan) => (await s("/transport/deals")).data.deals.map((d: any) => d.id);

console.log("Phase 3 rules");
try {
  const potatoDeal = await newDeal("Potato", 1500);
  await test("matching: 1.5 t potato shows for trucks, not for a 1 t pickup", async () => {
    assert.ok((await boardIds(logistics)).includes(potatoDeal));
    assert.ok(!(await boardIds(mintu)).includes(potatoDeal));
  });

  const smallDeal = await newDeal("Lal shak", 150);
  await test("small pickup (150 kg) goes only to transporters in or next to the pickup upazila", async () => {
    assert.ok((await boardIds(mintu)).includes(smallDeal));      // Bogura Sadar = same upazila
    assert.ok((await boardIds(coldline)).includes(smallDeal));   // Shibganj = neighbour of Bogura Sadar
    await prisma.user.update({ where: { phone: "01911000003" }, data: { upazila: { connect: { id: (await prisma.upazila.findFirstOrThrow({ where: { name: "Sherpur" } })).id } } } });
    const far = await boardIds(coldline);
    await prisma.user.update({ where: { phone: "01911000003" }, data: { upazila: { connect: { id: (await prisma.upazila.findFirstOrThrow({ where: { name: "Shibganj" } })).id } } } });
    assert.ok(!far.includes(smallDeal));
  });

  await test("offer rules: wrong vehicle, capacity, time order, one offer per deal", async () => {
    assert.equal((await mintu(`/transport/deals/${potatoDeal}/offers`, offer(await veh("Bogura-Na 12-4410"), 4000))).status, 400); // 1 t < 1.5 t
    assert.equal((await logistics(`/transport/deals/${potatoDeal}/offers`, offer(await veh("Dhaka-Ta 22-7781"), 4000))).status, 400); // not their vehicle
    assert.equal((await logistics(`/transport/deals/${potatoDeal}/offers`, offer(await veh("Bogura-Ta 14-0932"), 4000, 20, 19))).status, 400); // delivery before pickup
    assert.equal((await logistics(`/transport/deals/${potatoDeal}/offers`, offer(await veh("Bogura-Ta 14-0932"), 4000))).status, 201);
    assert.equal((await logistics(`/transport/deals/${potatoDeal}/offers`, offer(await veh("Bogura-Ta 14-1177"), 3900))).status, 409);
    assert.equal((await coldline(`/transport/deals/${potatoDeal}/offers`, offer(await veh("Dhaka-Ta 22-7781"), 6500))).status, 201);
  });

  await test("farmer and dealer see offers; winter normal vehicle is tagged cost-saving", async () => {
    const d = (await hasan("/deals")).data.deals.find((x: any) => x.id === potatoDeal);
    assert.equal(d.transport.offers.length, 2);
    const truck = d.transport.offers.find((o: any) => o.vehicle.regNo === "Bogura-Ta 14-0932");
    const month = new Date(Date.now() + 20 * H).getMonth();
    assert.equal(truck.season.tag, month >= 10 || month <= 1 ? "COST_SAVING" : "WEATHER_RISK");
    assert.equal(d.transport.offers.find((o: any) => o.vehicle.facility === "REFRIGERATED").season.tag, null);
    assert.equal((await karim("/deals")).data.deals.find((x: any) => x.id === potatoDeal).transport.offers.length, 2);
  });

  await test("dealer confirms → codes created, other offer not chosen, phones shared", async () => {
    const d = (await hasan("/deals")).data.deals.find((x: any) => x.id === potatoDeal);
    const o = d.transport.offers.find((x: any) => x.vehicle.regNo === "Bogura-Ta 14-0932");
    assert.equal((await hasan(`/deals/${potatoDeal}/transport/${o.id}/accept`, {})).status, 200);
    const dd = (await hasan("/deals")).data.deals.find((x: any) => x.id === potatoDeal);
    assert.equal(dd.status, "TRANSPORT_CONFIRMED"); assert.match(dd.deliveryCode, /^\d{4}$/); assert.equal(dd.pickupCode, null);
    assert.ok(dd.transport.confirmed.transporter.phone);
    const fd = (await karim("/deals")).data.deals.find((x: any) => x.id === potatoDeal);
    assert.match(fd.pickupCode, /^\d{4}$/); assert.equal(fd.deliveryCode, null);
    const cl = (await coldline("/transport/trips")).data.trips.find((x: any) => x.id === potatoDeal);
    assert.equal(cl.transport.offers[0].status, "NOT_CHOSEN");
  });

  await test("a booked vehicle cannot be offered at an overlapping time", async () => {
    const other = await newDeal("Potato", 1200);
    const r = await logistics(`/transport/deals/${other}/offers`, offer(await veh("Bogura-Ta 14-0932"), 3000, 21, 25));
    assert.equal(r.status, 400); assert.match(r.data.fields.pickupAt[0], /already booked/);
    assert.equal((await logistics(`/transport/deals/${other}/offers`, offer(await veh("Bogura-Ta 14-1177"), 3000, 21, 25))).status, 201);
  });

  await test("cancelling after transport is booked becomes a request for an admin", async () => {
    const r = await karim(`/deals/${potatoDeal}/cancel`, { reason: "Rain damaged part of the crop" });
    assert.equal(r.status, 200); assert.equal(r.data.requested, true);
    assert.equal((await karim(`/deals/${potatoDeal}/cancel`, { reason: "Asking again" })).status, 409);
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: potatoDeal } })).status, "TRANSPORT_CONFIRMED");
    await prisma.cancelRequest.deleteMany({ where: { dealId: potatoDeal } });
  });

  await test("pickup code: wrong code counts tries, right code → in transit", async () => {
    const pickup = (await prisma.deal.findUniqueOrThrow({ where: { id: potatoDeal } })).pickupCode!;
    const wrong = pickup === "1234" ? "4321" : "1234";
    const w = await logistics(`/transport/trips/${potatoDeal}/pickup`, { code: wrong });
    assert.equal(w.status, 400); assert.match(w.data.error, /4 tries left/);
    assert.equal((await mintu(`/transport/trips/${potatoDeal}/pickup`, { code: pickup })).status, 404); // not the driver
    assert.equal((await logistics(`/transport/trips/${potatoDeal}/pickup`, { code: pickup })).status, 200);
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: potatoDeal } })).status, "IN_TRANSIT");
    assert.equal((await karim(`/deals/${potatoDeal}/cancel`, { reason: "Too late to cancel" })).status, 409);
  });

  await test("delivery code → completed; both sides can review once", async () => {
    const del = (await prisma.deal.findUniqueOrThrow({ where: { id: potatoDeal } })).deliveryCode!;
    assert.equal((await logistics(`/transport/trips/${potatoDeal}/deliver`, { code: del })).status, 200);
    const d = (await hasan("/deals")).data.deals.find((x: any) => x.id === potatoDeal);
    assert.equal(d.status, "COMPLETED");
    assert.deepEqual(d.reviews.targets.map((t: any) => t.role).sort(), ["FARMER", "TRANSPORTER"]);
    const tId = d.reviews.targets.find((t: any) => t.role === "TRANSPORTER").id;
    assert.equal((await hasan(`/deals/${potatoDeal}/review`, { toId: tId, stars: 5, comment: "On time, careful loading." })).status, 200);
    assert.equal((await hasan(`/deals/${potatoDeal}/review`, { toId: tId, stars: 1, comment: "Changing my mind" })).status, 409);
    assert.equal((await karim(`/deals/${potatoDeal}/review`, { toId: ids.hasan, stars: 4, comment: "Paid on time." })).status, 200);
    const rv = (await logistics("/profile/reviews")).data;
    assert.ok(rv.count >= 1 && rv.avg >= 1);
  });

  await test("transporter cancels a confirmed trip → deal reopens for transport", async () => {
    const d2 = await newDeal("Potato", 1100);
    assert.equal((await logistics(`/transport/deals/${d2}/offers`, offer(await veh("Bogura-Ta 14-1177"), 2800, 30, 34))).status, 201);
    const o = (await hasan("/deals")).data.deals.find((x: any) => x.id === d2).transport.offers[0];
    assert.equal((await hasan(`/deals/${d2}/transport/${o.id}/accept`, {})).status, 200);
    assert.equal((await logistics(`/transport/trips/${d2}/cancel`, { reason: "Truck needs repair" })).status, 200);
    const d = (await hasan("/deals")).data.deals.find((x: any) => x.id === d2);
    assert.equal(d.status, "AWAITING_TRANSPORT"); assert.equal(d.transport.windowOpen, true);
    assert.ok((await boardIds(logistics)).includes(d2));
  });

  await test("no offers in the window → dealer is told and can extend once", async () => {
    const d3 = await newDeal("Potato", 900);
    assert.equal((await hasan(`/deals/${d3}/extend`, {})).status, 409); // still open
    await prisma.deal.update({ where: { id: d3 }, data: { transportWindowEndsAt: new Date(Date.now() - 1000) } });
    await sweep();
    assert.ok((await hasan("/notifications")).data.items.some((n: any) => n.title === "No transport offers"));
    assert.ok(!(await boardIds(logistics)).includes(d3));
    assert.equal((await hasan(`/deals/${d3}/extend`, {})).status, 200);
    assert.ok((await boardIds(logistics)).includes(d3));
    await prisma.deal.update({ where: { id: d3 }, data: { transportWindowEndsAt: new Date(Date.now() - 1000) } });
    assert.equal((await hasan(`/deals/${d3}/extend`, {})).status, 409);
  });

  await test("vehicle documents are private", async () => {
    const r = await fetch(API.replace("/api", "") + "/uploads/docs/x.png");
    assert.equal(r.status, 404);
  });

  console.log(`\n${pass} passed`);
} finally {
  await prisma.review.deleteMany({ where: { deal: { listingId: { in: created } } } });
  await prisma.deal.deleteMany({ where: { listingId: { in: created } } });
  await prisma.listing.deleteMany({ where: { id: { in: created } } });
  await prisma.notification.deleteMany({ where: { createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  await prisma.$disconnect();
}
