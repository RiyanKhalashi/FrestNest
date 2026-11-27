// Takes the Chapter 5 screenshots from the live website with Google Chrome and saves them in screenshots/.
// It only opens pages (and picks a role on the register form); it never submits a form or changes data.
// Admin case and failure details are not opened, because opening one takes a case lock.
//   npm run screenshots              all screenshots
//   npm run screenshots farmer-home  only the named ones

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "screenshots");
const SITE = process.env.SITE ?? "https://freshnest-bd.vercel.app";
const PASSWORD = "freshnest123"; // the public demo accounts
const ACCOUNTS = { farmer: "01712345678", dealer: "01811000001", transporter: "01911000001", admin: "01700000001" };
const only = process.argv.slice(2);

// [file name, account or null, page path or async (api) => path, options]
const SHOTS = [
  ["landing", null, "/"],
  ["login", null, "/login"],
  ["register", null, "/register", { click: /^Dealer/ }],
  ["farmer-home", "farmer", "/farmer"],
  ["farmer-create", "farmer", "/farmer/create"],
  ["farmer-sales", "farmer", "/farmer/sales"],
  ["farmer-deal", "farmer", async (api) => {
    const { deals } = await api("/api/deals");
    const d = deals.find((x) => x.status === "TRANSPORT_CONFIRMED") ?? deals.find((x) => x.status === "AWAITING_TRANSPORT") ?? deals[0];
    return `/farmer/sales?l=${d.listing.id}`;
  }, { scrollTo: { text: /pickup code/i }, offset: 260 }],
  ["farmer-profile", "farmer", "/farmer/profile"],
  ["dealer-home", "dealer", "/dealer"],
  ["dealer-market", "dealer", "/dealer/market"],
  ["dealer-listing", "dealer", async (api) => {
    const { listings } = await api("/api/market");
    const l = listings.find((x) => x.mode === "BID") ?? listings[0];
    return `/dealer/market?l=${l.id}`;
  }],
  ["dealer-purchases", "dealer", "/dealer/purchases"],
  ["dealer-transport-offers", "dealer", "/dealer/purchases", { scrollTo: { role: "button", name: /^Choose/ }, offset: 420 }],
  ["transporter-home", "transporter", "/transporter"],
  ["transporter-deals", "transporter", async (api) => {
    const board = await api("/api/transport/deals?");
    const d = (board.deals ?? [])[0];
    return d ? `/transporter/deals?d=${d.id}` : "/transporter/deals";
  }, { scrollTo: { css: "div.md" }, offset: 90 }],
  ["transporter-trips", "transporter", "/transporter/trips"],
  ["transporter-trips-road", "transporter", "/transporter/trips", { click: /^On the road/ }],
  ["transporter-vehicles", "transporter", "/transporter/vehicles"],
  ["admin-overview", "admin", "/admin"],
  ["admin-verification", "admin", "/admin/verification"],
  ["admin-failures", "admin", "/admin/failures"],
  ["admin-cases", "admin", "/admin/cases?tab=reports"],
  ["admin-users", "admin", "/admin/users"],
  ["admin-business", "admin", "/admin/business"],
  ["admin-products", "admin", "/admin/products"],
  ["admin-team", "admin", "/admin/team"],
  ["phone-farmer-home", "farmer", "/farmer", { phone: true }],
  ["phone-dealer-market", "dealer", "/dealer/market", { phone: true }],
];

// JPEG at 1280 px wide keeps the Word file small (PNG screenshots made it 11 MB); text prints at the same size.
const DESKTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
const JPEG = { type: "jpeg", quality: 85 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

// Scrolls so that the target sits near the top of the screen (offset = room left above it).
async function scrollTo(page, target, offset = 100) {
  const loc = target.css ? page.locator(target.css).first()
    : target.role ? page.getByRole(target.role, { name: target.name }).first()
    : page.getByText(target.text).first();
  await loc.waitFor({ timeout: 15000 });
  await loc.evaluate((el, off) => {
    el.scrollIntoView({ block: "start" });
    let p = el.parentElement;
    while (p && !(p.scrollHeight > p.clientHeight && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    (p ?? window).scrollBy(0, -off);
  }, offset);
}

// Wake the free Render server first, so the "Starting the server…" notice does not appear in the pictures.
for (let i = 0; i < 6; i++) {
  const t = Date.now();
  const ok = await fetch(SITE + "/api/health").then((r) => r.ok).catch(() => false);
  if (ok && Date.now() - t < 2000) break;
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const contexts = new Map();
async function contextFor(account, phone) {
  const key = `${account ?? "public"}:${phone ? "phone" : "desktop"}`;
  if (contexts.has(key)) return contexts.get(key);
  const ctx = await browser.newContext({ ...(phone ? PHONE : DESKTOP), colorScheme: "light", reducedMotion: "reduce", locale: "en-GB" });
  if (account) {
    const r = await ctx.request.post(SITE + "/api/auth/login", { data: { phone: ACCOUNTS[account], password: PASSWORD } });
    if (!r.ok()) throw new Error(`login failed for ${account}: ${r.status()}`);
  }
  const api = async (p) => (await ctx.request.get(SITE + p)).json();
  contexts.set(key, { ctx, api });
  return contexts.get(key);
}

try {
  for (const [name, account, target, opts = {}] of SHOTS) {
    if (only.length && !only.includes(name)) continue;
    try {
      const { ctx, api } = await contextFor(account, opts.phone);
      const url = SITE + (typeof target === "function" ? await target(api) : target);
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      if (opts.click) await page.getByRole("button", { name: opts.click }).or(page.getByRole("tab", { name: opts.click })).first().click();
      if (opts.scrollTo) await scrollTo(page, opts.scrollTo, opts.offset);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, name + ".jpg"), ...JPEG });
      console.log("saved", name + ".jpg", "←", url.replace(SITE, ""));
      await page.close();
    } catch (e) {
      console.log("FAILED", name, e.message.split("\n")[0]);
    }
  }
  // The two phone screenshots side by side as one figure (a single tall phone picture would fill a whole page).
  const phones = ["phone-farmer-home.jpg", "phone-dealer-market.jpg"].map((f) => path.join(OUT, f));
  if ((!only.length || only.includes("phone-views")) && phones.every((f) => fs.existsSync(f))) {
    const page = await browser.newPage({ viewport: { width: 860, height: 900 }, deviceScaleFactor: 1.5 });
    const src = (f) => "data:image/jpeg;base64," + fs.readFileSync(f).toString("base64");
    await page.setContent(`<body style="margin:0;background:#fff"><div id="w" style="display:flex;gap:40px;padding:20px;width:max-content">${phones.map((f) => `<img src="${src(f)}" style="width:390px;border:1px solid #888;border-radius:16px">`).join("")}</div></body>`);
    await page.locator("#w").screenshot({ path: path.join(OUT, "phone-views.jpg"), ...JPEG });
    console.log("saved phone-views.jpg (both phone screenshots)");
    await page.close();
  }
} finally {
  await browser.close();
}
