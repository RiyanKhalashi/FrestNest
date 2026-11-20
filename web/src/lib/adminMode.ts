"use client";
// Simple admin mode (demo): 6 menu items incl. Business. On by default; the Super Admin can show all tools.
import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";

let simple: boolean | null = null;
let loading = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function load() {
  if (simple !== null || loading) return;
  loading = true;
  api<{ simple: boolean }>("/admin/mode").then((r) => { simple = r.simple; emit(); }).catch(() => { simple = true; emit(); }).finally(() => { loading = false; });
}

export async function setAdminMode(next: boolean) {
  const r = await api<{ simple: boolean }>("/admin/mode", { method: "PUT", body: { simple: next } });
  simple = r.simple; emit();
}

/** null while loading; only call for admins. */
export function useAdminMode(enabled = true): boolean | null {
  useEffect(() => { if (enabled) load(); }, [enabled]);
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => simple, () => null);
}
