// Seed: locations, products, admins and demo users from the agreed scenario.
// Run: npm run seed -w server   (safe to run again; it upserts)
import bcrypt from "bcryptjs";
import { prisma } from "../src/db.js";
import type { Role, AdminPermission, StorageNeed } from "../src/generated/prisma/client.js";

const UPAZILAS: Record<string, string[]> = {
  Bogura: ["Bogura Sadar", "Shibganj", "Sherpur", "Shajahanpur", "Gabtali", "Kahaloo", "Nandigram", "Dhunat", "Sonatala", "Sariakandi", "Adamdighi", "Dhupchanchia"],
  Gaibandha: ["Gaibandha Sadar", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj", "Phulchhari"],
  Joypurhat: ["Joypurhat Sadar", "Panchbibi", "Akkelpur", "Kalai", "Khetlal"],
  Rangpur: ["Rangpur Sadar", "Pirganj", "Mithapukur", "Badarganj", "Gangachara", "Kaunia", "Pirgachha", "Taraganj"],
  Sirajganj: ["Sirajganj Sadar", "Ullapara", "Shahjadpur", "Belkuchi", "Raiganj", "Tarash", "Kazipur", "Chauhali", "Kamarkhanda"],
  Dhaka: ["Tejgaon"],
};
const DISTRICT_BN: Record<string, string> = { Bogura: "বগুড়া", Gaibandha: "গাইবান্ধা", Joypurhat: "জয়পুরহাট", Rangpur: "রংপুর", Sirajganj: "সিরাজগঞ্জ", Dhaka: "ঢাকা" };

const PRODUCTS: [string, string, string, number, StorageNeed, boolean][] = [
  ["Potato", "আলু", "Vegetable", 60, "NORMAL", false],
  ["Tomato", "টমেটো", "Vegetable", 7, "NORMAL", true],
  ["Cauliflower", "ফুলকপি", "Vegetable", 6, "VENTILATED", true],
  ["Brinjal", "বেগুন", "Vegetable", 5, "NORMAL", false],
  ["Green chili", "কাঁচা মরিচ", "Vegetable", 5, "VENTILATED", true],
  ["Lal shak", "লাল শাক", "Vegetable", 2, "NORMAL", false],
  ["Strawberry", "স্ট্রবেরি", "Fruit", 3, "REFRIGERATED", false],
  ["Mango", "আম", "Fruit", 7, "VENTILATED", false],
];

type U = { phone: string; name: string; role: Role; district: string; upazila: string; village?: string; business?: string; superAdmin?: boolean; perms?: AdminPermission[] };
const USERS: U[] = [
  { phone: "01700000001", name: "Nusrat Jahan", role: "ADMIN", district: "Bogura", upazila: "Bogura Sadar", superAdmin: true },
  { phone: "01700000002", name: "Tanvir Ahmed", role: "ADMIN", district: "Bogura", upazila: "Bogura Sadar", perms: ["VERIFY", "DEALS"] },
  { phone: "01700000003", name: "Mitu Rahman", role: "ADMIN", district: "Bogura", upazila: "Bogura Sadar", perms: ["REPORTS", "ANNOUNCE", "ANALYTICS"] },
  { phone: "01712345678", name: "Karim Uddin", role: "FARMER", district: "Bogura", upazila: "Bogura Sadar", village: "Shakharia" },
  { phone: "01712000002", name: "Selina Begum", role: "FARMER", district: "Gaibandha", upazila: "Gobindaganj" },
  { phone: "01712000003", name: "Jalal Mia", role: "FARMER", district: "Rangpur", upazila: "Mithapukur" },
  { phone: "01811000001", name: "Hasan Ali", role: "DEALER", district: "Bogura", upazila: "Bogura Sadar", business: "Hasan Traders" },
  { phone: "01811000002", name: "Rubel Hossain", role: "DEALER", district: "Joypurhat", upazila: "Joypurhat Sadar", business: "Joypurhat Fresh" },
  { phone: "01811000003", name: "Shafiq Ahmed", role: "DEALER", district: "Dhaka", upazila: "Tejgaon", business: "Kawran Bazar Agro" },
  { phone: "01911000001", name: "Rafiq Islam", role: "TRANSPORTER", district: "Bogura", upazila: "Bogura Sadar", business: "Bogura Logistics" },
  { phone: "01911000002", name: "Mintu Mia", role: "TRANSPORTER", district: "Bogura", upazila: "Bogura Sadar", business: "Mintu Pickup" },
  { phone: "01911000003", name: "Sohel Rana", role: "TRANSPORTER", district: "Bogura", upazila: "Shibganj", business: "Cold Line BD" },
];
export const DEMO_PASSWORD = "freshnest123";

async function main() {
  for (const [d, ups] of Object.entries(UPAZILAS)) {
    const district = await prisma.district.upsert({ where: { name: d }, update: {}, create: { name: d, nameBn: DISTRICT_BN[d] } });
    for (const u of ups) {
      await prisma.upazila.upsert({ where: { districtId_name: { districtId: district.id, name: u } }, update: {}, create: { name: u, districtId: district.id } });
    }
  }
  for (const [nameEn, nameBn, category, shelfLifeDays, storage, ventilatedForLongTrips] of PRODUCTS) {
    await prisma.product.upsert({ where: { nameEn }, update: {}, create: { nameEn, nameBn, category, shelfLifeDays, storage, ventilatedForLongTrips } });
  }
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of USERS) {
    const district = await prisma.district.findUniqueOrThrow({ where: { name: u.district } });
    const upazila = await prisma.upazila.findUniqueOrThrow({ where: { districtId_name: { districtId: district.id, name: u.upazila } } });
    await prisma.user.upsert({
      where: { phone: u.phone },
      update: {},
      create: {
        phone: u.phone, name: u.name, role: u.role, passwordHash: hash, status: "ACTIVE",
        districtId: district.id, upazilaId: upazila.id, village: u.village, businessName: u.business,
        isSuperAdmin: !!u.superAdmin, permissions: u.perms ?? [],
      },
    });
  }
  // neighbours (both directions) for visibility quick-select and "nearest first"
  const DN: Record<string, string[]> = { Bogura: ["Joypurhat", "Gaibandha", "Sirajganj"], Gaibandha: ["Rangpur", "Joypurhat"], Sirajganj: ["Dhaka"] };
  for (const [a, bs] of Object.entries(DN)) for (const b of bs) {
    await prisma.district.update({ where: { name: a }, data: { neighbours: { connect: { name: b } } } });
    await prisma.district.update({ where: { name: b }, data: { neighbours: { connect: { name: a } } } });
  }
  const UN: Record<string, string[]> = {
    "Bogura Sadar": ["Shajahanpur", "Gabtali", "Shibganj", "Kahaloo", "Sariakandi"], Shibganj: ["Sonatala", "Gabtali", "Kahaloo", "Dhupchanchia"],
    Sherpur: ["Shajahanpur", "Dhunat"], Shajahanpur: ["Dhunat", "Nandigram", "Kahaloo"], Gabtali: ["Sariakandi", "Sonatala", "Dhunat"],
    Kahaloo: ["Dhupchanchia", "Adamdighi", "Nandigram"], Nandigram: ["Adamdighi"], Dhunat: ["Sariakandi"], Sonatala: ["Sariakandi"], Adamdighi: ["Dhupchanchia"],
  };
  const bogura = await prisma.district.findUniqueOrThrow({ where: { name: "Bogura" } });
  const uid = async (n: string) => (await prisma.upazila.findUniqueOrThrow({ where: { districtId_name: { districtId: bogura.id, name: n } } })).id;
  for (const [a, bs] of Object.entries(UN)) for (const b of bs) {
    const [ia, ib] = [await uid(a), await uid(b)];
    await prisma.upazila.update({ where: { id: ia }, data: { neighbours: { connect: { id: ib } } } });
    await prisma.upazila.update({ where: { id: ib }, data: { neighbours: { connect: { id: ia } } } });
  }

  const defaults: Record<string, unknown> = {
    minBiddingHoursDistrict: 12, minBiddingHoursNationwide: 24, transportOfferWindowHours: 12,
    resaleShelfLeftPercent: 40, emergencyEscalateMinutes: 60, failureAlertMinutes: 30, lockIdleMinutes: 15,
    smallPickupMaxKg: 300, subscriptionFeePerUpazila: 1500,
  };
  await prisma.setting.deleteMany({ where: { key: "minFirstBidPercent" } }); // renamed
  for (const [key, value] of Object.entries(defaults)) await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value: value as never } });
  // vehicles from the scenario (already checked by an admin)
  const VEH: [string, "PICKUP" | "MINI_TRUCK" | "TRUCK" | "COVERED_VAN", string, number, StorageNeed][] = [
    ["01911000001", "TRUCK", "Bogura-Ta 14-0932", 3000, "NORMAL"], ["01911000001", "TRUCK", "Bogura-Ta 14-1177", 3000, "NORMAL"], ["01911000001", "COVERED_VAN", "Bogura-Ma 11-2245", 2000, "VENTILATED"],
    ["01911000002", "PICKUP", "Bogura-Na 12-4410", 1000, "NORMAL"],
    ["01911000003", "TRUCK", "Dhaka-Ta 22-7781", 5000, "REFRIGERATED"],
  ];
  for (const [phone, type, regNo, capacityKg, facility] of VEH) {
    const owner = await prisma.user.findUniqueOrThrow({ where: { phone } });
    await prisma.vehicle.upsert({ where: { regNo }, update: {}, create: { ownerId: owner.id, type, regNo, capacityKg, facility, status: "APPROVED" } });
  }
  // agri companies (business model: monthly upazila report + sponsored announcements)
  const ups = async (names: string[]) => (await prisma.upazila.findMany({ where: { name: { in: names } }, select: { id: true } })).map((u) => u.id);
  const COS: [string, string, string[], number | null][] = [
    ["GreenSeed Bangladesh", "Seed", ["Bogura Sadar", "Shajahanpur", "Gaibandha Sadar", "Joypurhat Sadar"], null],
    ["Krishi Sar Ltd.", "Fertiliser", ["Bogura Sadar", "Shibganj", "Sherpur", "Shajahanpur", "Gabtali", "Kahaloo", "Nandigram", "Dhunat", "Sonatala", "Sariakandi", "Adamdighi", "Dhupchanchia"], null],
    ["Agro Cold Chain", "Cold storage", ["Shibganj", "Kahaloo", "Panchbibi", "Pirganj", "Gobindaganj"], null],
    ["FarmTools BD", "Equipment", ["Ullapara", "Shahjadpur"], 14],
  ];
  for (const [name, sells, upNames, trialDays] of COS) {
    await prisma.company.upsert({ where: { name }, update: {}, create: { name, sells, upazilaIds: await ups(upNames), trialUntil: trialDays ? new Date(Date.now() + trialDays * 86400_000) : null } });
  }
  const counts = await Promise.all([prisma.district.count(), prisma.upazila.count(), prisma.product.count(), prisma.user.count()]);
  console.log(`Seeded: ${counts[0]} districts, ${counts[1]} upazilas, ${counts[2]} products, ${counts[3]} users. Demo password: ${DEMO_PASSWORD}`);
}

main().finally(() => prisma.$disconnect());
