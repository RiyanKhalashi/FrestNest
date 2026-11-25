"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { ago, dateTime, kg } from "@/lib/format";
import { useLiveEvent } from "@/lib/live";
import { Empty, Modal, useToast } from "@/components/common/UI";
import { Stars } from "@/components/transport/TransportParts";
import { HistoryPanel, LockTag, type Lock } from "@/components/admin/AdminTools";

interface CancelReq { id: string; status: string; at: string; reason: string; decisionNote: string | null; byRole: string; by: { id: string; name: string }; deal: { id: string; code: string; product: string; quantityKg: number; status: string; farmer: string; dealer: string; transporter: string | null; pickupAt: string | null }; lock: Lock }
interface Rep { id: string; status: string; at: string; kind: string; details: string; deal: string | null; decisionNote: string | null; by: { id: string; name: string; role: string }; against: { id: string; name: string; role: string; status: string }; review: { id: string; stars: number; comment: string; hidden: boolean } | null; lock: Lock }
interface Code { id: string; code: string; product: string; status: string; farmer: string; dealer: string; attempts: number }
interface Cases { can: { deals: boolean; reports: boolean }; cancel: CancelReq[]; reports: Rep[]; codes: Code[] }
type Tab = "cancel" | "reports" | "reviews" | "codes";
type Act = { kind: "cancel"; action: "approve" | "reject" } | { kind: "report"; action: "warn" | "suspend" | "dismiss" | "hide" | "keep" };
const KIND: Record<string, string> = { PRICE_CHANGED: "Asked for a lower price after the deal", NO_SHOW: "Did not come / did not hand over", WRONG_QUALITY: "Quality not as described", RUDE: "Rude behaviour", FAKE_REVIEW: "Fake or abusive review", OTHER: "Other" };
const ACT_TITLE: Record<string, string> = { approve: "Approve cancellation", reject: "Reject cancellation", warn: "Warn user", suspend: "Suspend or ban", dismiss: "Dismiss report", hide: "Hide review", keep: "Keep review" };

function Cases() {
  const toast = useToast();
  const params = useSearchParams();
  const [d, setD] = useState<Cases | null>(null);
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) ?? "cancel");
  const [sel, setSel] = useState<string | null>(null);
  const [act, setAct] = useState<Act | null>(null);
  const [note, setNote] = useState("");
  const [days, setDays] = useState("7");
  const [n, setN] = useState(0);
  const [older, setOlder] = useState(false);
  const load = useCallback(async () => setD(await api<Cases>("/admin/cases")), []);
  useEffect(() => { load(); }, [load]);
  useLiveEvent("notification", load);
  if (!d) return <p className="muted">Loading…</p>;

  const reports = d.reports.filter((r) => !r.review), reviews = d.reports.filter((r) => r.review);
  const open = { cancel: d.cancel.filter((c) => c.status === "PENDING").length, reports: reports.filter((r) => r.status === "OPEN").length, reviews: reviews.filter((r) => r.status === "OPEN").length, codes: d.codes.length };
  const tabs = ([["cancel", "Cancellation requests", d.can.deals], ["reports", "Reports", d.can.reports], ["reviews", "Reviews", d.can.reports], ["codes", "Locked codes", d.can.deals]] as [Tab, string, boolean][]).filter((x) => x[2]);
  const t = tabs.find((x) => x[0] === tab)?.[0] ?? tabs[0]?.[0];
  const take = async (key: string) => { setSel(key); try { await api(`/admin/locks/${encodeURIComponent(key)}/take`, { method: "POST" }); } catch (e) { if (e instanceof ApiError) toast(e.message); } load(); };

  const cancelItem = d.cancel.find((c) => "cancel:" + c.id === sel) ?? d.cancel.find((c) => c.status === "PENDING") ?? d.cancel[0];
  // open cases first, then the most recent decided ones
  const trim = <T extends { status: string }>(xs: T[], openStatus: string) => { const o = xs.filter((x) => x.status === openStatus), dn = xs.filter((x) => x.status !== openStatus); return { list: [...o, ...(older ? dn : dn.slice(0, 15))], hidden: older ? 0 : Math.max(0, dn.length - 15) }; };
  const repAll = t === "reviews" ? reviews : reports;
  const { list: repList, hidden: repHidden } = trim(repAll, "OPEN");
  const { list: cancelList, hidden: cancelHidden } = trim(d.cancel, "PENDING");
  const repItem = repList.find((r) => "report:" + r.id === sel) ?? repList.find((r) => r.status === "OPEN") ?? repList[0];

  async function submit() {
    if (!act) return;
    try {
      if (act.kind === "cancel") { await api(`/admin/cases/cancel/${cancelItem!.id}`, { body: { action: act.action, note } }); toast(act.action === "approve" ? "Cancellation approved. Both sides and the transporter are told." : "Request rejected. The deal continues."); }
      else { await api(`/admin/cases/report/${repItem!.id}`, { body: { action: act.action, days: +days, reason: note } }); toast("Done. The reporter is told."); }
      setAct(null); setNote(""); setN(n + 1); load();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); }
  }
  const optional = act?.kind === "report" && (act.action === "dismiss" || act.action === "keep");

  return (
    <>
      <div className="head"><div><h1>Cases</h1><p>Cancellation requests, reports between users, reported reviews and locked delivery codes. Every decision needs a written reason and goes into the activity log.</p></div><span className="code">Screen A4</span></div>
      <div className="tabbar" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={t === k} className={t === k ? "on" : ""} onClick={() => { setTab(k); setSel(null); }}>{l}{open[k] ? ` (${open[k]})` : ""}</button>)}</div>

      {t === "codes" && (d.codes.length ? (
        <div className="panel"><table className="ledger"><thead><tr><th>Deal</th><th>Farmer → dealer</th><th>Stage</th><th /></tr></thead>
          <tbody>{d.codes.map((c) => <tr key={c.id}><td><b>{c.code}</b> · {c.product}</td><td>{c.farmer} → {c.dealer}</td><td>{c.status === "IN_TRANSIT" ? "Delivery code" : "Pickup code"} · {c.attempts} wrong tries</td>
            <td className="right"><button className="btn slate sm" onClick={async () => { await api(`/admin/cases/codes/${c.id}/reset`, { method: "POST" }); toast("Reset. The driver can try again."); load(); }}>Reset tries</button></td></tr>)}</tbody></table>
          <p className="small muted" style={{ padding: "10px 16px" }}>Call the farmer or dealer first to confirm they are with the driver; then reset.</p></div>
      ) : <Empty title="No locked codes" />)}

      {t === "cancel" && (!cancelItem ? <Empty title="No cancellation requests" /> : (
        <div className="md">
          <div className="panel list">{cancelList.map((c) => (
            <button key={c.id} className={"item" + (cancelItem.id === c.id ? " on" : "")} onClick={() => take("cancel:" + c.id)}>
              <b>{c.deal.code} · {c.deal.product}{c.status === "PENDING" ? <span className="tag gold">{c.lock ? c.lock.by : "Waiting"}</span> : <span className={"tag " + (c.status === "APPROVED" ? "green" : "plain")}>{c.status === "APPROVED" ? "Approved" : "Rejected"}</span>}</b>
              <span style={{ marginLeft: 0 }}>by the {c.byRole.toLowerCase()} {c.by.name} · {ago(c.at)}</span>
            </button>
          ))}{cancelHidden > 0 && <button className="item" onClick={() => setOlder(true)}><span style={{ marginLeft: 0 }}>Show {cancelHidden} older…</span></button>}</div>
          <div className="panel case"><div>
            <div className="dhead"><div><h2>Cancel {cancelItem.deal.code}?</h2><p className="muted">{cancelItem.deal.product} · {kg(cancelItem.deal.quantityKg)} · {cancelItem.deal.farmer} → {cancelItem.deal.dealer}</p></div><LockTag lock={cancelItem.lock} lockKey={"cancel:" + cancelItem.id} onChange={load} /></div>
            <div className="sec"><dl className="kv">
              <dt>Asked by</dt><dd>{cancelItem.by.name} ({cancelItem.byRole.toLowerCase()})</dd>
              <dt>Reason</dt><dd>{cancelItem.reason}</dd>
              <dt>Transport</dt><dd>{cancelItem.deal.transporter ?? "—"}{cancelItem.deal.pickupAt ? ` · pickup ${dateTime(cancelItem.deal.pickupAt)}` : ""}</dd>
              <dt>Deal status</dt><dd>{cancelItem.deal.status.replaceAll("_", " ").toLowerCase()}</dd>
              {cancelItem.decisionNote && <><dt>Decision</dt><dd>{cancelItem.decisionNote}</dd></>}
            </dl></div>
            {cancelItem.status === "PENDING" && <div className="sec">
              <div className="note" style={{ marginBottom: 10 }}>If you approve: the deal is cancelled, the transporter&apos;s booking is released and the produce goes back on sale. If you reject: the deal and the transport continue.</div>
              <div className="btns"><button className="btn slate" onClick={() => setAct({ kind: "cancel", action: "approve" })}>Approve cancellation</button><button className="btn warn" onClick={() => setAct({ kind: "cancel", action: "reject" })}>Reject</button></div>
            </div>}
          </div><HistoryPanel userId={cancelItem.by.id} refresh={n} /></div>
        </div>
      ))}

      {(t === "reports" || t === "reviews") && (!repItem ? <Empty title={t === "reviews" ? "No reported reviews" : "No reports"} /> : (
        <div className="md">
          <div className="panel list">{repList.map((r) => (
            <button key={r.id} className={"item" + (repItem.id === r.id ? " on" : "")} onClick={() => take("report:" + r.id)}>
              <b>{r.against.name}{r.status === "OPEN" ? <span className={"tag " + (r.lock ? "gold" : "slate")}>{r.lock ? r.lock.by : "Open"}</span> : <span className="tag plain">{r.status.replace("_", " ").toLowerCase()}</span>}</b>
              <span style={{ marginLeft: 0 }}>{KIND[r.kind]} · by {r.by.name} · {ago(r.at)}</span>
            </button>
          ))}{repHidden > 0 && <button className="item" onClick={() => setOlder(true)}><span style={{ marginLeft: 0 }}>Show {repHidden} older…</span></button>}</div>
          <div className="panel case"><div>
            <div className="dhead"><div><h2>{repItem.review ? "Reported review" : "Report against " + repItem.against.name}</h2><p className="muted">{repItem.by.name} ({repItem.by.role.toLowerCase()}) reported {repItem.against.name} ({repItem.against.role.toLowerCase()}){repItem.deal ? ` · deal ${repItem.deal}` : ""}</p></div><LockTag lock={repItem.lock} lockKey={"report:" + repItem.id} onChange={load} /></div>
            <div className="sec">
              {repItem.review && <div className="offer" style={{ gridTemplateColumns: "1fr" }}><div><Stars value={repItem.review.stars} size={15} /> <b>{repItem.against.name}</b> wrote: “{repItem.review.comment}”{repItem.review.hidden && <span className="tag plain" style={{ marginLeft: 6 }}>Hidden</span>}</div></div>}
              <dl className="kv"><dt>Problem</dt><dd>{KIND[repItem.kind]}</dd><dt>Details</dt><dd>{repItem.details}</dd>{repItem.decisionNote && <><dt>Decision</dt><dd>{repItem.decisionNote}</dd></>}</dl>
            </div>
            {repItem.status === "OPEN" && <div className="sec"><div className="btns">
              {repItem.review
                ? <><button className="btn warn" onClick={() => setAct({ kind: "report", action: "hide" })}>Hide review</button><button className="btn ghost" onClick={() => setAct({ kind: "report", action: "keep" })}>Keep review</button></>
                : <><button className="btn slate" onClick={() => setAct({ kind: "report", action: "warn" })}>Warn</button><button className="btn warn" onClick={() => setAct({ kind: "report", action: "suspend" })}>Suspend or ban</button><button className="btn ghost" onClick={() => setAct({ kind: "report", action: "dismiss" })}>Dismiss</button></>}
            </div></div>}
          </div><HistoryPanel userId={repItem.against.id} refresh={n} /></div>
        </div>
      ))}

      {act && (
        <Modal title={ACT_TITLE[act.action]} onClose={() => setAct(null)} actions={<button className={"btn " + (act.action === "suspend" || act.action === "hide" ? "warn" : "slate")} disabled={!optional && note.trim().length < 5} onClick={submit}>Confirm</button>}>
          {act.kind === "report" && act.action === "suspend" && (
            <div className="choice" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>{[["7", "7 days"], ["30", "30 days"], ["0", "Permanent ban"]].map(([v, l]) => <div key={v}><input type="radio" id={"cd" + v} checked={days === v} onChange={() => setDays(v)} /><label htmlFor={"cd" + v}><b>{l}</b><small>{v === "0" ? "Only the Super Admin can lift it" : "Ends by itself"}</small></label></div>)}</div>
          )}
          <div className="field"><label htmlFor="cn">{act.kind === "cancel" ? "Note for both sides (required)" : optional ? "Note (optional)" : "Written reason (required, the user sees it)"}</label><textarea id="cn" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Cases /></Suspense>;
}
