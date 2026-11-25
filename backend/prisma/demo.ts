// Demo marketplace data (npm run demo -w server).
// CLEARS all listings, bids, offers, deals and notifications, then adds a small realistic market.
import { prisma } from "../src/lib/db.js";

const H = 3600_000, D = 24 * H;
const at = (ms: number) => new Date(Date.now() + ms);
const day6am = (days: number) => { const d = new Date(Date.now() + days * D); d.setHours(6, 0, 0, 0); return d; };

async function main() {
  await prisma.notification.deleteMany();
  await prisma.listing.updateMany({ data: { failureId: null } });
  await prisma.deliveryFailure.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Listing_code_seq" RESTART WITH 1001`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Deal_code_seq" RESTART WITH 1001`);

  const u = async (phone: string) => prisma.user.findUniqueOrThrow({ where: { phone } });
  const p = async (name: string) => prisma.product.findUniqueOrThrow({ where: { nameEn: name } });
  const dist = async (name: string) => prisma.district.findUniqueOrThrow({ where: { name } });
  const [karim, selina, jalal, hasan, joyp, kawran] = await Promise.all(["01712345678", "01712000002", "01712000003", "01811000001", "01811000002", "01811000003"].map(u));
  const [tomato, potato, brinjal, chili, cauli, lalshak] = await Promise.all(["Tomato", "Potato", "Brinjal", "Green chili", "Cauliflower", "Lal shak"].map(p));
  const [joypurhat, gaibandha] = await Promise.all([dist("Joypurhat"), dist("Gaibandha")]);
  const shajahanpur = await prisma.upazila.findFirstOrThrow({ where: { name: "Shajahanpur" } });
  const gabtali = await prisma.upazila.findFirstOrThrow({ where: { name: "Gabtali" } });

  // 1. Karim · tomato · bidding within district + Joypurhat, two bids
  const t = await prisma.listing.create({ data: {
    farmerId: karim.id, productId: tomato.id, category: "Vegetable", quantityKg: 1000, remainingKg: 1000, pricePerKg: 24, harvestDate: day6am(2),
    upazilaId: karim.upazilaId!, scope: "DISTRICT", targetDistricts: { connect: [{ id: joypurhat.id }] }, mode: "BID", bidEndsAt: at(20 * H), minIncrement: 0.5, buyNowPrice: 32,
    description: "BARI Tomato-15, hand-picked, packed in 25 kg crates.",
  } });
  await prisma.bid.create({ data: { listingId: t.id, dealerId: joyp.id, pricePerKg: 25, createdAt: at(-3 * H) } });
  await prisma.bid.create({ data: { listingId: t.id, dealerId: hasan.id, pricePerKg: 26.5, createdAt: at(-1 * H) } });

  // 2. Karim · potato · own price nationwide, one pending offer from Kawran Bazar
  const pt = await prisma.listing.create({ data: {
    farmerId: karim.id, productId: potato.id, category: "Vegetable", quantityKg: 2000, remainingKg: 2000, pricePerKg: 22, unit: "MON", harvestDate: day6am(-1),
    upazilaId: karim.upazilaId!, scope: "NATION", mode: "OWN", minOrderKg: 200, minResponseHours: 6, description: "Diamond variety, cured for 10 days.",
  } });
  await prisma.offer.create({ data: { listingId: pt.id, dealerId: kawran.id, quantityKg: 800, pricePerKg: 21, expiresAt: at(9 * H), note: "Can collect on Saturday." } });

  // 3. Karim · lal shak · only my upazila + neighbours (fast-spoiling)
  await prisma.listing.create({ data: {
    farmerId: karim.id, productId: lalshak.id, category: "Vegetable", quantityKg: 150, remainingKg: 150, pricePerKg: 26, harvestDate: day6am(1),
    upazilaId: karim.upazilaId!, scope: "UPAZILA", targetUpazilas: { connect: [{ id: shajahanpur.id }, { id: gabtali.id }] }, mode: "OWN", minResponseHours: 2,
  } });

  // 4. Selina (Gaibandha) · brinjal · bidding within Gaibandha + Bogura
  const bogura = await dist("Bogura");
  const b = await prisma.listing.create({ data: {
    farmerId: selina.id, productId: brinjal.id, category: "Vegetable", quantityKg: 400, remainingKg: 400, pricePerKg: 30, harvestDate: day6am(1),
    upazilaId: selina.upazilaId!, scope: "DISTRICT", targetDistricts: { connect: [{ id: bogura.id }] }, mode: "BID", bidEndsAt: at(14 * H), minIncrement: 1,
  } });
  await prisma.bid.create({ data: { listingId: b.id, dealerId: hasan.id, pricePerKg: 31, createdAt: at(-5 * H) } });
  await prisma.bid.create({ data: { listingId: b.id, dealerId: joyp.id, pricePerKg: 32, createdAt: at(-2 * H) } });

  // 5. Selina · green chili · own price, Gaibandha + Bogura
  await prisma.listing.create({ data: {
    farmerId: selina.id, productId: chili.id, category: "Vegetable", quantityKg: 500, remainingKg: 500, pricePerKg: 55, harvestDate: day6am(0),
    upazilaId: selina.upazilaId!, scope: "DISTRICT", targetDistricts: { connect: [{ id: bogura.id }] }, mode: "OWN", minResponseHours: 6,
  } });

  // 6. Jalal (Rangpur) · cauliflower · nationwide bidding (ventilated for long trips)
  await prisma.listing.create({ data: {
    farmerId: jalal.id, productId: cauli.id, category: "Vegetable", quantityKg: 700, remainingKg: 700, pricePerKg: 28, harvestDate: day6am(3),
    upazilaId: jalal.upazilaId!, scope: "NATION", mode: "BID", bidEndsAt: at(40 * H), minIncrement: 0.5, buyNowPrice: 36,
  } });

  // 7. A finished deal: Jalal's potato bought by Hasan with Buy Now
  const sold = await prisma.listing.create({ data: {
    farmerId: jalal.id, productId: potato.id, category: "Vegetable", quantityKg: 1500, remainingKg: 0, pricePerKg: 19, harvestDate: day6am(-2),
    upazilaId: jalal.upazilaId!, scope: "NATION", mode: "BID", bidEndsAt: at(-6 * H), buyNowPrice: 23, status: "SOLD", closedAt: at(-8 * H), createdAt: at(-30 * H),
  } });
  await prisma.deal.create({ data: { listingId: sold.id, farmerId: jalal.id, dealerId: hasan.id, quantityKg: 1500, pricePerKg: 23, source: "BUY_NOW", createdAt: at(-8 * H) } });

  void gaibandha;

  // ---------- transport (Phase 3) ----------
  const [rafiq, cold] = await Promise.all(["01911000001", "01911000003"].map(u));
  const v = async (reg: string) => prisma.vehicle.findUniqueOrThrow({ where: { regNo: reg } });
  const [truck1, truck2, van, reefer] = await Promise.all(["Bogura-Ta 14-0932", "Bogura-Ta 14-1177", "Bogura-Ma 11-2245", "Dhaka-Ta 22-7781"].map(v));
  const deal7 = await prisma.deal.findFirstOrThrow({ where: { listingId: sold.id } });
  const at7 = (days: number, h: number) => { const d = new Date(Date.now() + days * D); d.setHours(h, 0, 0, 0); return d; };
  // a) Jalal's potato: two offers waiting for Hasan to choose
  await prisma.transportOffer.create({ data: { dealId: deal7.id, transporterId: rafiq.id, vehicleId: truck1.id, price: 5200, pickupAt: at7(1, 7), deliverBy: at7(1, 13), note: "Tarpaulin and 2 loaders included." } });
  await prisma.transportOffer.create({ data: { dealId: deal7.id, transporterId: cold.id, vehicleId: reefer.id, price: 7800, pickupAt: at7(1, 9), deliverBy: at7(1, 14) } });

  // helper: a sold listing + deal in a given transport stage
  async function stage(farmer: typeof karim, dealer: typeof hasan, prod: typeof potato, qty: number, price: number, extra: Record<string, unknown>, harvestDaysAgo = 1) {
    const l = await prisma.listing.create({ data: { farmerId: farmer.id, productId: prod.id, category: "Vegetable", quantityKg: qty, remainingKg: 0, pricePerKg: price, harvestDate: day6am(-harvestDaysAgo), upazilaId: farmer.upazilaId!, scope: "DISTRICT", mode: "OWN", minResponseHours: 6, status: "SOLD", closedAt: at(-30 * H), createdAt: at(-50 * H) } });
    return prisma.deal.create({ data: { listingId: l.id, farmerId: farmer.id, dealerId: dealer.id, quantityKg: qty, pricePerKg: price, source: "OFFER", createdAt: at(-30 * H), ...extra } });
  }
  // b) Karim's brinjal → Hasan: transport confirmed, pickup tomorrow morning (codes ready)
  const dB = await stage(karim, hasan, brinjal, 600, 34, { status: "TRANSPORT_CONFIRMED", pickupCode: "4826", deliveryCode: "7390" });
  await prisma.transportOffer.create({ data: { dealId: dB.id, transporterId: rafiq.id, vehicleId: van.id, price: 2400, pickupAt: at7(1, 5), deliverBy: at7(1, 9), status: "ACCEPTED" } });
  // c) Selina's tomato → Hasan: on the road
  const dC = await stage(selina, hasan, tomato, 900, 27, { status: "IN_TRANSIT", pickupCode: "1158", deliveryCode: "6043", pickedUpAt: at(-2 * H) });
  await prisma.transportOffer.create({ data: { dealId: dC.id, transporterId: rafiq.id, vehicleId: truck2.id, price: 3600, pickupAt: at(-2.5 * H), deliverBy: at(2 * H), status: "ACCEPTED" } });
  // d) Karim's potato → Joypurhat Fresh: completed last week, with reviews
  const dD = await stage(karim, joyp, potato, 1200, 21, { status: "COMPLETED", pickupCode: "2201", deliveryCode: "9917", pickedUpAt: at(-6 * D), deliveredAt: at(-6 * D + 5 * H), createdAt: at(-7 * D) });
  await prisma.transportOffer.create({ data: { dealId: dD.id, transporterId: rafiq.id, vehicleId: truck1.id, price: 3100, pickupAt: at(-6 * D), deliverBy: at(-6 * D + 6 * H), status: "ACCEPTED" } });
  await prisma.review.createMany({ data: [
    { dealId: dD.id, fromId: joyp.id, toId: karim.id, stars: 5, comment: "Clean, well-sorted potatoes and the weight was exact.", createdAt: at(-6 * D + 6 * H) },
    { dealId: dD.id, fromId: karim.id, toId: joyp.id, stars: 4, comment: "Fair price, paid on time.", createdAt: at(-6 * D + 7 * H) },
    { dealId: dD.id, fromId: joyp.id, toId: rafiq.id, stars: 5, comment: "Arrived early and unloaded carefully.", createdAt: at(-6 * D + 6 * H) },
    { dealId: dD.id, fromId: karim.id, toId: rafiq.id, stars: 4, comment: "Loading started a little late because of fog.", createdAt: at(-6 * D + 7 * H) },
  ] });

  // ---------- delivery failure (Phase 4): Karim's chili to Dhaka, van stuck at Shahjadpur, waiting for an admin ----------
  const dE = await stage(karim, kawran, chili, 400, 60, { status: "FAILURE_REQUESTED", pickupCode: "3318", deliveryCode: "8462", pickedUpAt: at(-5 * H), emergencyAuto: false }, 3);
  await prisma.transportOffer.create({ data: { dealId: dE.id, transporterId: rafiq.id, vehicleId: van.id, price: 6800, pickupAt: at(-5.5 * H), deliverBy: at(3 * H), status: "ACCEPTED" } });
  const shahjadpur = await prisma.upazila.findFirstOrThrow({ where: { name: "Shahjadpur" } });
  await prisma.deliveryFailure.create({ data: { dealId: dE.id, reportedById: rafiq.id, upazilaId: shahjadpur.id, locationNote: "Dhaka–Bogura highway near Hatikumrul", reason: "BREAKDOWN", details: "Gearbox failed; mechanic says 2 days for the part.", condition: "GOOD", usableKg: 380, canMove: false, createdAt: at(-12 * 60_000) } });

  // ---------- admin demo (Phase 5) ----------
  // "Suggested by farmers": a product that is not in the list
  for (const [f, qty] of [[karim, 120], [selina, 80]] as const) {
    await prisma.listing.create({ data: { farmerId: f.id, customName: "Kochur loti", customShelfLife: 3, customStorage: "NORMAL", category: "Vegetable", quantityKg: qty, remainingKg: qty, pricePerKg: 40, harvestDate: day6am(1), upazilaId: f.upazilaId!, scope: "DISTRICT", mode: "OWN", minResponseHours: 6 } });
  }
  // automatic alert: Joypurhat Fresh cancelled 3 deals this month
  for (let i = 0; i < 3; i++) await stage(karim, joyp, tomato, 300 + i * 50, 28, { status: "CANCELLED", cancelledBy: "DEALER", cancelReason: ["Our truck broke down", "Market price dropped", "Shop closed for a family event"][i], cancelledAt: at(-(i + 2) * D) });

  console.log("Demo market ready: 7 listings, 4 bids, 1 offer, deals in every transport stage, reviews, 1 delivery failure waiting for an admin.");
}

main().finally(() => prisma.$disconnect());
