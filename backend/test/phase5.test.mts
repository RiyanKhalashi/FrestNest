// Phase 5 rule tests (admin office) against the running API.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db.js";

const API = "http://localhost:4000/api";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
async function session(phone: string, password = "freshnest123") {
  let cookie = "";
  const call = async (path: string, body?: unknown, method?: string) => {
    const isForm = body instanceof FormData;
    const r = await fetch(API + path, { method: method ?? (body ? "POST" : "GET"), headers: { ...(isForm ? {} : { "content-type": "application/json" }), cookie }, body: isForm ? body : body ? JSON.stringify(body) : undefined });
    const set = r.headers.get("set-cookie"); if (set) cookie = set.split(";")[0];
    return { status: r.status, data: (await r.json().catch(() => ({}))) as any };
  };
  const l = await call("/auth/login", { phone, password });
  return Object.assign(call, { ok: l.status === 200 });
}
let pass = 0;
async function test(name: string, fn: () => Promise<void>) { try { await fn(); pass++; console.log("  ✓", name); } catch (e) { console.log("  ✗", name); throw e; } }
const doc = (kind: string) => { const fd = new FormData(); fd.append("kind", kind); fd.append("file", new Blob([PNG], { type: "image/png" }), "id.png"); return fd; };

const nusrat = await session("01700000001"), tanvir = await session("01700000002"), mitu = await session("01700000003");
const karim = await session("01712345678"), hasan = await session("01811000001"), joyp = await session("01811000002");
const phone = "0187" + String(Date.now()).slice(-7);
const cleanupUsers: string[] = [];
const created: string[] = [];

console.log("Phase 5 rules");
try {
  let newDealer = "";
  await test("verification: new dealer uploads NID + trade licence → appears in A2; re-upload → pending again → approve", async () => {
    const anon = await session("00000000000", "x");
    const reg = await anon("/auth/register", { role: "DEALER", name: "New Dealer", phone, password: "password123", upazilaId: (await prisma.upazila.findFirstOrThrow({ where: { name: "Sherpur" } })).id, businessName: "Sherpur Traders" });
    assert.equal(reg.status, 201); newDealer = reg.data.user.id; cleanupUsers.push(newDealer);
    const nd = await session(phone, "password123");
    assert.equal((await nd("/profile/docs", doc("DRIVING_LICENSE"))).status, 400); // not for dealers
    assert.equal((await nd("/profile/docs", doc("NID"))).status, 201);
    assert.equal((await nd("/profile/docs", doc("TRADE_LICENSE"))).data.complete, true);
    assert.equal((await mitu("/admin/verification")).status, 403);
    const q = (await tanvir("/admin/verification")).data.users.find((u: any) => u.id === newDealer);
    assert.equal(q.complete, true);
    assert.equal((await tanvir(`/admin/verification/user/${newDealer}`, { action: "reupload" })).status, 400); // reason needed
    assert.equal((await tanvir(`/admin/verification/user/${newDealer}`, { action: "reupload", reason: "Blurry photo" })).status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: newDealer } })).status, "REUPLOAD");
    await nd("/profile/docs", doc("NID"));
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: newDealer } })).status, "PENDING");
    assert.equal((await tanvir(`/admin/verification/user/${newDealer}`, { action: "approve" })).status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: newDealer } })).status, "ACTIVE");
  });

  await test("ID documents are private (owner + admins)", async () => {
    const d = await prisma.verificationDoc.findFirstOrThrow({ where: { userId: newDealer } });
    const get = async (ph: string, pw = "freshnest123") => {
      const r = await fetch(API + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: ph, password: pw }) });
      return (await fetch(API.replace("/api", "") + d.file, { headers: { cookie: r.headers.get("set-cookie")!.split(";")[0] } })).status;
    };
    assert.equal(await get(phone, "password123"), 200); // owner
    assert.equal(await get("01700000002"), 200);         // admin
    assert.equal(await get("01712345678"), 404);         // anyone else
  });

  await test("case lock: a second admin is blocked while the first works; Super Admin can unlock", async () => {
    const v = await prisma.vehicle.create({ data: { ownerId: (await prisma.user.findUniqueOrThrow({ where: { phone: "01911000002" } })).id, type: "PICKUP", regNo: "TEST-" + Date.now(), capacityKg: 800, facility: "NORMAL" } });
    created.push(v.id);
    assert.equal((await tanvir(`/admin/locks/vehicle:${v.id}/take`, {})).status, 200);
    const blocked = await nusrat(`/admin/verification/vehicle/${v.id}`, { action: "approve" });
    assert.equal(blocked.status, 423); assert.match(blocked.data.error, /Being handled by Tanvir/);
    assert.equal((await mitu(`/admin/locks/vehicle:${v.id}/release`, {})).status, 403);
    assert.equal((await nusrat(`/admin/locks/vehicle:${v.id}/release`, {})).status, 200);
    assert.equal((await nusrat(`/admin/verification/vehicle/${v.id}`, { action: "approve" })).status, 200);
  });

  let reportId = "";
  await test("reports: only people who traded together; admin warns with a written reason", async () => {
    const deal = await prisma.deal.findFirstOrThrow({ where: { farmerId: (await prisma.user.findUniqueOrThrow({ where: { phone: "01712345678" } })).id, dealerId: (await prisma.user.findUniqueOrThrow({ where: { phone: "01811000002" } })).id } });
    assert.equal((await karim("/reports", { dealId: deal.id, againstId: (await prisma.user.findUniqueOrThrow({ where: { phone: "01811000001" } })).id, kind: "RUDE", details: "Hasan was not even in this deal" })).status, 404);
    const r = await karim("/reports", { dealId: deal.id, againstId: deal.dealerId, kind: "PRICE_CHANGED", details: "Asked for a lower price after the deal was made." });
    assert.equal(r.status, 201);
    assert.equal((await karim("/reports", { dealId: deal.id, againstId: deal.dealerId, kind: "PRICE_CHANGED", details: "Again the same complaint here." })).status, 409);
    assert.equal((await tanvir("/admin/cases")).data.reports.length, 0); // no REPORTS permission
    reportId = (await mitu("/admin/cases")).data.reports.find((x: any) => x.against.id === deal.dealerId && x.status === "OPEN").id;
    assert.equal((await mitu(`/admin/cases/report/${reportId}`, { action: "warn" })).status, 400);
    assert.equal((await mitu(`/admin/cases/report/${reportId}`, { action: "warn", reason: "Do not change the price after a deal" })).status, 200);
    const h = (await mitu(`/admin/users/${deal.dealerId}/history`)).data;
    assert.ok(h.warnings >= 1);
  });

  await test("review report → admin hides the review; it disappears from the profile", async () => {
    const rv = await prisma.review.findFirstOrThrow({ where: { to: { phone: "01712345678" } } });
    assert.equal((await karim("/reports", { reviewId: rv.id, kind: "FAKE_REVIEW", details: "This review is about a different lot." })).status, 201);
    const x = (await mitu("/admin/cases")).data.reports.find((r: any) => r.review?.id === rv.id && r.status === "OPEN");
    assert.equal((await mitu(`/admin/cases/report/${x.id}`, { action: "hide", reason: "Review does not match the deal" })).status, 200);
    assert.ok(!(await karim("/profile/reviews")).data.reviews.some((r: any) => r.id === rv.id));
    await prisma.review.update({ where: { id: rv.id }, data: { hidden: false } });
  });

  await test("suspend 7 days blocks new bids; ban needs the Super Admin to lift", async () => {
    const id = (await prisma.user.findUniqueOrThrow({ where: { phone: "01811000002" } })).id;
    assert.equal((await mitu(`/admin/users/${id}/suspend`, { days: 7, reason: "Three reports in a month" })).status, 200);
    // its own open nationwide bidding listing, so the test does not depend on the age of the demo data
    const l = await karim("/listings", { productId: (await prisma.product.findUniqueOrThrow({ where: { nameEn: "Potato" } })).id, category: "Vegetable", quantityKg: 1000, pricePerKg: 20, harvestDate: new Date(Date.now() + 3 * 86400_000).toISOString(), scope: "NATION", mode: "BID", bidEndsAt: new Date(Date.now() + 30 * 3600_000).toISOString() });
    assert.equal(l.status, 201, JSON.stringify(l.data)); created.push(l.data.listing.id);
    assert.equal((await joyp(`/market/${l.data.listing.id}/bid`, { pricePerKg: 99 })).status, 403);
    assert.equal((await mitu(`/admin/users/${id}/lift`, {})).status, 200);
    assert.equal((await mitu(`/admin/users/${id}/suspend`, { days: 0, reason: "Fraud confirmed by police" })).status, 200);
    assert.equal((await joyp("/auth/me")).status, 403); // banned accounts are blocked
    assert.equal((await mitu(`/admin/users/${id}/lift`, {})).status, 403);
    assert.equal((await nusrat(`/admin/users/${id}/lift`, {})).status, 200);
  });

  await test("cancel request (transport booked) → admin approves → deal cancelled, produce back on sale", async () => {
    // own deal: Karim → Hasan, truck booked
    const k = await prisma.user.findUniqueOrThrow({ where: { phone: "01712345678" } }), h = await prisma.user.findUniqueOrThrow({ where: { phone: "01811000001" } });
    const l = await prisma.listing.create({ data: { farmerId: k.id, productId: (await prisma.product.findUniqueOrThrow({ where: { nameEn: "Potato" } })).id, category: "Vegetable", quantityKg: 700, remainingKg: 0, pricePerKg: 20, harvestDate: new Date(), upazilaId: k.upazilaId!, scope: "DISTRICT", mode: "OWN", minResponseHours: 6, status: "SOLD" } });
    created.push(l.id);
    const d = await prisma.deal.create({ data: { listingId: l.id, farmerId: k.id, dealerId: h.id, quantityKg: 700, pricePerKg: 20, source: "OFFER", status: "TRANSPORT_CONFIRMED", pickupCode: "1111", deliveryCode: "2222" } });
    const truck = await prisma.vehicle.findUniqueOrThrow({ where: { regNo: "Bogura-Ta 14-0932" } });
    await prisma.transportOffer.create({ data: { dealId: d.id, transporterId: truck.ownerId, vehicleId: truck.id, price: 2000, pickupAt: new Date(Date.now() + 40 * 3600_000), deliverBy: new Date(Date.now() + 44 * 3600_000), status: "ACCEPTED" } });
    const s = hasan;
    assert.equal((await s(`/deals/${d.id}/cancel`, { reason: "Our shop is closed for repairs" })).data.requested, true);
    const c = (await tanvir("/admin/cases")).data.cancel.find((x: any) => x.deal.id === d.id && x.status === "PENDING");
    assert.equal((await tanvir(`/admin/cases/cancel/${c.id}`, { action: "approve", note: "Agreed; the farmer can relist" })).status, 200);
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: d.id } })).status, "CANCELLED");
    assert.equal((await prisma.transportOffer.findFirstOrThrow({ where: { dealId: d.id } })).status, "CANCELLED");
  });

  await test("code reset after 5 wrong tries", async () => {
    const d = await prisma.deal.findFirstOrThrow({ where: { listingId: { in: created } } });
    await prisma.deal.update({ where: { id: d.id }, data: { status: "IN_TRANSIT" } });
    await prisma.deal.update({ where: { id: d.id }, data: { codeAttempts: 5 } });
    assert.ok((await tanvir("/admin/cases")).data.codes.some((x: any) => x.id === d.id));
    assert.equal((await tanvir(`/admin/cases/codes/${d.id}/reset`, {})).status, 200);
    assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: d.id } })).codeAttempts, 0);
  });

  await test("products + suggestions + season calendar (Super Admin only)", async () => {
    assert.equal((await tanvir("/admin/products")).status, 403);
    const before = (await nusrat("/admin/products")).data;
    assert.equal((await nusrat("/admin/products", { nameEn: "Potato", nameBn: "আলু", category: "Vegetable", shelfLifeDays: 60, storage: "NORMAL" })).status, 409);
    assert.equal((await nusrat("/admin/seasons", { winter: [11, 12, 1], summer: [3, 4, 5], monsoon: [6, 7, 8, 9, 10] }, "PUT")).status, 400); // Feb missing
    assert.equal((await nusrat("/admin/seasons", before.seasons.reduce((o: any, s: any) => ({ ...o, [s.key]: s.monthsList }), {}), "PUT")).status, 200);
  });

  await test("announcements: reach by audience; sponsored only to opted-in farmers", async () => {
    await prisma.user.update({ where: { phone: "01712345678" }, data: { partnerOffers: true } });
    const all = (await mitu("/admin/announcements/reach?audience=role:FARMER")).data.reach;
    const sp = (await mitu("/admin/announcements/reach?audience=role:FARMER&sponsored=1")).data.reach;
    assert.ok(all >= 3 && sp >= 1 && sp < all);
    const r = await mitu("/admin/announcements", { title: "Tomato seed 15% off", body: "Before 30 November at partner shops.", audience: "role:FARMER", sponsor: "GreenSeed Bangladesh" });
    assert.equal(r.status, 201); assert.equal(r.data.reach, sp);
    assert.ok((await karim("/notifications")).data.items.some((n: any) => n.title.startsWith("Sponsored · GreenSeed")));
    assert.equal((await tanvir("/admin/announcements")).status, 403);
    await prisma.user.update({ where: { phone: "01712345678" }, data: { partnerOffers: false } });
  });

  await test("team: Super Admin adds an admin with permissions; settings; activity log", async () => {
    assert.equal((await tanvir("/admin/team")).status, 403);
    const ph = "0176" + String(Date.now()).slice(-7);
    assert.equal((await nusrat("/admin/team", { name: "Test Admin", phone: ph, password: "password123", permissions: ["ANALYTICS"] })).status, 201);
    const a = await prisma.user.findUniqueOrThrow({ where: { phone: ph } }); cleanupUsers.push(a.id);
    assert.equal((await nusrat(`/admin/team/${a.id}`, { permissions: ["ANALYTICS", "ANNOUNCE"] }, "PUT")).status, 200);
    assert.equal((await nusrat("/admin/settings", { smallPickupMaxKg: 300 }, "PUT")).status, 200);
    assert.equal((await nusrat("/admin/settings", { smallPickupMaxKg: -5 }, "PUT")).status, 400);
    assert.equal((await nusrat(`/admin/team/${a.id}`, undefined, "DELETE")).status, 200);
    const log = (await nusrat("/admin/log")).data.items.map((l: any) => l.action);
    assert.ok(log.includes("Added admin") && log.includes("Removed admin") && log.includes("Warned user"));
  });

  await test("overview counts + automatic alerts", async () => {
    const o = (await tanvir("/admin/overview")).data;
    assert.ok("verifyUsers" in o.counts && Array.isArray(o.alerts) && o.admins.length >= 3);
  });

  console.log(`\n${pass} passed`);
} finally {
  await prisma.vehicle.deleteMany({ where: { id: { in: created } } });
  await prisma.deal.deleteMany({ where: { listingId: { in: created } } });
  await prisma.listing.deleteMany({ where: { id: { in: created } } });
  await prisma.report.deleteMany({ where: { createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  await prisma.announcement.deleteMany({ where: { createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  await prisma.adminLog.deleteMany({ where: { createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  await prisma.notification.deleteMany({ where: { createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  await prisma.caseLock.deleteMany({});
  await prisma.user.deleteMany({ where: { id: { in: cleanupUsers } } });
  // if the suspension test stopped half-way, the demo dealer would stay suspended
  await prisma.user.update({ where: { phone: "01811000002" }, data: { status: "ACTIVE", suspendedUntil: null, statusReason: null } });
  await prisma.$disconnect();
}
