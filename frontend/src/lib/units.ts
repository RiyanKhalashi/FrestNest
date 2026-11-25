// Listing display units (docs/decisions/fyp-units.md). The API always works in kg; these convert for display and input.
export type Unit = "KG" | "MON" | "TON";
export const UNITS: Unit[] = ["KG", "MON", "TON"];
export const UNIT_KG: Record<Unit, number> = { KG: 1, MON: 40, TON: 1000 };
export const UNIT_LABEL: Record<Unit, string> = { KG: "kg", MON: "mon", TON: "ton" };
export const UNIT_HINT: Record<Unit, string> = { KG: "kilogram", MON: "40 kg", TON: "1,000 kg" };

const n2 = (v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 2 });

/** 1200 kg → "30 mon" */
export const qty = (kg: number, u: Unit = "KG") => n2(kg / UNIT_KG[u]) + " " + UNIT_LABEL[u];
/** price per kg → "৳880" (whole taka for mon/ton, 2 decimals for kg) */
export const price = (perKg: number | null | undefined, u: Unit = "KG") =>
  perKg === null || perKg === undefined ? "—"
    : "৳" + (perKg * UNIT_KG[u]).toLocaleString("en-IN", u === "KG" ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 });
/** "৳880/mon" */
export const per = (perKg: number | null | undefined, u: Unit = "KG") => (perKg === null || perKg === undefined ? "—" : price(perKg, u) + "/" + UNIT_LABEL[u]);

/** user input in the unit → whole kg / price per kg (2 decimals) for the API */
export const toKg = (v: number, u: Unit) => Math.round(v * UNIT_KG[u]);
export const toPerKg = (v: number, u: Unit) => Math.round((v / UNIT_KG[u]) * 100) / 100;
/** API values → input values in the unit */
export const fromKg = (kg: number, u: Unit) => Math.round((kg / UNIT_KG[u]) * 100) / 100;
export const fromPerKg = (p: number, u: Unit) => (u === "KG" ? p : Math.round(p * UNIT_KG[u]));
/** a minimum price per kg shown in the unit, rounded up so it still meets the minimum after converting back */
export const fromPerKgUp = (p: number, u: Unit) => (u === "KG" ? p : Math.ceil(Math.round(p * UNIT_KG[u] * 100) / 100));
