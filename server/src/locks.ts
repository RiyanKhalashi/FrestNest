// "Being handled by X": one admin works on a case at a time; the lock releases after 15 min without activity.
import type { Request, Response } from "express";
import { prisma } from "./db.js";
import type { User } from "./generated/prisma/client.js";
export const LOCK_IDLE = 15 * 60_000;
/** Takes (or refreshes) the lock. Returns the other admin's name if someone else is working on it. */
export async function takeLock(key: string, me: User) {
  const l = await prisma.caseLock.findUnique({ where: { key }, include: { admin: { select: { name: true } } } });
  if (l && l.adminId !== me.id && Date.now() - l.touchedAt.getTime() < LOCK_IDLE) return l.admin.name;
  await prisma.caseLock.upsert({ where: { key }, update: { adminId: me.id, touchedAt: new Date() }, create: { key, adminId: me.id } });
  return null;
}
export async function locks(keys: string[]) {
  const ls = await prisma.caseLock.findMany({ where: { key: { in: keys }, touchedAt: { gt: new Date(Date.now() - LOCK_IDLE) } }, include: { admin: { select: { id: true, name: true } } } });
  return new Map(ls.map((l) => [l.key, { by: l.admin.name, byId: l.admin.id, until: new Date(l.touchedAt.getTime() + LOCK_IDLE) }]));
}
export async function guard(req: Request, res: Response, key: string) {
  const other = await takeLock(key, req.user!);
  if (other) { res.status(423).json({ error: `Being handled by ${other}. It is released after 15 minutes without activity.` }); return false; }
  return true;
}
export const release = (key: string) => prisma.caseLock.deleteMany({ where: { key } });
