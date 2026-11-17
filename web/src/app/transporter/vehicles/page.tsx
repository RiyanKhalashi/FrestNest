"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTime, kg } from "@/lib/format";
import type { Vehicle } from "@/lib/types";
import { shrink } from "@/lib/image";
import { FieldErr, useToast } from "@/components/ui";
import { Fac } from "@/components/transport";

const TYPES: [string, string][] = [["PICKUP", "Pickup"], ["MINI_TRUCK", "Mini truck"], ["TRUCK", "Truck"], ["COVERED_VAN", "Covered van"]];

function Truck() {
  return <svg viewBox="0 0 64 34" width="64" height="34" fill="none" stroke="#24452f" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h34v19H3z" fill="#f1e9d6" /><path d="M37 12h12l8 8v5H37z" fill="#e3ecd8" /><circle cx="14" cy="27" r="4" fill="#fff" /><circle cx="48" cy="27" r="4" fill="#fff" /><path d="M41 15h7l4 4h-11z" fill="#fff" /></svg>;
}

export default function Page() {
  const [vs, setVs] = useState<Vehicle[] | null>(null);
  const [add, setAdd] = useState(false);
  const [f, setF] = useState({ type: "TRUCK", regNo: "", capacityKg: "", facility: "NORMAL" });
  const [doc, setDoc] = useState<File | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const load = useCallback(async () => setVs((await api<{ vehicles: Vehicle[] }>("/vehicles")).vehicles), []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setBusy(true); setFields({});
    const fd = new FormData();
    fd.append("data", JSON.stringify({ ...f, capacityKg: +f.capacityKg }));
    if (doc) fd.append("doc", await shrink(doc));
    try {
      const r = await fetch("/api/vehicles", { method: "POST", body: fd, credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new ApiError(j.error, r.status, j.fields);
      toast("Vehicle added. An admin checks the registration before you can offer it.");
      setAdd(false); setF({ type: "TRUCK", regNo: "", capacityKg: "", facility: "NORMAL" }); setDoc(null); load();
    } catch (e) { if (e instanceof ApiError) { toast(e.message); setFields(e.fields); } } finally { setBusy(false); }
  }
  async function setActive(v: Vehicle, active: boolean) {
    await api(`/vehicles/${v.id}/active`, { body: { active } });
    toast(active ? `${v.regNo} is available for new offers.` : `${v.regNo} is turned off. Its waiting offers were withdrawn; confirmed trips stay.`);
    load();
  }

  return (
    <>
      <div className="head"><div><h1>My vehicles</h1><p>Each vehicle is matched by its facility and capacity. An admin checks every registration.</p></div><span className="code">Screen T4</span></div>
      {!vs ? <p className="muted">Loading…</p> : (
        <div className="fleet">
          {vs.map((v) => (
            <div key={v.id} className="vcard">
              <div className="vpic"><Truck /></div>
              <div className="vb">
                <h4>{v.label} <Fac f={v.facility} /></h4>
                <div style={{ margin: "4px 0 8px" }}><span className="plate">{v.regNo}</span></div>
                <div className="small muted">Carries up to {kg(v.capacityKg)} · {v.tripsDone} trip{v.tripsDone === 1 ? "" : "s"} completed</div>
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {v.status === "APPROVED" ? <span className="tag green">Approved</span> : v.status === "PENDING" ? <span className="tag gold">Waiting for admin check</span> : <span className="tag red">Rejected{v.statusNote ? ": " + v.statusNote : ""}</span>}
                  {!v.active && <span className="tag plain">Turned off</span>}
                  {v.bookings.length > 0 && <span className="tag blue">Booked</span>}
                </div>
                {v.bookings.map((b) => <div key={b.deal} className="small" style={{ marginTop: 6 }}>{b.deal}: {dateTime(b.pickupAt)} → {dateTime(b.deliverBy)}</div>)}
                {v.status === "APPROVED" && <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setActive(v, !v.active)}>{v.active ? "Turn off" : "Turn on"}</button>}
              </div>
            </div>
          ))}
          {!add && <button className="vcard add" onClick={() => setAdd(true)} style={{ cursor: "pointer", font: "inherit" }}><div className="vb" style={{ textAlign: "center", width: "100%" }}><b style={{ fontSize: 22 }}>+</b><br />Add a vehicle</div></button>}
        </div>
      )}
      {add && (
        <div className="panel" style={{ marginTop: 18, maxWidth: 720 }}>
          <h3>Add a vehicle</h3>
          <div className="pb">
            <div className="row">
              <div className="field"><label htmlFor="vt">Type</label><select id="vt" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div className="field"><label htmlFor="vr">Registration number</label><input id="vr" placeholder="Bogura-Ta 14-0932" value={f.regNo} onChange={(e) => setF({ ...f, regNo: e.target.value })} /><FieldErr e={fields.regNo} /></div>
            </div>
            <div className="row">
              <div className="field"><label htmlFor="vc">Load capacity (kg)</label><input id="vc" type="number" min={100} step={100} value={f.capacityKg} onChange={(e) => setF({ ...f, capacityKg: e.target.value })} /><FieldErr e={fields.capacityKg} /></div>
              <div className="field"><label htmlFor="vf">Facility</label><select id="vf" value={f.facility} onChange={(e) => setF({ ...f, facility: e.target.value })}><option value="NORMAL">Normal (open or covered)</option><option value="VENTILATED">Ventilated</option><option value="REFRIGERATED">Refrigerated</option></select></div>
            </div>
            <div className="field"><label htmlFor="vd">Registration document photo</label><input id="vd" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} /><small>Only you and FreshNest admins can see it.</small></div>
            <div className="btns"><button className="btn rust" disabled={busy || !f.regNo || !f.capacityKg} onClick={save}>Add vehicle</button><button className="btn ghost" onClick={() => setAdd(false)}>Cancel</button></div>
          </div>
        </div>
      )}
    </>
  );
}
