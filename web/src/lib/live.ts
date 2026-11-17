"use client";
// Live updates from the API (Socket.io). The socket only says "something changed";
// pages then re-fetch through the normal API, which checks permissions.
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
function getSocket() {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? `${window.location.protocol}//${window.location.hostname}:4000`;
    socket = io(url, {
      withCredentials: true, transports: ["websocket", "polling"],
      // a fresh 2-minute ticket on every (re)connect; works when the site and the API are on different domains
      auth: (cb) => { fetch("/api/auth/socket-token", { credentials: "include" }).then((r) => (r.ok ? r.json() : {})).then((j: { token?: string }) => cb(j.token ? { token: j.token } : {})).catch(() => cb({})); },
    });
  }
  return socket;
}

/** Calls fn when a watched listing changes (bid, offer, close…). */
export function useListingLive(listingIds: string[], fn: (id: string) => void) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  const key = listingIds.join(",");
  useEffect(() => {
    const s = getSocket();
    const ids = key ? key.split(",") : [];
    const watch = () => ids.forEach((id) => s.emit("watch", id));
    watch();
    s.on("connect", watch);
    const on = (m: { id: string }) => { if (ids.includes(m.id)) ref.current(m.id); };
    s.on("listing", on);
    return () => { s.off("listing", on); s.off("connect", watch); ids.forEach((id) => s.emit("unwatch", id)); };
  }, [key]);
}

/** Calls fn on any socket event name (e.g. "notification", "market"). */
export function useLiveEvent<T = unknown>(event: string, fn: (data: T) => void) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => {
    const s = getSocket();
    const on = (d: T) => ref.current(d);
    s.on(event, on);
    return () => { s.off(event, on); };
  }, [event]);
}
