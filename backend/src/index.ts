import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import cookieParser from "cookie-parser";
import cors from "cors";
import { loadUser } from "./lib/auth.js";
import { authRouter } from "./routes/auth.js";
import { metaRouter } from "./routes/meta.js";
import { profileRouter } from "./routes/profile.js";
import { listingsRouter } from "./routes/listings.js";
import { marketRouter } from "./routes/market.js";
import { offersRouter } from "./routes/offers.js";
import { dealsRouter } from "./routes/deals.js";
import { notificationsRouter } from "./routes/notifications.js";
import { vehiclesRouter } from "./routes/vehicles.js";
import { transportRouter } from "./routes/transport.js";
import { emergencyRouter } from "./routes/emergency.js";
import { adminRouter } from "./routes/admin/failures.js";
import "./routes/admin/office.js"; // adds the admin office routes to adminRouter
import "./routes/admin/analytics.js";   // A8 analytics
import { reportsRouter } from "./routes/reports.js";
import path from "node:path";
import { UPLOAD_DIR, sendPrivate } from "./lib/uploads.js";
import { requireAuth } from "./lib/auth.js";
import { prisma } from "./lib/db.js";
import { startRealtime } from "./lib/realtime.js";
import { startJobs } from "./jobs/sweeper.js";
import { refreshSeasons } from "./services/rules.js";

const app = express();
app.set("trust proxy", 1); // behind Render / Vercel proxies
const WEB_ORIGINS = (process.env.WEB_ORIGIN ?? "").split(",").map((o) => o.trim()).filter(Boolean); // comma-separated list allowed
app.use(cors({ origin: WEB_ORIGINS, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads/listings", express.static(path.join(UPLOAD_DIR, "listings"), { maxAge: "7d", fallthrough: false })); // public listing photos
app.use("/uploads/avatars", express.static(path.join(UPLOAD_DIR, "avatars"), { maxAge: "7d", fallthrough: false })); // public profile pictures
app.use(loadUser);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/meta", metaRouter);
app.use("/api/profile", profileRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/market", marketRouter);
app.use("/api/offers", offersRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/transport", transportRouter);
app.use("/api/emergency", emergencyRouter);
app.use("/api/admin", adminRouter);
app.use("/api/reports", reportsRouter);
// private documents: the owner and admins only
app.get("/api/files/docs/:name", requireAuth, async (req, res) => {
  const name = String(req.params.name);
  if (!/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(name)) return res.status(404).end();
  const v = await prisma.vehicle.findFirst({ where: { docPhoto: "/api/files/docs/" + name }, select: { ownerId: true } });
  if (!v || (v.ownerId !== req.user!.id && req.user!.role !== "ADMIN")) return res.status(404).end();
  sendPrivate(res, "docs", name);
});
app.get("/api/files/ids/:name", requireAuth, async (req, res) => {
  const name = String(req.params.name);
  if (!/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(name)) return res.status(404).end();
  const d = await prisma.verificationDoc.findFirst({ where: { file: "/api/files/ids/" + name }, select: { userId: true } });
  if (!d || (d.userId !== req.user!.id && req.user!.role !== "ADMIN")) return res.status(404).end();
  sendPrivate(res, "ids", name);
});
app.get("/api/files/failures/:name", requireAuth, async (req, res) => {
  const name = String(req.params.name);
  if (!/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(name)) return res.status(404).end();
  const f = await prisma.deliveryFailure.findFirst({ where: { photo: "/api/files/failures/" + name }, select: { reportedById: true, deal: { select: { farmerId: true, dealerId: true } } } });
  const me = req.user!;
  if (!f || !(me.role === "ADMIN" || [f.reportedById, f.deal.farmerId, f.deal.dealerId].includes(me.id))) return res.status(404).end();
  sendPrivate(res, "failures", name);
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
// Express 5 passes async errors here
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const e = err as { code?: string; message?: string };
  if (e?.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Each photo must be under 5 MB." });
  if (e?.code === "LIMIT_FILE_COUNT" || e?.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ error: "Up to 4 photos." });
  if (err instanceof SyntaxError) return res.status(400).json({ error: "Invalid request." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

const port = Number(process.env.PORT ?? 4000);
const server = createServer(app);
startRealtime(server);
startJobs();
refreshSeasons(); setInterval(refreshSeasons, 60_000);
server.listen(port, () => console.log(`FreshNest API on http://localhost:${port}`));
