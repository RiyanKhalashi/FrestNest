// Interface language for farmers, dealers and transporters ("en" or "bn"). Admin pages always stay English.
// The choice lives in the browser (so it works before sign-in) and on the account (so it follows the user to the app and other devices).
export type Lang = "en" | "bn";

const KEY = "fn-lang";
const PENDING = "fn-lang-pending"; // chosen while signed out: copied to the account at the next sign-in

export function getLang(): Lang {
  try { return localStorage.getItem(KEY) === "bn" ? "bn" : "en"; } catch { return "en"; }
}

/** Saves the choice in this browser. `signedOut` marks it for copying to the account after sign-in. */
export function storeLang(l: Lang, signedOut = false) {
  try {
    localStorage.setItem(KEY, l);
    if (signedOut) localStorage.setItem(PENDING, "1"); else localStorage.removeItem(PENDING);
  } catch { /* private mode: the page still works in English */ }
}

export function hasPendingLang(): boolean {
  try { return localStorage.getItem(PENDING) === "1"; } catch { return false; }
}

export const isAdminPath = (path: string) => path === "/admin" || path.startsWith("/admin/");
