import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";
import type { Role, AdminPermission, User } from "../generated/prisma/client.js";

const SECRET = process.env.JWT_SECRET!;
export const COOKIE = "fn_session";
const WEEK = 7 * 24 * 3600 * 1000;

export function setSession(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: WEEK, path: "/" });
}
export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express { interface Request { user?: User } }
}

/** Reads the session cookie; attaches req.user when valid. Never blocks. */
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      const { sub } = jwt.verify(token, SECRET) as { sub: string };
      const user = await prisma.user.findUnique({ where: { id: sub } });
      if (user) {
        // a temporary suspension ends by itself
        if (user.status === "SUSPENDED" && user.suspendedUntil && user.suspendedUntil < new Date()) {
          req.user = await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE", suspendedUntil: null, statusReason: null } });
        } else req.user = user;
        if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > 120_000) prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
      }
    } catch { /* invalid or expired token: treat as signed out */ }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Please sign in." });
  if (req.user.status === "BANNED") return res.status(403).json({ error: "This account is banned." });
  next();
}

export const requireRole = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: "Please sign in." });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Not allowed for your role." });
  next();
};

/** Dealers and transporters must be verified (ACTIVE) to create bids, offers, trips. Suspended users cannot start new things. */
export function requireActive(req: Request, res: Response, next: NextFunction) {
  const s = req.user?.status;
  if (s === "ACTIVE") return next();
  const msg: Record<string, string> = {
    PENDING: "Your account is waiting for admin verification.",
    REUPLOAD: "Please upload a clearer document. Admin asked for a re-upload.",
    REJECTED: "Your verification was rejected.",
    SUSPENDED: "Your account is suspended. Active deals continue, but you cannot start new ones.",
    BANNED: "This account is banned.",
  };
  res.status(403).json({ error: msg[s ?? ""] ?? "Not allowed." });
}

export const requirePermission = (p: AdminPermission) => (req: Request, res: Response, next: NextFunction) => {
  const u = req.user;
  if (!u || u.role !== "ADMIN") return res.status(403).json({ error: "Admins only." });
  if (u.isSuperAdmin || u.permissions.includes(p)) return next();
  res.status(403).json({ error: "You do not have this permission." });
};

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === "ADMIN" && req.user.isSuperAdmin) return next();
  res.status(403).json({ error: "Super Admin only." });
}

/** Safe public shape of a user (never send passwordHash). */
export function publicUser(u: User & { district?: { name: string } | null; upazila?: { name: string } | null }) {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}
