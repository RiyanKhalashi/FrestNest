// Farmer: set up the emergency sale after an approved delivery failure; widen it; auto-start preference.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { productInfo, code } from "../services/rules.js";
import { failureInclude, shelfLeftMs, suggest, startEmergency, widen, TIER_LABEL } from "../services/emergency.js";
import { pingUser } from "../lib/realtime.js";

export const emergencyRouter = Router();
emergencyRouter.use(requireAuth, requireRole("FARMER"));

/** Info + suggested values for the farmer's emergency-sale form. */
emergencyRouter.get("/deal/:dealId", async (req, res) => {
  const f = await prisma.deliveryFailure.findFirst({ where: { dealId: String(req.params.dealId), deal: { farmerId: req.user!.id } }, orderBy: { createdAt: "desc" }, include: failureInclude });
  if (!f) return res.status(404).json({ error: "No delivery failure for this deal." });
  const left = shelfLeftMs(f);
  res.json({
    failure: { id: f.id, status: f.status, where: f.upazila.name + ", " + f.upazila.district.name, note: f.locationNote, usableKg: f.usableKg, condition: f.condition, canMove: f.canMove, decidedAt: f.decidedAt },
    product: productInfo(f.deal.listing).name, originalPrice: Number(f.deal.pricePerKg), suggestion: suggest(left, Number(f.deal.pricePerKg)), auto: f.deal.emergencyAuto,
    emergency: f.emergency ? { id: f.emergency.id, code: code(f.emergency.code), status: f.emergency.status, tier: f.emergency.tier, tierLabel: TIER_LABEL[f.emergency.tier ?? 1], endsAt: f.emergency.bidEndsAt } : null,
  });
});

emergencyRouter.post("/deal/:dealId/start", async (req, res) => {
  const p = z.object({ hours: z.coerce.number().refine((h) => [1, 3, 6, 12].includes(h), "Choose 1, 3, 6 or 12 hours"), drop: z.coerce.number().min(0).max(90), buyNow: z.coerce.number().positive().optional().nullable() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please check the values.", fields: z.flattenError(p.error).fieldErrors });
  const f = await prisma.deliveryFailure.findFirst({ where: { dealId: String(req.params.dealId), deal: { farmerId: req.user!.id }, status: "APPROVED" }, include: { emergency: true, deal: true } });
  if (!f) return res.status(404).json({ error: "There is no approved failure to sell from." });
  if (f.emergency) return res.status(409).json({ error: "The emergency sale has already started." });
  const start = Number(f.deal.pricePerKg) * (1 - p.data.drop / 100);
  if (p.data.buyNow && p.data.buyNow <= start) return res.status(400).json({ error: "Buy Now must be higher than the starting price.", fields: { buyNow: ["Too low"] } });
  const id = await startEmergency(f.id, { hours: p.data.hours, drop: p.data.drop, buyNow: p.data.buyNow }, "farmer");
  res.status(201).json({ listingId: id });
});

emergencyRouter.post("/listing/:id/widen", async (req, res) => {
  const l = await prisma.listing.findUnique({ where: { id: String(req.params.id) } });
  if (!l || l.farmerId !== req.user!.id || !l.isEmergency) return res.status(404).json({ error: "Emergency sale not found." });
  if (!(await widen(l.id))) return res.status(409).json({ error: "It is already visible as widely as possible, or it has closed." });
  res.json({ ok: true });
});

/** Farmer's choice in advance (on every deal): auto-start with suggested values, or wait for me. */
emergencyRouter.post("/deal/:dealId/auto", async (req, res) => {
  const p = z.object({ auto: z.boolean() }).safeParse(req.body);
  const d = await prisma.deal.findUnique({ where: { id: String(req.params.dealId) } });
  if (!p.success || !d || d.farmerId !== req.user!.id) return res.status(404).json({ error: "Deal not found." });
  await prisma.deal.update({ where: { id: d.id }, data: { emergencyAuto: p.data.auto } });
  pingUser(d.farmerId, "deal");
  res.json({ ok: true });
});
