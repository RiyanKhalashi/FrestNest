"use client";
// Phase 4 UI pieces: farmer's emergency-sale setup, auto-start preference, driver's failure report.
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { tk, kg, Countdown, dateTime } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { FieldErr, Modal, useToast } from "../common/UI";
import { PlacePicker } from "../common/PlacePicker";
import { shrink } from "@/lib/image";

const REASONS: [string, string][] = [["BREAKDOWN", "Engine breakdown"], ["ACCIDENT", "Accident"], ["ROAD_BLOCKED", "Road blocked"], ["FLOOD", "Flood or heavy rain"], ["STRIKE", "Strike / hartal"], ["OTHER", "Other"]];
export const REASON_LABEL = Object.fromEntries(REASONS);
export const CONDITION_LABEL: Record<string, string> = { GOOD: "Good", PARTLY_DAMAGED: "Partly damaged", BADLY_DAMAGED: "Badly damaged" };

interface Setup {
  failure: { id: string; status: string; where: string; note: string | null; usableKg: number; condition: string; canMove: boolean; decidedAt: string | null };
  product: string; originalPrice: number; auto: boolean;
  suggestion: { hours: number; drop: number; start: number; buyNow: number | null; shelfLeftHours: number };
  emergency: { id: string; code: string; status: string; tier: number | null; tierLabel: string; endsAt: string | null } | null;
}

/** Farmer: what happens if delivery fails and I don't respond (chosen in advance on each deal). */
export function AutoPreference({ d, onChange }: { d: Deal; onChange: () => void }) {
  const toast = useToast();
  async function set(auto: boolean) { await api(`/emergency/deal/${d.id}/auto`, { body: { auto } }); toast(auto ? "If delivery fails, the emergency sale starts automatically after 30 minutes." : "If delivery fails, FreshNest waits for you to set up the emergency sale."); onChange(); }
  return (
    <div className="small" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span className="muted">If delivery fails and I don&apos;t respond within 30 min:</span>
      <label style={{ display: "inline-flex", gap: 5 }}><input type="radio" name={"auto-" + d.id} checked={d.emergencyAuto} onChange={() => set(true)} /> start the emergency sale with suggested values</label>
      <label style={{ display: "inline-flex", gap: 5 }}><input type="radio" name={"auto-" + d.id} checked={!d.emergencyAuto} onChange={() => set(false)} /> wait for me</label>
    </div>
  );
}

/** Farmer: set up (or follow) the emergency sale after an admin approved the failure. */
export function EmergencySetup({ d, onChange }: { d: Deal; onChange: () => void }) {
  const toast = useToast();
  const [s, setS] = useState<Setup | null>(null);
  const [f, setF] = useState({ hours: "3", drop: "25", buyNow: "" });
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Setup>(`/emergency/deal/${d.id}`).then((r) => { setS(r); setF({ hours: String(r.suggestion.hours), drop: String(r.suggestion.drop), buyNow: r.suggestion.buyNow ? String(r.suggestion.buyNow) : "" }); }).catch(() => {});
  }, [d.id, d.failure?.emergency?.id, d.failure?.emergency?.tier]);
  if (!s) return null;
  const start = Math.round(s.originalPrice * (1 - (+f.drop || 0) / 100) * 100) / 100;

  async function go() {
    setBusy(true); setFields({});
    try { await api(`/emergency/deal/${d.id}/start`, { body: { hours: +f.hours, drop: +f.drop, buyNow: f.buyNow ? +f.buyNow : null } }); toast("Emergency sale is live. Dealers near the vehicle are told first."); onChange(); }
    catch (e) { if (e instanceof ApiError) { toast(e.message); setFields(e.fields); } } finally { setBusy(false); }
  }
  async function widen() {
    try { await api(`/emergency/listing/${s!.emergency!.id}/widen`, { method: "POST" }); toast("Widened. More dealers are told."); onChange(); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); }
  }

  if (s.emergency) return (
    <div className="note good">
      <b>Emergency sale {s.emergency.code} is {s.emergency.status === "OPEN" ? "live" : s.emergency.status.toLowerCase()}.</b> {s.emergency.status === "OPEN" && <>Visible to: {s.emergency.tierLabel.toLowerCase()}. <Countdown to={s.emergency.endsAt} prefix="Ends in " done="Time is up" />. It widens by itself after 1 hour without bids.</>}
      <div className="btns" style={{ marginTop: 8 }}><Link className="btn sm" href={"/farmer/sales?l=" + s.emergency.id}>Open the emergency sale</Link>{s.emergency.status === "OPEN" && (s.emergency.tier ?? 1) < 3 && <button className="btn ghost sm" onClick={widen}>Widen now</button>}</div>
    </div>
  );
  return (
    <div>
      <div className="note warn" style={{ marginBottom: 12 }}>
        <b>The vehicle is stuck in {s.failure.where}{s.failure.note ? ` (${s.failure.note})` : ""}.</b> {kg(s.failure.usableKg)} is usable ({CONDITION_LABEL[s.failure.condition].toLowerCase()}), about <b>{s.suggestion.shelfLeftHours} hours</b> of shelf life left. {s.failure.canMove ? "The vehicle can still move, so it can deliver to a nearby buyer." : "The vehicle cannot move; a local transporter will collect from it."}
        {s.auto && s.failure.decidedAt && <> If you do nothing, the sale starts automatically with the suggested values about 30 minutes after approval ({dateTime(new Date(new Date(s.failure.decidedAt).getTime() + 30 * 60_000))}).</>}
      </div>
      <div className="note" style={{ marginBottom: 12 }}><b>Suggested for {s.suggestion.shelfLeftHours} h of shelf life:</b> drop the price by {s.suggestion.drop}% and run the bid for {s.suggestion.hours} hour{s.suggestion.hours > 1 ? "s" : ""}. You can change both.</div>
      <div className="row3">
        <div className="field"><label htmlFor={"ed-" + d.id}>Price drop (%)</label><input id={"ed-" + d.id} type="number" min={0} max={90} value={f.drop} onChange={(e) => setF({ ...f, drop: e.target.value })} /><small>Starting price <b className="num">{tk(start)}</b> / kg (was {tk(s.originalPrice)})</small><FieldErr e={fields.drop} /></div>
        <div className="field"><label htmlFor={"eh-" + d.id}>Bid duration</label><select id={"eh-" + d.id} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })}>{[1, 3, 6, 12].map((h) => <option key={h} value={h}>{h} hour{h > 1 ? "s" : ""}</option>)}</select></div>
        <div className="field"><label htmlFor={"eb-" + d.id}>Buy Now (৳/kg) <span className="muted" style={{ fontWeight: 400 }}>optional</span></label><input id={"eb-" + d.id} type="number" step="0.5" value={f.buyNow} onChange={(e) => setF({ ...f, buyNow: e.target.value })} /><FieldErr e={fields.buyNow} /></div>
      </div>
      <p className="small muted" style={{ marginBottom: 10 }}>Dealers in the stuck upazila are told first, then the whole district after 1 hour without bids, then neighbouring districts. The highest bid wins automatically.</p>
      <button className="btn" disabled={busy} onClick={go}>Start emergency sale</button>
    </div>
  );
}

/** Driver: report that the vehicle is stuck. */
export function FailureReport({ d, quantityKg, onClose, onDone }: { d: Deal; quantityKg: number; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ upazilaId: 0, locationNote: "", reason: "BREAKDOWN", details: "", condition: "GOOD", usableKg: String(quantityKg), canMove: "yes" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true); setFields({});
    const fd = new FormData();
    fd.append("data", JSON.stringify({ ...f, usableKg: +f.usableKg, canMove: f.canMove === "yes", locationNote: f.locationNote || undefined, details: f.details || undefined }));
    if (photo) fd.append("photo", await shrink(photo));
    try {
      const r = await fetch(`/api/transport/trips/${d.id}/failure`, { method: "POST", body: fd, credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new ApiError(j.error, r.status, j.fields);
      toast("Report sent. An admin checks it quickly; stay with the vehicle."); onDone(); onClose();
    } catch (e) { if (e instanceof ApiError) { toast(e.message); setFields(e.fields); } } finally { setBusy(false); }
  }
  return (
    <Modal title={`Report a delivery failure · ${d.code}`} onClose={onClose} actions={<button className="btn warn" disabled={busy || !f.upazilaId} onClick={send}>Send to admin</button>}>
      <p className="small muted" style={{ marginBottom: 10 }}>Use this only if the vehicle cannot reach the dealer. An admin checks it; if approved, the produce is sold to dealers near you so it does not go to waste.</p>
      <div className="lbl" style={{ marginBottom: 4 }}>Where is the vehicle now?</div>
      <PlacePicker value={f.upazilaId} onChange={(id) => setF({ ...f, upazilaId: id })} bad={!!fields.upazilaId} />
      <div className="field"><label htmlFor="fl">Exact place <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input id="fl" placeholder="e.g. Dhaka–Rangpur highway near Chandaikona" value={f.locationNote} onChange={(e) => setF({ ...f, locationNote: e.target.value })} /></div>
      <div className="row">
        <div className="field"><label htmlFor="fr">Reason</label><select id="fr" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>{REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor="fc">Produce condition</label><select id="fc" value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value })}>{Object.entries(CONDITION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="fd">What happened {f.reason === "OTHER" ? "(required)" : <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>}</label><textarea id="fd" rows={2} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /><FieldErr e={fields.details} /></div>
      <div className="row">
        <div className="field"><label htmlFor="fu">Usable quantity (kg)</label><input id="fu" type="number" min={1} max={quantityKg} value={f.usableKg} onChange={(e) => setF({ ...f, usableKg: e.target.value })} /><FieldErr e={fields.usableKg} /><small>Loaded: {kg(quantityKg)}</small></div>
        <div className="field"><label>Can the vehicle still move?</label>
          <div className="checks" style={{ margin: 0 }}><label><input type="radio" checked={f.canMove === "yes"} onChange={() => setF({ ...f, canMove: "yes" })} />Yes, slowly</label><label><input type="radio" checked={f.canMove === "no"} onChange={() => setF({ ...f, canMove: "no" })} />No</label></div>
          <small>{f.canMove === "yes" ? "You may deliver to a nearby buyer." : "A local transporter will collect from you."}</small></div>
      </div>
      <div className="field"><label htmlFor="fp">Photo proof (required)</label><input id="fp" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /><FieldErr e={fields.photo} /></div>
    </Modal>
  );
}
