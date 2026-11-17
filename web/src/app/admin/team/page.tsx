"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ago, dateTime } from "@/lib/format";
import { FieldErr, Modal, useToast } from "@/components/ui";

interface Admin { id: string; name: string; phone: string; isSuperAdmin: boolean; permissions: string[]; lastSeenAt: string | null; _count: { adminActions: number } }
interface Log { at: string; by: string; action: string; target: string | null; reason: string | null }
const PERMS: [string, string][] = [["VERIFY", "Verification"], ["DEALS", "Delivery failures & cancellations"], ["REPORTS", "Reports & reviews"], ["ANNOUNCE", "Announcements"], ["ANALYTICS", "Analytics"]];
const SETTINGS: [string, string, string][] = [
  ["minBiddingHoursDistrict", "Minimum bidding time, upazila / district (hours)", "12"], ["minBiddingHoursNationwide", "Minimum bidding time, nationwide (hours)", "24"],
  ["transportOfferWindowHours", "Transport offer window (hours)", "12"], ["resaleShelfLeftPercent", "Shelf life left when it reaches the dealer (%)", "40"],
  ["smallPickupMaxKg", "Small local pickup limit (kg)", "300"], ["subscriptionFeePerUpazila", "Company report fee per upazila per month (৳)", "1500"],
];

export default function Page() {
  const toast = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [log, setLog] = useState<Log[]>([]);
  const [page, setPage] = useState(0);
  const [add, setAdd] = useState(false);
  const [remove, setRemove] = useState<Admin | null>(null);
  const [f, setF] = useState({ name: "", phone: "", password: "", permissions: [] as string[] });
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const load = useCallback(async () => {
    const t = await api<{ admins: Admin[]; settings: Record<string, number> }>("/admin/team");
    setAdmins(t.admins); setSettings(Object.fromEntries(Object.entries(t.settings).map(([k, v]) => [k, String(v)])));
  }, []);
  const loadLog = useCallback(async () => setLog((await api<{ items: Log[] }>(`/admin/log?page=${page}`)).items), [page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadLog(); }, [loadLog]);

  async function setPerm(a: Admin, p: string, on: boolean) {
    const permissions = on ? [...a.permissions, p] : a.permissions.filter((x) => x !== p);
    await api(`/admin/team/${a.id}`, { method: "PUT", body: { permissions } }); toast(`${on ? "Gave" : "Removed"} ${PERMS.find((x) => x[0] === p)?.[1].toLowerCase()} for ${a.name}.`); load(); loadLog();
  }
  async function create() {
    setFields({});
    try { await api("/admin/team", { body: f }); toast(`${f.name} can now sign in with their phone and password.`); setAdd(false); setF({ name: "", phone: "", password: "", permissions: [] }); load(); loadLog(); }
    catch (e) { if (e instanceof ApiError) { toast(e.message); setFields(e.fields); } }
  }
  async function saveSettings() {
    try { await api("/admin/settings", { method: "PUT", body: Object.fromEntries(Object.entries(settings).filter(([k]) => SETTINGS.some((s) => s[0] === k)).map(([k, v]) => [k, Number(v)])) }); toast("Settings saved. New listings and offers use them."); loadLog(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); }
  }
  return (
    <>
      <div className="head"><div><h1>Admin team &amp; settings</h1><p>Admins, their permissions, system settings and the activity log. Super Admin only.</p></div><span className="code">Screen A9</span></div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Admins <button className="btn ghost sm" onClick={() => setAdd(true)}>+ Add admin</button></h3>
        <table className="ledger"><thead><tr><th>Admin</th><th>Permissions</th><th className="right">Actions</th><th>Last seen</th><th /></tr></thead>
          <tbody>{admins.map((a) => (
            <tr key={a.id}><td><b>{a.name}</b><br /><span className="muted small">{a.phone}</span></td>
              <td>{a.isSuperAdmin ? <span className="muted">Everything (Super Admin)</span> : <div className="perm">{PERMS.map(([k, l]) => <label key={k}><input type="checkbox" checked={a.permissions.includes(k)} onChange={(e) => setPerm(a, k, e.target.checked)} />{l}</label>)}</div>}</td>
              <td className="right num">{a._count.adminActions}</td><td className="small">{a.lastSeenAt ? ago(a.lastSeenAt) : "never"}</td>
              <td className="right">{!a.isSuperAdmin && <button className="btn warn sm" onClick={() => setRemove(a)}>Remove</button>}</td></tr>
          ))}</tbody></table>
      </div>
      <div className="grid g2">
        <div className="panel"><h3>System settings</h3><div className="pb">
          {SETTINGS.map(([k, l, def]) => <div className="field" key={k}><label htmlFor={k}>{l}</label><input id={k} type="number" value={settings[k] ?? def} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })} /></div>)}
          <button className="btn slate" onClick={saveSettings}>Save settings</button>
          <p className="small muted" style={{ marginTop: 8 }}>The season calendar is in Products &amp; seasons.</p>
        </div></div>
        <div className="panel"><h3>Activity log <small>every admin action</small></h3>
          <table className="ledger log"><tbody>{log.map((l, i) => <tr key={i}><td>{dateTime(l.at)}</td><td><b>{l.by}</b></td><td>{l.action}{l.target ? ` · ${l.target}` : ""}{l.reason ? <span className="muted"> · {l.reason}</span> : null}</td></tr>)}</tbody></table>
          <div className="btns" style={{ padding: 12 }}><button className="btn ghost sm" disabled={!page} onClick={() => setPage(page - 1)}>Newer</button><button className="btn ghost sm" disabled={log.length < 50} onClick={() => setPage(page + 1)}>Older</button></div>
        </div>
      </div>
      {add && (
        <Modal title="Add admin" onClose={() => setAdd(false)} actions={<button className="btn slate" onClick={create}>Add admin</button>}>
          <div className="row"><div className="field"><label htmlFor="an">Name</label><input id="an" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><FieldErr e={fields.name} /></div>
            <div className="field"><label htmlFor="aph">Phone (sign-in)</label><input id="aph" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /><FieldErr e={fields.phone} /></div></div>
          <div className="field"><label htmlFor="apw">First password</label><input id="apw" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><FieldErr e={fields.password} /><small>They can change it in their profile.</small></div>
          <div className="field perm"><label>Permissions</label><div>{PERMS.map(([k, l]) => <label key={k}><input type="checkbox" checked={f.permissions.includes(k)} onChange={(e) => setF({ ...f, permissions: e.target.checked ? [...f.permissions, k] : f.permissions.filter((x) => x !== k) })} />{l}</label>)}</div><FieldErr e={fields.permissions} /></div>
        </Modal>
      )}
      {remove && (
        <Modal title={`Remove ${remove.name}?`} onClose={() => setRemove(null)} actions={<button className="btn warn" onClick={async () => { await api(`/admin/team/${remove.id}`, { method: "DELETE" }); toast(`${remove.name} no longer has admin access.`); setRemove(null); load(); loadLog(); }}>Remove</button>}>
          <p>They lose access to the admin office immediately. Their past actions stay in the activity log.</p>
        </Modal>
      )}
    </>
  );
}
