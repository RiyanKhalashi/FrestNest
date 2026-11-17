"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type District } from "@/lib/api";
import { dateShort } from "@/lib/format";
import { Modal, useToast } from "@/components/ui";
import { useSession } from "@/components/Session";
import { HistoryPanel, SanctionModal, STATUS_TAG } from "@/components/admin";

interface Row { id: string; name: string; person: string; role: string; phone: string; place: string; status: string; statusReason: string | null; suspendedUntil: string | null; rating: { avg: number; count: number } | null; failures: number; alert: string | null; since: string; partnerOffers: boolean }
const ROLE: Record<string, string> = { FARMER: "Farmer", DEALER: "Dealer", TRANSPORTER: "Transporter" };

export default function Page() {
  const { user } = useSession();
  const toast = useToast();
  const [f, setF] = useState({ q: "", role: "", districtId: "", upazilaId: "", status: "" });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [open, setOpen] = useState<Row | null>(null);
  const [sanction, setSanction] = useState<"warn" | "suspend" | null>(null);
  const [n, setN] = useState(0);
  const canAct = !!user && (user.isSuperAdmin || user.permissions.includes("REPORTS"));
  const load = useCallback(async () => {
    const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
    setRows((await api<{ users: Row[] }>("/admin/users?" + q)).users);
  }, [f]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api<{ districts: District[] }>("/meta/locations").then((r) => setDistricts(r.districts)); }, []);
  const ups = districts.find((d) => String(d.id) === f.districtId)?.upazilas ?? [];
  async function lift(u: Row) {
    try { await api(`/admin/users/${u.id}/lift`, { method: "POST" }); toast(`${u.name} can use FreshNest again.`); setOpen(null); load(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); }
  }
  return (
    <>
      <div className="head"><div><h1>Users</h1><p>Everyone on FreshNest. Search by name or phone and filter down to the upazila.</p></div><span className="code">Screen A5</span></div>
      <div className="panel" style={{ marginBottom: 16 }}><div className="pb" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
        <div className="field" style={{ margin: 0 }}><label htmlFor="uq">Search</label><input id="uq" placeholder="Name, shop or phone" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="ur">Role</label><select id="ur" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="">All roles</option><option value="FARMER">Farmers</option><option value="DEALER">Dealers</option><option value="TRANSPORTER">Transporters</option></select></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="ud">District</label><select id="ud" value={f.districtId} onChange={(e) => setF({ ...f, districtId: e.target.value, upazilaId: "" })}><option value="">All districts</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="uu">Upazila</label><select id="uu" value={f.upazilaId} disabled={!ups.length} onChange={(e) => setF({ ...f, upazilaId: e.target.value })}><option value="">All upazilas</option>{ups.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="us">Status</label><select id="us" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Any</option>{Object.entries(STATUS_TAG).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}</select></div>
      </div></div>
      <div className="panel">
        <table className="ledger">
          <thead><tr><th>Name</th><th>Role</th><th>Upazila, district</th><th className="right">Rating</th><th>Status</th><th>Alert</th><th /></tr></thead>
          <tbody>{(rows ?? []).map((u) => (
            <tr key={u.id} className="click" onClick={() => setOpen(u)}>
              <td><b>{u.name}</b>{u.name !== u.person && <span className="muted small"> · {u.person}</span>}<br /><span className="muted small">{u.phone} · since {dateShort(u.since)}</span></td>
              <td>{ROLE[u.role]}{u.role !== "FARMER" && u.status === "ACTIVE" && <> <span className="tag green">Verified</span></>}</td>
              <td>{u.place}</td>
              <td className="right num">{u.rating ? `★ ${u.rating.avg}` : "—"}</td>
              <td><span className={"tag " + STATUS_TAG[u.status][0]}>{STATUS_TAG[u.status][1]}</span>{u.suspendedUntil && <div className="small muted">until {dateShort(u.suspendedUntil)}</div>}</td>
              <td className="small" style={{ color: u.alert ? "var(--clay)" : undefined }}>{u.alert ?? ""}</td>
              <td className="right"><button className="btn ghost sm">Open</button></td>
            </tr>
          ))}</tbody>
        </table>
        {rows && !rows.length && <p className="pb muted">No users match.</p>}
        {rows && rows.length >= 300 && <p className="pb small muted">Showing the newest 300. Narrow the filters to see others.</p>}
      </div>
      {open && !sanction && (
        <Modal title={open.name} onClose={() => setOpen(null)} actions={canAct ? (
          open.status === "SUSPENDED" || open.status === "BANNED"
            ? <button className="btn slate" disabled={open.status === "BANNED" && !user?.isSuperAdmin} onClick={() => lift(open)}>{open.status === "BANNED" ? "Lift ban" : "Lift suspension"}</button>
            : <><button className="btn ghost" onClick={() => setSanction("warn")}>Warn</button><button className="btn warn" onClick={() => setSanction("suspend")}>Suspend or ban</button></>
        ) : null}>
          <HistoryPanel userId={open.id} refresh={n} />
          {open.status === "BANNED" && !user?.isSuperAdmin && <p className="small muted" style={{ marginTop: 8 }}>Only the Super Admin can lift a ban.</p>}
          {open.role === "FARMER" && <p className="small muted" style={{ marginTop: 8 }}>Agri partner offers: {open.partnerOffers ? "on (name may be shown to companies)" : "off (only in upazila totals)"}</p>}
        </Modal>
      )}
      {open && sanction && <SanctionModal userId={open.id} name={open.name} mode={sanction} onClose={() => setSanction(null)} onDone={() => { setN(n + 1); load(); }} />}
    </>
  );
}
