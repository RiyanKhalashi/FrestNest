"use client";
import { useEffect, useState } from "react";

export const tk = (n: number | null | undefined, dp = 2) => (n === null || n === undefined ? "—" : "৳" + n.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp }));
export const tk0 = (n: number | null | undefined) => tk(n, 0);
export const kg = (n: number) => n.toLocaleString("en-IN") + " kg";
export const dateShort = (d: string | Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const dateTime = (d: string | Date) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
export const ago = (d: string | Date) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  return dateShort(d);
};
/** "2d 4h", "3h 12m", "45s" */
export function left(ms: number) {
  if (ms <= 0) return "ended";
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
/** Re-renders every second while mounted (for countdowns). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(t); }, [intervalMs]);
  return now;
}
export function Countdown({ to }: { to: string | Date | null | undefined }) {
  const now = useNow();
  if (!to) return null;
  return <span className="num">{left(new Date(to).getTime() - now)}</span>;
}
export const STORAGE_LABEL: Record<string, string> = { NORMAL: "Normal", VENTILATED: "Ventilated", REFRIGERATED: "Refrigerated" };
export const SCOPE_LABEL: Record<string, string> = { UPAZILA: "Only my upazila", DISTRICT: "Within district", NATION: "Nationwide" };
/** value for <input type="datetime-local"> in local time */
export const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
