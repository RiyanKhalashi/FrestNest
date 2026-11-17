"use client";
// Shared admin pieces: user history beside every case, case lock tag, warn / suspend / ban dialogs.
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ago, dateShort } from "@/lib/format";
import { Modal, useToast } from "./ui";
import { useSession } from "./Session";

export interface History {
  id: string; name: string; person: string; role: string; phone: string; status: string; statusReason: string | null; suspendedUntil: string | null; place: string; since: string;
  rating: { avg: number; count: number } | null; deals: number; cancels30: number; failures30: number; failuresAll: number; reportsOpen: number; reportsAll: number; warnings: number; alerts: string[];
  recent: { at: string; by: string; action: string; reason: string | null }[];
}
export type Lock = { by: string; byId: string; until: string } | null;

export const STATUS_TAG: Record<string, [string, string]> = {
  ACTIVE: ["green", "Active"], PENDING: ["gold", "Waiting for verification"], REUPLOAD: ["gold", "Re-upload asked"], REJECTED: ["red", "Rejected"], SUSPENDED: ["red", "Suspended"], BANNED: ["red", "Banned"],
};

export function HistoryPanel({ userId, refresh }: { userId: string; refresh?: number }) {
  const [h, setH] = useState<History | null>(null);
  useEffect(() => { api<History>(`/admin/users/${userId}/history`).then(setH).catch(() => setH(null)); }, [userId, refresh]);
  if (!h) return <div className="hist"><p className="small muted">Loading history…</p></div>;
  return (
    <div className="hist">
      <h4>{h.name}</h4>
      <p className="small muted" style={{ marginBottom: 8 }}>{h.role.toLowerCase()} · {h.place} · since {dateShort(h.since)} · {h.phone}</p>
      <dl>
        <dt>Status</dt><dd><span className={"tag " + STATUS_TAG[h.status][0]}>{STATUS_TAG[h.status][1]}</span></dd>
        <dt>Rating</dt><dd>{h.rating ? `★ ${h.rating.avg} (${h.rating.count})` : "no reviews"}</dd>
        <dt>{h.role === "TRANSPORTER" ? "Trips" : "Deals"}</dt><dd>{h.deals}</dd>
        <dt>Cancellations, 30 days</dt><dd style={{ color: h.cancels30 >= 3 ? "var(--clay)" : undefined }}>{h.cancels30}</dd>
        {h.role === "TRANSPORTER" && <><dt>Failures, 30 days</dt><dd style={{ color: h.failures30 >= 3 ? "var(--clay)" : undefined }}>{h.failures30}</dd></>}
        <dt>Reports against</dt><dd>{h.reportsOpen} open / {h.reportsAll}</dd>
        <dt>Warnings</dt><dd>{h.warnings}</dd>
      </dl>
      {h.alerts.length > 0 && <div className="note bad small" style={{ marginBottom: 8 }}>Alert: {h.alerts.join(" · ")}</div>}
      {h.statusReason && <p className="small" style={{ marginBottom: 8 }}>Reason: {h.statusReason}</p>}
      {h.recent.length > 0 && <ul>{h.recent.map((r, i) => <li key={i}>{r.action}{r.reason ? `: ${r.reason}` : ""} <span className="muted">({r.by}, {ago(r.at)})</span></li>)}</ul>}
    </div>
  );
}

/** "Being handled by X" tag; the Super Admin (or the holder) can unlock. */
export function LockTag({ lock, lockKey, onChange }: { lock: Lock; lockKey: string; onChange: () => void }) {
  const { user } = useSession();
  const toast = useToast();
  if (!lock) return null;
  const mine = lock.byId === user?.id;
  return (
    <span className="lock" style={mine ? undefined : { background: "var(--mustard-tint)", color: "#7c5606" }}>
      {mine ? "Being handled by you" : `Being handled by ${lock.by}`} · releases after 15 min idle
      {(mine || user?.isSuperAdmin) && <button className="btn ghost sm" style={{ marginLeft: 8, padding: "0 6px" }} onClick={async () => { try { await api(`/admin/locks/${encodeURIComponent(lockKey)}/release`, { method: "POST" }); toast("Unlocked."); onChange(); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); } }}>{mine ? "Release" : "Unlock"}</button>}
    </span>
  );
}

/** Warn or suspend / ban with a written reason (always required). */
export function SanctionModal({ userId, name, mode, onClose, onDone }: { userId: string; name: string; mode: "warn" | "suspend"; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function go() {
    setBusy(true);
    try {
      if (mode === "warn") await api(`/admin/users/${userId}/warn`, { body: { reason } });
      else await api(`/admin/users/${userId}/suspend`, { body: { days: +days, reason } });
      toast(mode === "warn" ? `${name} received a warning.` : +days ? `${name} is suspended for ${days} days.` : `${name} is banned.`); onDone(); onClose();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); } finally { setBusy(false); }
  }
  return (
    <Modal title={mode === "warn" ? `Warn ${name}` : `Suspend or ban ${name}`} onClose={onClose} actions={<button className="btn warn" disabled={busy || reason.trim().length < 5} onClick={go}>{mode === "warn" ? "Send warning" : +days ? `Suspend ${days} days` : "Ban permanently"}</button>}>
      {mode === "suspend" && (
        <div className="choice" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          {[["7", "7 days"], ["30", "30 days"], ["0", "Permanent ban"]].map(([v, l]) => <div key={v}><input type="radio" id={"sd" + v} checked={days === v} onChange={() => setDays(v)} /><label htmlFor={"sd" + v}><b>{l}</b><small>{v === "0" ? "Only the Super Admin can lift it" : "Ends by itself"}</small></label></div>)}
        </div>
      )}
      <div className="field"><label htmlFor="sr">Written reason (required, the user sees it)</label><textarea id="sr" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      {mode === "suspend" && <p className="small muted">Active deals continue; the user cannot create new listings, bids, offers or trips.</p>}
    </Modal>
  );
}
