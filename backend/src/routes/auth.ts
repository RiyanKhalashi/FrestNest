import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/db.js";
import { setSession, clearSession, requireAuth, publicUser } from "../lib/auth.js";

export const authRouter = Router();

// Bangladesh mobile: 01XXXXXXXXX (11 digits); accept +880 / spaces / dashes
const phone = z.string().transform((s) => s.replace(/[\s-]/g, "").replace(/^\+?880/, "0")).pipe(z.string().regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number"));

const registerSchema = z.object({
  role: z.enum(["FARMER", "DEALER", "TRANSPORTER"]),
  name: z.string().trim().min(2, "Name is too short").max(80),
  phone,
  password: z.string().min(8, "At least 8 characters").max(100),
  upazilaId: z.number().int().positive(),
  village: z.string().trim().max(80).optional(),
  businessName: z.string().trim().max(100).optional(),
}).refine((d) => d.role === "FARMER" || (d.businessName && d.businessName.length >= 2), { message: "Business name is required", path: ["businessName"] });

const withPlace = { district: { select: { id: true, name: true } }, upazila: { select: { id: true, name: true } } } as const;

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check the form.", fields: z.flattenError(parsed.error).fieldErrors });
  const d = parsed.data;
  if (await prisma.user.findUnique({ where: { phone: d.phone } })) return res.status(409).json({ error: "This phone number is already registered.", fields: { phone: ["Already registered"] } });
  const upazila = await prisma.upazila.findUnique({ where: { id: d.upazilaId } });
  if (!upazila) return res.status(400).json({ error: "Unknown upazila.", fields: { upazilaId: ["Choose an upazila"] } });
  const user = await prisma.user.create({
    data: {
      role: d.role, name: d.name, phone: d.phone, passwordHash: await bcrypt.hash(d.password, 10),
      // farmers can start at once; dealers and transporters wait for admin verification
      status: d.role === "FARMER" ? "ACTIVE" : "PENDING",
      districtId: upazila.districtId, upazilaId: upazila.id, village: d.village || null, businessName: d.businessName || null,
    },
    include: withPlace,
  });
  setSession(res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const parsed = z.object({ phone, password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter your phone number and password." });
  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone }, include: withPlace });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: "Wrong phone number or password." });
  if (user.status === "BANNED") return res.status(403).json({ error: "This account is banned." + (user.statusReason ? " Reason: " + user.statusReason : "") });
  setSession(res, user.id);
  res.json({ user: publicUser(user) });
});

/** Short-lived ticket for the live-updates socket (the site and the API may be on different domains in production). */
authRouter.get("/socket-token", requireAuth, (req, res) => {
  res.json({ token: jwt.sign({ sub: req.user!.id, purpose: "socket" }, process.env.JWT_SECRET!, { expiresIn: "2m" }) });
});

authRouter.post("/logout", (_req, res) => { clearSession(res); res.json({ ok: true }); });

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, include: withPlace });
  const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });
  res.json({ user: publicUser(user), unread });
});
