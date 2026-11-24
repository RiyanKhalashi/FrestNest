// Listing display units (docs/decisions/fyp-units.md). Amounts are stored in kg; text is shown in the farmer's unit.
import type { Unit } from "./generated/prisma/client.js";

export const UNIT_KG: Record<Unit, number> = { KG: 1, MON: 40, TON: 1000 };
const LABEL: Record<Unit, string> = { KG: "kg", MON: "mon", TON: "ton" };

/** "1,200 kg" / "30 mon" / "1.5 ton" */
export function qtyText(kg: number, unit: Unit = "KG") {
  const v = kg / UNIT_KG[unit];
  return v.toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " " + LABEL[unit];
}

/** "৳22.00/kg" / "৳880/mon" (whole taka for mon and ton) */
export function priceText(perKg: number, unit: Unit = "KG") {
  const v = perKg * UNIT_KG[unit];
  return "৳" + v.toLocaleString("en-IN", unit === "KG" ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 }) + "/" + LABEL[unit];
}
