// Live updates (Socket.io): bids, listing changes and the notification bell.
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { COOKIE } from "./auth.js";
import { prisma } from "./db.js";

let io: Server | null = null;

function cookieValue(header: string | undefined, name: string) {
  const m = header?.split(/;\s*/).find((c) => c.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : undefined;
}

export function startRealtime(server: HttpServer) {
  io = new Server(server, { cors: { origin: (process.env.WEB_ORIGIN ?? "").split(",").map((o) => o.trim()).filter(Boolean), credentials: true }, path: "/socket.io" });
  io.on("connection", async (socket) => {
    try {
      // production: a 2-minute ticket from /api/auth/socket-token; development: the session cookie
      const ticket = (socket.handshake.auth as { token?: string } | undefined)?.token;
      const token = ticket ?? cookieValue(socket.handshake.headers.cookie, COOKIE);
      if (token) {
        const { sub, purpose } = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; purpose?: string };
        if (ticket && purpose !== "socket") throw new Error("not a socket ticket");
        if (await prisma.user.findUnique({ where: { id: sub }, select: { id: true } })) socket.join("user:" + sub);
      }
    } catch { /* anonymous socket: can still watch public listing rooms it is allowed to see */ }
    // Watching a listing only delivers "something changed" pings; data is always re-fetched through the API, which checks visibility.
    socket.on("watch", (listingId: unknown) => { if (typeof listingId === "string" && listingId.length < 40) socket.join("listing:" + listingId); });
    socket.on("unwatch", (listingId: unknown) => { if (typeof listingId === "string") socket.leave("listing:" + listingId); });
  });
}

export function pingListing(listingId: string, kind = "changed") { io?.to("listing:" + listingId).emit("listing", { id: listingId, kind }); }
export function pingUser(userId: string, event: string, data: unknown = {}) { io?.to("user:" + userId).emit(event, data); }
/** Market lists refresh when something opens or closes. */
export function pingMarket() { io?.emit("market"); }
/** Transport boards refresh when a deal opens or closes for transport offers. */
export function pingTransport() { io?.emit("transport"); }
