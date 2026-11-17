import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, publicUser } from "../auth.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

const update = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  upazilaId: z.number().int().positive().optional(),
  village: z.string().trim().max(80).optional(),
  businessName: z.string().trim().max(100).optional(),
  // farmers only: "Agri partner offers"
  partnerOffers: z.boolean().optional(),
});

profileRouter.patch("/", async (req, res) => {
  const parsed = update.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check the form.", fields: z.flattenError(parsed.error).fieldErrors });
  const d = parsed.data, me = req.user!;
  if (d.partnerOffers !== undefined && me.role !== "FARMER") return res.status(400).json({ error: "Only farmers have partner offers." });
  let districtId: number | undefined;
  if (d.upazilaId) {
    const u = await prisma.upazila.findUnique({ where: { id: d.upazilaId } });
    if (!u) return res.status(400).json({ error: "Unknown upazila." });
    districtId = u.districtId;
  }
  const user = await prisma.user.update({
    where: { id: me.id },
    data: { ...d, districtId },
    include: { district: { select: { id: true, name: true } }, upazila: { select: { id: true, name: true } } },
  });
  res.json({ user: publicUser(user) });
});

profileRouter.post("/password", async (req, res) => {
  const parsed = z.object({ current: z.string(), next: z.string().min(8, "At least 8 characters") }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "New password must have at least 8 characters." });
  if (!(await bcrypt.compare(parsed.data.current, req.user!.passwordHash))) return res.status(400).json({ error: "Current password is wrong." });
  await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) } });
  res.json({ ok: true });
});

/** Reviews I received (hidden ones are not shown). */
profileRouter.get("/reviews", async (req, res) => {
  const rs = await prisma.review.findMany({
    where: { toId: req.user!.id, hidden: false }, orderBy: { createdAt: "desc" }, take: 50,
    include: { from: { select: { name: true, businessName: true, role: true } }, deal: { select: { code: true, quantityKg: true, listing: { select: { customName: true, product: { select: { nameEn: true } } } } } } },
  });
  const dist = [5, 4, 3, 2, 1].map((s) => rs.filter((r) => r.stars === s).length);
  const avg = rs.length ? Math.round((rs.reduce((a, r) => a + r.stars, 0) / rs.length) * 10) / 10 : null;
  res.json({
    avg, count: rs.length, dist,
    reviews: rs.map((r) => ({ id: r.id, stars: r.stars, comment: r.comment, at: r.createdAt, from: r.from.businessName ?? r.from.name, fromRole: r.from.role, deal: "FN-" + r.deal.code, product: r.deal.listing.product?.nameEn ?? r.deal.listing.customName, quantityKg: r.deal.quantityKg })),
  });
});

// ---------------- verification documents (dealers: NID + trade licence; transporters: NID + driving licence)
import fs from "node:fs";
import { idDoc, keep } from "../uploads.js";
import { notifyMany } from "../notify.js";
export const NEEDED: Record<string, ("NID" | "TRADE_LICENSE" | "DRIVING_LICENSE")[]> = { DEALER: ["NID", "TRADE_LICENSE"], TRANSPORTER: ["NID", "DRIVING_LICENSE"] };

profileRouter.get("/docs", async (req, res) => {
  const docs = await prisma.verificationDoc.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
  const need = NEEDED[req.user!.role] ?? [];
  res.json({ needed: need, docs: need.map((k) => { const d = docs.find((x) => x.kind === k); return { kind: k, file: d?.file ?? null, at: d?.createdAt ?? null }; }) });
});

profileRouter.post("/docs", idDoc, async (req, res) => {
  const me = req.user!, file = req.file;
  const kind = String(req.body?.kind ?? "");
  const need = NEEDED[me.role] ?? [];
  if (!file || !need.includes(kind as never)) { if (file) fs.rm(file.path, () => {}); return res.status(400).json({ error: "Choose the document type and a photo (JPG, PNG or WebP, up to 5 MB)." }); }
  await prisma.verificationDoc.create({ data: { userId: me.id, kind: kind as "NID", file: await keep(file, "ids") } });
  // after a re-upload request, uploading again sends the account back to the admin queue
  const have = new Set((await prisma.verificationDoc.findMany({ where: { userId: me.id }, select: { kind: true } })).map((d) => d.kind));
  const complete = need.every((k) => have.has(k));
  if (me.status === "REUPLOAD" && complete) await prisma.user.update({ where: { id: me.id }, data: { status: "PENDING", statusReason: null } });
  if (complete && (me.status === "PENDING" || me.status === "REUPLOAD")) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", OR: [{ isSuperAdmin: true }, { permissions: { has: "VERIFY" } }] }, select: { id: true } });
    await notifyMany(admins.map((a) => a.id), "Documents to check", `${me.businessName ?? me.name} (${me.role.toLowerCase()}) uploaded documents for verification.`, "/admin/verification");
  }
  res.status(201).json({ ok: true, complete });
});
