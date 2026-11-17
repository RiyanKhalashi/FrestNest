// Transporter: my vehicles (each checked by an admin before it can be offered).
import { Router } from "express";
import { z } from "zod";
import fs from "node:fs";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { vehicleDoc, keep } from "../uploads.js";
import { vehicleLabel } from "../views.js";

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth, requireRole("TRANSPORTER"));

const body = z.object({
  type: z.enum(["PICKUP", "MINI_TRUCK", "TRUCK", "COVERED_VAN"]),
  regNo: z.string().trim().min(5, "Enter the registration number").max(30).transform((s) => s.replace(/\s+/g, " ")),
  capacityKg: z.coerce.number().int().min(100, "At least 100 kg").max(40000),
  facility: z.enum(["NORMAL", "VENTILATED", "REFRIGERATED"]),
});

vehiclesRouter.get("/", async (req, res) => {
  const vs = await prisma.vehicle.findMany({
    where: { ownerId: req.user!.id }, orderBy: { createdAt: "asc" },
    include: { offers: { where: { status: "ACCEPTED", deal: { status: { in: ["TRANSPORT_CONFIRMED", "IN_TRANSIT"] } } }, include: { deal: { select: { code: true, status: true } } }, orderBy: { pickupAt: "asc" } }, _count: { select: { offers: { where: { status: "ACCEPTED", deal: { status: "COMPLETED" } } } } } },
  });
  res.json({
    vehicles: vs.map((v) => ({
      id: v.id, type: v.type, label: vehicleLabel(v), regNo: v.regNo, capacityKg: v.capacityKg, facility: v.facility, status: v.status, statusNote: v.statusNote, active: v.active, docPhoto: v.docPhoto,
      bookings: v.offers.map((o) => ({ deal: "FN-" + o.deal.code, status: o.deal.status, pickupAt: o.pickupAt, deliverBy: o.deliverBy })),
      tripsDone: v._count.offers,
    })),
  });
});

vehiclesRouter.post("/", vehicleDoc, async (req, res) => {
  const file = req.file;
  const drop = () => { if (file) fs.rm(file.path, () => {}); };
  const raw = typeof req.body?.data === "string" ? JSON.parse(req.body.data) : req.body;
  const p = body.safeParse(raw);
  if (!p.success) { drop(); return res.status(400).json({ error: "Please check the form.", fields: z.flattenError(p.error).fieldErrors }); }
  if (await prisma.vehicle.findUnique({ where: { regNo: p.data.regNo } })) { drop(); return res.status(409).json({ error: "This registration number is already registered.", fields: { regNo: ["Already registered"] } }); }
  const v = await prisma.vehicle.create({ data: { ...p.data, ownerId: req.user!.id, docPhoto: file ? await keep(file, "docs") : null } });
  res.status(201).json({ vehicle: { id: v.id, status: v.status } });
});

/** Turn a vehicle on/off for new offers (bookings already confirmed stay). */
vehiclesRouter.post("/:id/active", async (req, res) => {
  const p = z.object({ active: z.boolean() }).safeParse(req.body);
  const v = await prisma.vehicle.findUnique({ where: { id: String(req.params.id) } });
  if (!p.success || !v || v.ownerId !== req.user!.id) return res.status(404).json({ error: "Vehicle not found." });
  await prisma.vehicle.update({ where: { id: v.id }, data: { active: p.data.active } });
  if (!p.data.active) await prisma.transportOffer.updateMany({ where: { vehicleId: v.id, status: "PENDING" }, data: { status: "WITHDRAWN" } });
  res.json({ ok: true });
});
