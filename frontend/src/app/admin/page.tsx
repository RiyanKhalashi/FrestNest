"use client";
import { Icon } from "@/components/common/Icon";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ago, kg } from "@/lib/format";
import { useLiveEvent } from "@/lib/live";
import { Welcome } from "@/components/layout/Welcome";
import { useSession } from "@/components/layout/Session";
import { useAdminMode } from "@/lib/adminMode";

interface Overview {
  counts: { verifyUsers: number; verifyVehicles: number; failures: number; escalated: number; cancelReqs: number; reports: number; reviewReports: number; codes: number; savedKgThisMonth: number };
  alerts: { id: string; name: string; role: string; place: string; text: string }[];
  admins: { id: string; name: string; isSuperAdmin: boolean; permissions: string[]; lastSeenAt: string | null; online: boolean }[];
  log: { at: string; by: string; action: string; target: string | null; reason: string | null }[];
}
type Todo = { tag: [string, string]; text: React.ReactNode; href: string };
type Kpis = { deals: number; bidShare: number; users: number; onTime: number | null; cancelRate: number };

export default function Page() {
  const { user } = useSession();
  const [o, setO] = useState<Overview | null>(null);
  const [k, setK] = useState<Kpis | null>(null);
  const simple = useAdminMode() !== false;
  const load = useCallback(async () => setO(await api<Overview>("/admin/overview")), []);
  useEffect(() => { load(); api<{ kpis: Kpis }>("/admin/analytics/platform").then((r) => setK(r.kpis)).catch(() => {}); }, [load]);
  useLiveEvent("notification", load);
  const can = (p: string) => !!user && (user.isSuperAdmin || user.permissions.includes(p as never));
  if (!o) return <><Welcome code="A1" line="The admin office" /><p className="muted">Loading…</p></>;
  const c = o.counts;
  const todo: Todo[] = [];
  if (can("DEALS") && c.failures) todo.push({ tag: [c.escalated ? "red" : "gold", c.escalated ? "Escalated" : "Failure"], text: <><b>{c.failures} delivery failure{c.failures > 1 ? "s" : ""} waiting</b>{c.escalated ? ` · ${c.escalated} over 30 minutes` : ""}<br /><span className="muted small">Produce is losing shelf life while it waits</span></>, href: "/admin/failures" });
  if (can("DEALS") && c.cancelReqs) todo.push({ tag: ["gold", "Cancel"], text: <><b>{c.cancelReqs} cancellation request{c.cancelReqs > 1 ? "s" : ""}</b><br /><span className="muted small">Transport is already booked</span></>, href: "/admin/cases?tab=cancel" });
  if (can("VERIFY") && c.verifyUsers + c.verifyVehicles) todo.push({ tag: ["plain", "Verify"], text: <><b>{c.verifyUsers + c.verifyVehicles} waiting</b>: {c.verifyUsers} account{c.verifyUsers === 1 ? "" : "s"}, {c.verifyVehicles} vehicle{c.verifyVehicles === 1 ? "" : "s"}</>, href: "/admin/verification" });
  if (can("REPORTS") && c.reports + c.reviewReports) todo.push({ tag: ["slate", "Report"], text: <><b>{c.reports} report{c.reports === 1 ? "" : "s"}</b> and <b>{c.reviewReports} reported review{c.reviewReports === 1 ? "" : "s"}</b> open</>, href: "/admin/cases?tab=reports" });
  if (can("DEALS") && c.codes) todo.push({ tag: ["red", "Code"], text: <><b>{c.codes} code{c.codes > 1 ? "s" : ""} locked</b> after 5 wrong tries</>, href: "/admin/cases?tab=codes" });
  const online = o.admins.filter((a) => a.online).length;

  return (
    <>
      <Welcome code="A1" line={simple ? "Keep the marketplace safe and fair" : `${online} admin${online === 1 ? "" : "s"} online`} />
      <div className="stats">
        <div><i className="si"><Icon name="shield" /></i><span>Waiting verification</span><b className="num">{c.verifyUsers + c.verifyVehicles}</b><small>{c.verifyUsers} accounts · {c.verifyVehicles} vehicles</small></div>
        <div><i className="si"><Icon name="alert" /></i><span>Delivery failures</span><b className="num">{c.failures}</b><small>{c.escalated} escalated</small></div>
        <div><i className="si"><Icon name="list" /></i><span>Open cases</span><b className="num">{c.cancelReqs + c.reports + c.reviewReports + c.codes}</b><small>{c.cancelReqs} cancel · {c.reports} reports · {c.reviewReports} reviews</small></div>
        <div><i className="si"><Icon name="leaf" /></i><span>Saved by emergency sales</span><b className="num">{kg(c.savedKgThisMonth)}</b><small>this month</small></div>
      </div>
      {k && <div className="panel" style={{ marginBottom: 18 }}><h3>Platform at a glance {simple && <Link className="small" href="/admin/business">Business</Link>}</h3>
        <div className="stats alt" style={{ margin: 0, border: 0, borderRadius: 0 }}>
          <div><i className="si"><Icon name="check" /></i><span>Deals completed</span><b className="num">{k.deals.toLocaleString("en-IN")}</b><small>last 12 weeks · {k.bidShare}% through bidding</small></div>
          <div><i className="si"><Icon name="users" /></i><span>Active users</span><b className="num">{k.users.toLocaleString("en-IN")}</b><small>farmers, dealers, transporters</small></div>
          <div><i className="si"><Icon name="truck" /></i><span>Delivered on time</span><b className="num">{k.onTime ?? "—"}%</b><small>last 3 months</small></div>
          <div><i className="si"><Icon name="alert" /></i><span>Deals cancelled</span><b className="num">{k.cancelRate}%</b><small>last 30 days</small></div>
        </div>
      </div>}
      <div className="grid g-main">
        <div className="grid">
          <div className="panel"><h3>Needs action now</h3>
            {todo.length ? <table className="ledger"><tbody>{todo.map((t, i) => <tr key={i}><td style={{ width: 96 }}><span className={"tag " + t.tag[0]}>{t.tag[1]}</span></td><td>{t.text}</td><td className="right"><Link className="btn ghost sm" href={t.href}>Open</Link></td></tr>)}</tbody></table> : <p className="pb muted">Nothing waiting for your permissions.</p>}
          </div>
          {user?.isSuperAdmin && <div className="panel"><h3>Recent activity {!simple && <Link className="small" href="/admin/team">Activity log</Link>}</h3>
            <table className="ledger log"><tbody>{o.log.map((l, i) => <tr key={i}><td>{ago(l.at)}</td><td><b>{l.by}</b></td><td>{l.action}{l.target ? ` · ${l.target}` : ""}</td></tr>)}</tbody></table></div>}
        </div>
        <div className="grid">
          <div className="panel"><h3>Automatic alerts <small>3 or more in 30 days</small></h3>
            {o.alerts.length ? <table className="ledger"><tbody>{o.alerts.slice(0, 8).map((a) => <tr key={a.id}><td><span className="tag slate">{a.role === "TRANSPORTER" ? "Transporter" : a.role === "DEALER" ? "Dealer" : "Farmer"}</span></td><td><b>{a.name}</b> · {a.place}<br /><span className="muted small">{a.text}</span></td></tr>)}</tbody></table> : <p className="pb muted">No alerts.</p>}
            <p className="small muted" style={{ padding: "10px 16px" }}>Alerts only. Nothing happens to the user until an admin acts.</p>
          </div>
          {!simple && <div className="panel"><h3>Admins</h3>
            <table className="ledger"><tbody>{o.admins.map((a) => <tr key={a.id}><td><b>{a.name}</b><br /><span className="muted small">{a.isSuperAdmin ? "Super Admin" : a.permissions.map((p) => p[0] + p.slice(1).toLowerCase()).join(" · ")}</span></td><td className="right">{a.online ? <span className="tag green">Online</span> : <span className="tag plain">{a.lastSeenAt ? "Seen " + ago(a.lastSeenAt) : "Not yet"}</span>}</td></tr>)}</tbody></table>
          </div>}
        </div>
      </div>
    </>
  );
}
