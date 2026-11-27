// English → Bangla for what the user sees. Pages are written in English; in Bangla mode the Translator
// component passes every visible text through tr(). Lookup order: exact phrase, pattern (for sentences
// with names and numbers), product and place names, then units, months and digits.
import { EXACT, BUTTON, makePatterns, type Pattern } from "./bn";

let PATTERNS: Pattern[] | null = null;

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
/** Digits become Bangla, except inside words such as a password ("freshnest123"). */
export const bnDigits = (s: string) => s.replace(/(?<![A-Za-z0-9])[0-9]+(?![A-Za-z0-9])/g, (n) => n.replace(/[0-9]/g, (d) => BN_DIGITS[+d]));

/** Product, district and upazila names (English → Bangla), loaded from the API. */
let NAMES: Record<string, string> = {};
export function setNames(m: Record<string, string>) { NAMES = m; }

/** A phrase or name on its own: exact phrase, then name, else unchanged. Used for pattern parts. */
export function part(s: string): string {
  const t = s.trim();
  if (!t) return s;
  const hit = EXACT[t] ?? NAMES[t] ?? matchPattern(t);
  if (hit !== null && hit !== undefined) return s.replace(t, hit);
  if (t.startsWith("· ")) return "· " + part(t.slice(2));
  const br = t.match(/^\((.+)\)$/);
  if (br) return "(" + part(br[1]) + ")";
  // "Bogura Sadar, Bogura" or "Tomato · 900 kg"
  for (const sep of [", ", " · "]) if (t.includes(sep)) return t.split(sep).map(part).join(sep);
  return s;
}

function matchPattern(s: string): string | null {
  PATTERNS ??= makePatterns(part);
  for (const [re, to] of PATTERNS) {
    const m = s.match(re);
    if (m) return typeof to === "string" ? s.replace(re, to) : to(m);
  }
  return null;
}

/** Translation of a whole phrase, or null when nothing in the dictionary fits. */
export function lookup(s: string): string | null {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return EXACT[t] ?? NAMES[t] ?? matchPattern(t);
}

const LONG: Record<string, string> = {
  January: "জানুয়ারি", February: "ফেব্রুয়ারি", March: "মার্চ", April: "এপ্রিল", June: "জুন", July: "জুলাই", August: "আগস্ট", September: "সেপ্টেম্বর", October: "অক্টোবর", November: "নভেম্বর", December: "ডিসেম্বর",
  Monday: "সোমবার", Tuesday: "মঙ্গলবার", Wednesday: "বুধবার", Thursday: "বৃহস্পতিবার", Friday: "শুক্রবার", Saturday: "শনিবার", Sunday: "রবিবার",
  Mon: "সোম", Tue: "মঙ্গল", Wed: "বুধ", Thu: "বৃহস্পতি", Fri: "শুক্র", Sat: "শনি", Sun: "রবি",
};
const MONTHS: Record<string, string> = { Jan: "জানু", Feb: "ফেব্রু", Mar: "মার্চ", Apr: "এপ্রিল", May: "মে", Jun: "জুন", Jul: "জুলাই", Aug: "আগস্ট", Sep: "সেপ্টে", Oct: "অক্টো", Nov: "নভে", Dec: "ডিসে" };

/** Units, months, time words and digits: applied to every text in Bangla mode. */
export function finish(s: string): string {
  return bnDigits(s
    .replace(/(\d)\s?kg\b/g, "$1 কেজি").replace(/\bkg\b/g, "কেজি")
    .replace(/(\d)\s?mon\b/g, "$1 মণ").replace(/\bmon\b/g, "মণ")
    .replace(/(\d)\s?tons?\b/g, "$1 টন").replace(/\bton\b/g, "টন").replace(/(\d) t\b/g, "$1 টন")
    .replace(/(\d)\s?h\b/g, "$1 ঘণ্টা").replace(/(\d)\s?min\b/g, "$1 মিনিট")
    .replace(/(\d)d (\d)/g, "$1 দিন $2").replace(/(\d)h (\d)/g, "$1 ঘণ্টা $2").replace(/(\d)m (\d)/g, "$1 মিনিট $2")
    .replace(/(\d)m\b/g, "$1 মিনিট").replace(/(\d)s\b/g, "$1 সেকেন্ড").replace(/(\d)d\b/g, "$1 দিন")
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b(?=\s?\d|,)|(?<=\d\s?)\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m) => MONTHS[m] ?? m)
    .replace(/(\d)\s?am\b/gi, "$1 এএম").replace(/(\d)\s?pm\b/gi, "$1 পিএম")
    .replace(/\b(January|February|March|April|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g, (m) => LONG[m])
    .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b(?= \d)/g, (m) => LONG[m])
    .replace(/\bDealer #(\d+)/g, "ডিলার #$1"));
}

/** Full translation of one text, keeping its outer spaces. On a button, action words use the verb form. */
export function tr(s: string, onButton = false): string {
  if (onButton) { const b = BUTTON[s.trim()]; if (b) return s.replace(s.trim(), b); }
  if (!/[A-Za-z0-9]/.test(s)) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  const body = m[2];
  let out = lookup(body);
  if (out === null) {
    const t = body.replace(/\s+/g, " ");
    out = part(t);
    // English written by a user (a note, a reason, a review) stays as it is, numbers included
    const words = t.replace(/\b(kg|mon|ton|am|pm|FN|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g, "");
    if (out === t && /\b[A-Za-z]{3,}\b[\s\S]*\b[A-Za-z]{3,}\b/.test(words)) return s;
  }
  return m[1] + finish(out) + m[3];
}
