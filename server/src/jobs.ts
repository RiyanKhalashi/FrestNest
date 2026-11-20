// Timed rules. A small sweeper runs every few seconds; all state lives in the database,
// so nothing is lost when the server restarts (each step is idempotent and row-locked).
import { prisma } from "./db.js";
import { productInfo, code, DAY, transportWindowEnd } from "./rules.js";
import { notify, notifyMany } from "./notify.js";
import { pingListing, pingMarket, pingTransport, pingUser } from "./realtime.js";
import { cancelOpenOffers } from "./routes/listings.js";
import { setupEmergencyDelivery, afterEmergencyDeal, startEmergency, widen, suggest, shelfLeftMs, failureInclude } from "./emergency.js";

/** Bidding ended → highest bid wins automatically; no bids → NO_SALE (farmer may relist once). */
async function closeBidding() {
  const due = await prisma.listing.findMany({ where: { status: "OPEN", mode: "BID", bidEndsAt: { lte: new Date() } }, select: { id: true } });
  for (const { id } of due) {
    const r = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id} FOR UPDATE`;
      const l = await tx.listing.findUniqueOrThrow({ where: { id }, include: { product: true, bids: { orderBy: [{ pricePerKg: "desc" }, { createdAt: "asc" }] } } });
      if (l.status !== "OPEN" || !l.bidEndsAt || l.bidEndsAt > new Date()) return null; // already handled
      const top = l.bids[0];
      if (!top) {
        await tx.listing.update({ where: { id }, data: { status: "NO_SALE", closedAt: new Date() } });
        return { l, deal: null };
      }
      await tx.listing.update({ where: { id }, data: { status: "SOLD", remainingKg: 0, closedAt: new Date() } });
      const deal = await tx.deal.create({ data: { listingId: id, farmerId: l.farmerId, dealerId: top.dealerId, quantityKg: l.quantityKg, pricePerKg: top.pricePerKg, source: l.isEmergency ? "EMERGENCY" : "BID", transportWindowEndsAt: await transportWindowEnd() } });
      const setup = l.isEmergency ? await setupEmergencyDelivery(tx, deal.id, id) : null;
      return { l, deal, top, setup };
    });
    if (!r) continue;
    const name = productInfo(r.l).name;
    if (!r.deal) {
      await notify(r.l.farmerId, "Bidding ended without bids", `${name} ${code(r.l.code)} got no bids. You can relist once: extend the time, lower the price, or switch to your own price.`, "/farmer/sales?l=" + id);
    } else {
      const price = Number(r.deal.pricePerKg), total = Math.round(price * r.deal.quantityKg).toLocaleString("en-IN");
      await notify(r.deal.dealerId, "You won the bidding", `${name} ${code(r.l.code)}: ${r.deal.quantityKg} kg at ৳${price.toFixed(2)}/kg (৳${total}). Deal ${code(r.deal.code)} is waiting for transport offers.`, "/dealer/purchases");
      await notify(r.l.farmerId, "Bidding won", `${name} ${code(r.l.code)} sold at ৳${price.toFixed(2)}/kg (৳${total}). Deal ${code(r.deal.code)}.`, "/farmer/sales?l=" + id);
      await notifyMany(r.l.bids.map((b) => b.dealerId).filter((d) => d !== r.deal!.dealerId), "Bidding ended", `${name} ${code(r.l.code)} went to a higher bid.`, "/dealer/purchases");
      if ("setup" in r) await afterEmergencyDeal(r.deal.id, r.setup ?? null);
    }
    pingListing(id); pingMarket(); if (r.deal) pingTransport();
  }
}

/** Offers the farmer did not answer in time (or counter-offers the dealer did not answer). */
async function expireOffers() {
  const due = await prisma.offer.findMany({ where: { status: { in: ["PENDING", "COUNTERED"] }, expiresAt: { lte: new Date() } }, include: { listing: { include: { product: true } }, dealer: true } });
  for (const o of due) {
    const n = await prisma.offer.updateMany({ where: { id: o.id, status: o.status }, data: { status: "EXPIRED" } });
    if (!n.count) continue;
    const name = productInfo(o.listing).name;
    await notify(o.dealerId, "Offer expired", `Your offer on ${name} ${code(o.listing.code)} expired${o.status === "COUNTERED" ? " before you answered the counter-offer" : " without an answer"}.`, "/dealer/purchases");
    await notify(o.listing.farmerId, "Offer expired", `${o.dealer.businessName ?? o.dealer.name}'s offer on ${name} expired.`, "/farmer/sales?l=" + o.listingId);
    pingListing(o.listingId);
  }
}

/** Listings hide automatically when harvest date + shelf life has passed. */
async function expireListings() {
  const open = await prisma.listing.findMany({ where: { status: "OPEN" }, include: { product: true } });
  for (const l of open) {
    if (l.harvestDate.getTime() + productInfo(l).shelf * DAY > Date.now()) continue;
    const n = await prisma.listing.updateMany({ where: { id: l.id, status: "OPEN" }, data: { status: "EXPIRED", closedAt: new Date() } });
    if (!n.count) continue;
    await cancelOpenOffers(l.id, `${productInfo(l).name} ${code(l.code)} passed its shelf life and closed.`);
    await notify(l.farmerId, "Listing expired", `${productInfo(l).name} ${code(l.code)} passed its shelf life and was hidden from the market.`, "/farmer/sales?l=" + l.id);
    pingListing(l.id); pingMarket();
  }
}

/** Transport window ended without offers → tell the dealer once (they can extend it once). */
/** A dealer's counter-offer that the transporter did not answer in time: the original offer stays. */
async function expireCounters() {
  const due = await prisma.transportOffer.findMany({ where: { status: "PENDING", counterState: "WAITING", counterExpiresAt: { lte: new Date() } }, include: { transporter: true, deal: true } });
  for (const o of due) {
    const n = await prisma.transportOffer.updateMany({ where: { id: o.id, counterState: "WAITING" }, data: { counterState: "EXPIRED" } });
    if (!n.count) continue;
    await notify(o.deal.dealerId, "Counter-offer expired", `${o.transporter.businessName ?? o.transporter.name} did not answer your ৳${o.counterPrice!.toLocaleString("en-IN")} counter for ${code(o.deal.code)}. Their offer of ৳${o.price.toLocaleString("en-IN")} is still open.`, "/dealer/purchases");
    await notify(o.transporterId, "Counter-offer expired", `The dealer's counter for ${code(o.deal.code)} expired. Your offer of ৳${o.price.toLocaleString("en-IN")} still stands.`, "/transporter/trips");
    pingUser(o.deal.dealerId, "deal"); pingUser(o.deal.farmerId, "deal"); pingUser(o.transporterId, "deal");
  }
}

async function transportWindows() {
  const due = await prisma.deal.findMany({ where: { status: "AWAITING_TRANSPORT", windowNotified: false, transportWindowEndsAt: { lte: new Date() } }, include: { listing: { include: { product: true } }, transportOffers: { where: { status: "PENDING" }, select: { id: true } } } });
  for (const d of due) {
    const n = await prisma.deal.updateMany({ where: { id: d.id, windowNotified: false }, data: { windowNotified: true } });
    if (!n.count) continue;
    const name = productInfo(d.listing).name;
    if (d.transportOffers.length) await notify(d.dealerId, "Choose transport", `The offer window for ${name} ${code(d.code)} has closed with ${d.transportOffers.length} offer(s). Choose one.`, "/dealer/purchases");
    else await notify(d.dealerId, "No transport offers", `No transporter offered for ${name} ${code(d.code)}. ${d.windowExtended ? "Contact the farmer or cancel with a reason." : "You can extend the window once."}`, "/dealer/purchases");
  }
}

/** Delivery failures: 30 min without an admin → urgent alert; farmer chose "auto" → start the sale after 30 min; no bids for 1 h → widen. */
async function failures() {
  const now = Date.now();
  const old = await prisma.deliveryFailure.findMany({ where: { status: "PENDING", escalatedAt: null, createdAt: { lte: new Date(now - 30 * 60_000) } }, include: { upazila: true, deal: { select: { code: true } } } });
  if (old.length) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", OR: [{ isSuperAdmin: true }, { permissions: { has: "DEALS" } }] }, select: { id: true } });
    for (const f of old) {
      const n = await prisma.deliveryFailure.updateMany({ where: { id: f.id, escalatedAt: null }, data: { escalatedAt: new Date() } });
      if (n.count) await notifyMany(admins.map((a) => a.id), "URGENT: failure waiting 30 min", `${code(f.deal.code)} stuck in ${f.upazila.name} has had no decision for 30 minutes. The produce is losing shelf life.`, "/admin/failures");
    }
  }
  const auto = await prisma.deliveryFailure.findMany({ where: { status: "APPROVED", emergency: null, decidedAt: { lte: new Date(now - 30 * 60_000) }, deal: { emergencyAuto: true } }, include: failureInclude });
  for (const f of auto) { const s = suggest(shelfLeftMs(f), Number(f.deal.pricePerKg)); await startEmergency(f.id, { hours: s.hours, drop: s.drop, buyNow: s.buyNow }, "auto"); }
  const quiet = await prisma.listing.findMany({ where: { isEmergency: true, status: "OPEN", tier: { lt: 3 }, tierChangedAt: { lte: new Date(now - 3600_000) }, bids: { none: {} } }, select: { id: true } });
  for (const l of quiet) await widen(l.id);
}

let running = false;
let tick = 0;
export function startJobs() {
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await closeBidding();
      await expireOffers();
      await expireCounters();
      await transportWindows();
      await failures();
      if (tick++ % 12 === 0) await expireListings(); // about once a minute
    } catch (e) { console.error("jobs:", e); }
    finally { running = false; }
  }, 5000);
}
