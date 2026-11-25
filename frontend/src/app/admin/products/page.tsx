"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Modal, FieldErr, useToast } from "@/components/common/UI";
import { Fac } from "@/components/transport/TransportParts";
import type { Storage } from "@/lib/types";

interface Prod { id: number; nameEn: string; nameBn: string; category: string; shelfLifeDays: number; storage: Storage; ventilatedForLongTrips: boolean; active: boolean; listings: number }
interface Sugg { name: string; category: string; farmers: number; listings: number; shelfLifeDays: number; storage: Storage; where: string }
interface Season { key: "winter" | "summer" | "monsoon"; name: string; advice: string; risk: boolean; monthsList: number[] }
type Form = { id?: number; nameEn: string; nameBn: string; category: string; shelfLifeDays: string; storage: Storage; ventilatedForLongTrips: boolean; active: boolean };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SEASON_BG: Record<string, string> = { winter: "#e4ecdc", summer: "#f6e3c9", monsoon: "#d9e8f1" };
const NEXT: Record<string, string> = { winter: "summer", summer: "monsoon", monsoon: "winter" };
const BLANK: Form = { nameEn: "", nameBn: "", category: "Vegetable", shelfLifeDays: "", storage: "NORMAL", ventilatedForLongTrips: false, active: true };

export default function Page() {
  const toast = useToast();
  const [d, setD] = useState<{ products: Prod[]; suggestions: Sugg[]; seasons: Season[] } | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [months, setMonths] = useState<Record<number, string>>({});
  const load = useCallback(async () => {
    const x = await api<{ products: Prod[]; suggestions: Sugg[]; seasons: Season[] }>("/admin/products");
    setD(x);
    setMonths(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, x.seasons.find((s) => s.monthsList.includes(i + 1))?.key ?? "winter"])));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form) return;
    setFields({});
    const body = { nameEn: form.nameEn, nameBn: form.nameBn, category: form.category, shelfLifeDays: +form.shelfLifeDays, storage: form.storage, ventilatedForLongTrips: form.ventilatedForLongTrips, active: form.active };
    try {
      if (form.id) await api(`/admin/products/${form.id}`, { method: "PUT", body }); else await api("/admin/products", { body });
      toast(form.id ? "Saved." : `${form.nameEn} added. Farmers can choose it now.`); setForm(null); load();
    } catch (e) { if (e instanceof ApiError) { toast(e.message); setFields(e.fields); } }
  }
  async function saveSeasons() {
    const body: Record<string, number[]> = { winter: [], summer: [], monsoon: [] };
    Object.entries(months).forEach(([m, k]) => body[k].push(+m));
    try { await api("/admin/seasons", { method: "PUT", body }); toast("Season calendar saved. Transport advice uses it at once."); load(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); }
  }
  if (!d) return <p className="muted">Loading…</p>;
  return (
    <>
      <div className="head"><div><h1>Products &amp; seasons</h1><p>The product list farmers choose from, with shelf life and the vehicle each needs. Super Admin only.</p></div><span className="code">Screen A6</span></div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Suggested by farmers <small>products farmers typed because they were not in the list</small></h3>
        {d.suggestions.length ? (
          <table className="ledger"><thead><tr><th>Product</th><th className="right">Farmers</th><th className="right">Their shelf life</th><th>Vehicle</th><th>Where</th><th /></tr></thead>
            <tbody>{d.suggestions.map((s) => <tr key={s.name}><td><b>{s.name}</b> <span className="muted small">{s.category}</span></td><td className="right num">{s.farmers}</td><td className="right num">{s.shelfLifeDays} days</td><td><Fac f={s.storage} /></td><td className="small">{s.where}</td>
              <td className="right"><button className="btn slate sm" onClick={() => setForm({ ...BLANK, nameEn: s.name, category: s.category, shelfLifeDays: String(s.shelfLifeDays), storage: s.storage })}>Add to list</button></td></tr>)}</tbody></table>
        ) : <p className="pb muted">No suggestions. When farmers list something that is not in the list, it appears here.</p>}
      </div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Product list <button className="btn ghost sm" onClick={() => setForm(BLANK)}>+ Add product</button></h3>
        <table className="ledger"><thead><tr><th>English</th><th>Bangla</th><th>Category</th><th className="right">Shelf life</th><th>Vehicle needed</th><th className="right">Listings</th><th /></tr></thead>
          <tbody>{d.products.map((p) => (
            <tr key={p.id} className={p.active ? "" : "off"}><td><b>{p.nameEn}</b></td><td>{p.nameBn}</td><td>{p.category}</td><td className="right num">{p.shelfLifeDays} days</td>
              <td><Fac f={p.storage} />{p.ventilatedForLongTrips && <span className="small muted"> · ventilated for long trips</span>}</td><td className="right num">{p.listings}</td>
              <td className="right"><button className="btn ghost sm" onClick={() => setForm({ id: p.id, nameEn: p.nameEn, nameBn: p.nameBn, category: p.category, shelfLifeDays: String(p.shelfLifeDays), storage: p.storage, ventilatedForLongTrips: p.ventilatedForLongTrips, active: p.active })}>Edit</button></td></tr>
          ))}</tbody></table>
      </div>
      <div className="panel">
        <h3>Season calendar <small>advice only, for normal vehicles · click a month to change its season</small></h3>
        <div className="pb">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 4, marginBottom: 12 }}>
            {MONTHS.map((m, i) => { const k = months[i + 1] ?? "winter"; return (
              <button key={m} onClick={() => setMonths({ ...months, [i + 1]: NEXT[k] })} style={{ border: "1px solid var(--line)", borderRadius: 4, padding: "8px 2px", background: SEASON_BG[k], cursor: "pointer", font: "inherit", fontSize: 12 }}>
                <b>{m}</b><br />{d.seasons.find((s) => s.key === k)?.name}
              </button>
            ); })}
          </div>
          <table className="ledger"><tbody>{d.seasons.map((s) => <tr key={s.key}><td style={{ width: 120 }}><span className="tag" style={{ background: SEASON_BG[s.key], color: "var(--ink)" }}>{s.name}</span></td><td className="small">{s.advice}</td><td className="small muted">{s.risk ? "Warning on normal vehicles" : "Cost-saving tag on normal vehicles"}</td></tr>)}</tbody></table>
          <button className="btn slate" style={{ marginTop: 12 }} onClick={saveSeasons}>Save calendar</button>
        </div>
      </div>
      {form && (
        <Modal title={form.id ? `Edit ${form.nameEn}` : "Add product"} onClose={() => setForm(null)} actions={<button className="btn slate" onClick={save}>Save</button>}>
          <div className="row">
            <div className="field"><label htmlFor="pe">Name (English)</label><input id="pe" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /><FieldErr e={fields.nameEn} /></div>
            <div className="field"><label htmlFor="pbn">Name (Bangla)</label><input id="pbn" value={form.nameBn} onChange={(e) => setForm({ ...form, nameBn: e.target.value })} /><FieldErr e={fields.nameBn} /></div>
          </div>
          <div className="row">
            <div className="field"><label htmlFor="pc">Category</label><select id="pc" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Vegetable</option><option>Fruit</option></select></div>
            <div className="field"><label htmlFor="ps">Shelf life (days)</label><input id="ps" type="number" min={1} value={form.shelfLifeDays} onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value })} /><FieldErr e={fields.shelfLifeDays} /></div>
          </div>
          <div className="field"><label htmlFor="pv">Vehicle needed</label><select id="pv" value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value as Storage })}><option value="NORMAL">Normal</option><option value="VENTILATED">Ventilated</option><option value="REFRIGERATED">Refrigerated</option></select></div>
          <label className="small" style={{ display: "flex", gap: 6, marginBottom: 8 }}><input type="checkbox" checked={form.ventilatedForLongTrips} onChange={(e) => setForm({ ...form, ventilatedForLongTrips: e.target.checked })} />Normal locally, ventilated only for long (nationwide) trips</label>
          {form.id && <label className="small" style={{ display: "flex", gap: 6 }}><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Farmers can choose it (untick to hide; old listings keep it)</label>}
        </Modal>
      )}
    </>
  );
}
