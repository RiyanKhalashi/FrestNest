// Adds the products from products.ts that a database does not have yet.
// Existing products (and any admin edits to them) are left unchanged.
// Run: npx tsx prisma/seed-products.ts   (uses DATABASE_URL)
import { prisma } from "../src/lib/db.js";
import { PRODUCTS, MON_PRODUCTS } from "./products.js";

let added = 0;
for (const [nameEn, nameBn, category, shelfLifeDays, storage, ventilatedForLongTrips] of PRODUCTS) {
  if (await prisma.product.findUnique({ where: { nameEn } })) continue;
  await prisma.product.create({ data: { nameEn, nameBn, category, shelfLifeDays, storage, ventilatedForLongTrips, defaultUnit: MON_PRODUCTS.includes(nameEn) ? "MON" : "KG" } });
  added++;
}
console.log(`Added ${added} products; the list now has ${await prisma.product.count()}.`);
await prisma.$disconnect();
