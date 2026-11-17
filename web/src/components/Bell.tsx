"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ago } from "@/lib/format";
import { useLiveEvent } from "@/lib/live";
import { useToast } from "./ui";

interface Note { id: string; title: string; body: string; link: string | null; read: boolean; createdAt: string }

export function Bell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  async function load() { const r = await api<{ items: Note[]; unread: number }>("/notifications"); setItems(r.items); setUnread(r.unread); }
  useLiveEvent<{ title: string; body: string }>("notification", (n) => { setUnread((u) => u + 1); toast(n.title + ": " + n.body); if (open) load(); });
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  async function toggle() {
    const next = !open; setOpen(next);
    if (next) await load();
  }
  async function go(n: Note) {
    if (!n.read) { api("/notifications/" + n.id + "/read", { method: "POST" }); setUnread((u) => Math.max(0, u - 1)); setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x))); }
    setOpen(false);
    if (n.link) router.push(n.link);
  }
  async function readAll() { await api("/notifications/read-all", { method: "POST" }); setUnread(0); setItems((xs) => xs.map((x) => ({ ...x, read: true }))); }

  return (
    <div ref={box} style={{ position: "relative" }}>
      <button className="bell" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} onClick={toggle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
        {unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}
      </button>
      {open && (
        <div className="drop" style={{ display: "block", right: 0, top: 46 }}>
          <h4 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>Notifications {unread > 0 && <button className="btn ghost sm" onClick={readAll}>Mark all read</button>}</h4>
          <ul style={{ maxHeight: 420, overflowY: "auto" }}>
            {items.length === 0 && <li style={{ cursor: "default" }} className="muted">Nothing yet.</li>}
            {items.map((n) => (
              <li key={n.id} className={n.read ? "" : "new"} onClick={() => go(n)}>
                <b style={{ fontWeight: 600 }}>{n.title}</b> {n.body}<small>{ago(n.createdAt)}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
