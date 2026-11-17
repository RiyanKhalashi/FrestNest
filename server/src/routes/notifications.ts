import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
  ]);
  res.json({ items, unread });
});

notificationsRouter.post("/read-all", async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
  res.json({ ok: true });
});

notificationsRouter.post("/:id/read", async (req, res) => {
  await prisma.notification.updateMany({ where: { id: String(req.params.id), userId: req.user!.id }, data: { read: true } });
  res.json({ ok: true });
});
