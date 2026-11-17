// Users report users of the other roles they traded with (and fake / abusive reviews about them).
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { notifyMany } from "../notify.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole("FARMER", "DEALER", "TRANSPORTER"));

reportsRouter.post("/", async (req, res) => {
  const p = z.object({
    againstId: z.string().optional(), dealId: z.string().optional(), reviewId: z.string().optional(),
    kind: z.enum(["PRICE_CHANGED", "NO_SHOW", "WRONG_QUALITY", "RUDE", "FAKE_REVIEW", "OTHER"]),
    details: z.string().trim().min(10, "Describe what happened (at least 10 letters)").max(800),
  }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Please describe what happened.", fields: z.flattenError(p.error).fieldErrors });
  const me = req.user!, d = p.data;
  let againstId = d.againstId, dealCode: number | undefined;

  if (d.reviewId) {
    // only the person a review is about can report it
    const r = await prisma.review.findUnique({ where: { id: d.reviewId }, include: { deal: { select: { code: true } } } });
    if (!r || r.toId !== me.id) return res.status(404).json({ error: "Review not found." });
    againstId = r.fromId; dealCode = r.deal.code;
  } else {
    if (!d.dealId || !againstId) return res.status(400).json({ error: "Choose the deal and the person." });
    // you can report someone only if you were both in the deal (different roles)
    const deal = await prisma.deal.findUnique({ where: { id: d.dealId }, include: { transportOffers: { where: { status: "ACCEPTED" }, select: { transporterId: true } } } });
    const people = deal ? [deal.farmerId, deal.dealerId, ...deal.transportOffers.map((o) => o.transporterId)] : [];
    if (!deal || !people.includes(me.id) || !people.includes(againstId) || againstId === me.id) return res.status(404).json({ error: "You can report only people you traded with." });
    dealCode = deal.code;
  }
  const open = await prisma.report.findFirst({ where: { byId: me.id, againstId, dealCode, reviewId: d.reviewId ?? null, status: "OPEN" } });
  if (open) return res.status(409).json({ error: "You already reported this. An admin will look at it." });
  await prisma.report.create({ data: { byId: me.id, againstId: againstId!, dealCode, reviewId: d.reviewId, kind: d.reviewId ? "FAKE_REVIEW" : d.kind, details: d.details } });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", OR: [{ isSuperAdmin: true }, { permissions: { has: "REPORTS" } }] }, select: { id: true } });
  await notifyMany(admins.map((a) => a.id), d.reviewId ? "Review reported" : "New report", `${me.businessName ?? me.name} reported ${d.reviewId ? "a review" : "a user"}${dealCode ? ` (FN-${dealCode})` : ""}.`, "/admin/cases");
  res.status(201).json({ ok: true });
});
