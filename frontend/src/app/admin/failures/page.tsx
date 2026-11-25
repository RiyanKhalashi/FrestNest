"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { tk, kg, ago, dateTime } from "@/lib/format";
import { useLiveEvent } from "@/lib/live";
import { Empty, Modal, ProductIcon, useToast } from "@/components/common/UI";

interface F {
  id: string; status: "PENDING" | "APPROVED" | "REJECTED"; at: string; escalated: boolean; decidedAt: string | null; decisionNote: string | null;
  deal: { id: string; code: string; quantityKg: number; pricePerKg: number }; product: string;
  where: { upazila: string; district: string; note: string | null }; from: string;
  reason: string; details: string | null; photo: string | null; condition: string; usableKg: number; canMove: boolean; shelfLeftHours: number;
  farmer: { name: string; phone: string; auto: boolean }; dealer: { name: string; phone: string };
  transporter: { name: string; phone: string; vehicle: string; failures30: number; trips: number } | null;
  suggestion: { hours: number; drop: number };
  emergency: { id: string; code: string; status: string; tier: number | null } | null;
}

const REJECT = ["Photo does not show the problem", "Location does not match the route", "Problem can be fixed on the spot", "Duplicate report"];

function Detail({ f, onDone }: { f: F; onDone: () => void }) {
  const toast = useToast();
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState(REJECT[0]);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const waiting = f.status === "PENDING";
  async function approve() {
    setBusy(true);
    try { await api(`/admin/failures/${f.id}/approve`, { method: "POST" }); toast(`Approved. ${f.farmer.name} is told to start the emergency sale.`); onDone(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); onDone(); } finally { setBusy(false); }
  }
  async function doReject() {
    setBusy(true);
    try { await api(`/admin/failures/${f.id}/reject`, { body: { reason: reason === "Other" ? other : reason } }); setReject(false); toast("Rejected. The driver continues the trip."); onDone(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); } finally { setBusy(false); }
  }
  return (
    <div className="panel">
      <div className="dhead">
        <div className="ttl"><ProductIcon name={f.product} size={44} /><div><h2>{f.product} · {kg(f.usableKg)} usable</h2><p className="muted">Deal {f.deal.code} · reported {ago(f.at)} by {f.transporter?.name ?? "the driver"}</p></div></div>
        <div style={{ textAlign: "right" }}>
          {waiting ? <span className={"tag " + (f.shelfLeftHours <= 24 ? "red" : "gold")}>{f.shelfLeftHours} h shelf life left</span> : <span className={"tag " + (f.status === "APPROVED" ? "green" : "plain")}>{f.status === "APPROVED" ? "Approved" : "Rejected"}</span>}
          {f.escalated && waiting && <div style={{ marginTop: 6 }}><span className="tag red">Waiting over 30 min</span></div>}
        </div>
      </div>
      <div className="sec" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {f.photo ? <a href={f.photo} target="_blank" rel="noreferrer"><img src={f.photo} alt="Photo proof from the driver" style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line)" }} /></a> : <div className="soon">No photo</div>}
        <dl className="kv">
          <dt>Stuck at</dt><dd><b>{f.where.upazila}, {f.where.district}</b>{f.where.note ? ` · ${f.where.note}` : ""}</dd>
          <dt>Route</dt><dd>{f.from} → {f.dealer.name}</dd>
          <dt>Reason</dt><dd>{f.reason}{f.details ? ` · ${f.details}` : ""}</dd>
          <dt>Condition</dt><dd>{f.condition} · {kg(f.usableKg)} of {kg(f.deal.quantityKg)} usable</dd>
          <dt>Vehicle can move</dt><dd>{f.canMove ? "Yes: it can deliver to a nearby buyer" : "No: a local transporter must collect"}</dd>
          <dt>Shelf life left</dt><dd>{f.shelfLeftHours} hours (added by the system)</dd>
          <dt>Farmer</dt><dd>{f.farmer.name} · {f.farmer.phone} · {f.farmer.auto ? "auto-start chosen" : "will set up the sale"}</dd>
          <dt>Dealer</dt><dd>{f.dealer.name} · {f.dealer.phone}</dd>
          <dt>Deal value</dt><dd>{tk(f.deal.pricePerKg)}/kg</dd>
        </dl>
      </div>
      {f.transporter && (
        <div className="sec">
          <h4>Transporter history <small>shown beside every case</small></h4>
          <p className="small">{f.transporter.name} · {f.transporter.phone} · {f.transporter.vehicle} · {f.transporter.trips} trips · <b>{f.transporter.failures30}</b> failure report{f.transporter.failures30 === 1 ? "" : "s"} in 30 days{f.transporter.failures30 >= 3 && <span className="tag red" style={{ marginLeft: 6 }}>Alert: 3+ in 30 days</span>}</p>
        </div>
      )}
      <div className="sec">
        {waiting ? (
          <>
            <div className="note" style={{ marginBottom: 12 }}>If you approve: the deal is marked &quot;Failed: released for emergency sale&quot;, the dealer is told, and the farmer starts an emergency sale (suggested: −{f.suggestion.drop}%, {f.suggestion.hours} h). Dealers in {f.where.upazila} are told first, then the whole of {f.where.district} after 1 hour, then neighbouring districts.</div>
            <div className="btns"><button className="btn" disabled={busy} onClick={approve}>Approve</button><button className="btn warn" disabled={busy} onClick={() => setReject(true)}>Reject</button></div>
          </>
        ) : (
          <p className="small">{f.status === "APPROVED" ? <>Approved {f.decidedAt ? dateTime(f.decidedAt) : ""}. {f.emergency ? <>Emergency sale {f.emergency.code}: {f.emergency.status.toLowerCase()}.</> : "Waiting for the farmer to start the emergency sale."}</> : <>Rejected: {f.decisionNote}</>}</p>
        )}
      </div>
      {reject && (
        <Modal title={`Reject failure report · ${f.deal.code}`} onClose={() => setReject(false)} actions={<button className="btn warn" disabled={busy || (reason === "Other" && other.trim().length < 5)} onClick={doReject}>Reject</button>}>
          <div className="field"><label htmlFor="rr">Reason (sent to the driver)</label><select id="rr" value={reason} onChange={(e) => setReason(e.target.value)}>{[...REJECT, "Other"].map((r) => <option key={r}>{r}</option>)}</select></div>
          {reason === "Other" && <div className="field"><label htmlFor="ro">Write the reason</label><textarea id="ro" rows={2} value={other} onChange={(e) => setOther(e.target.value)} /></div>}
          <p className="small muted">The trip goes back to &quot;on the road&quot; and the driver continues.</p>
        </Modal>
      )}
    </div>
  );
}

function Failures() {
  const params = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<{ waiting: F[]; done: F[] } | null>(null);
  const load = useCallback(async () => setData(await api("/admin/failures")), []);
  useEffect(() => { load(); }, [load]);
  useLiveEvent("notification", load);
  if (!data) return <p className="muted">Loading…</p>;
  const all = [...data.waiting, ...data.done];
  const cur = all.find((f) => f.id === params.get("f")) ?? all[0];
  const item = (f: F) => (
    <button key={f.id} className={"item" + (cur?.id === f.id ? " on" : "")} onClick={() => router.replace("/admin/failures?f=" + f.id, { scroll: false })}>
      <b><span className="nm" style={{ display: "flex", gap: 9, alignItems: "center" }}><ProductIcon name={f.product} />{f.product} · {kg(f.usableKg)}</span>
        {f.status === "PENDING" ? <span className={"tag " + (f.escalated ? "red" : f.shelfLeftHours <= 24 ? "red" : "gold")}>{f.escalated ? "Escalated" : f.shelfLeftHours + " h left"}</span> : <span className={"tag " + (f.status === "APPROVED" ? "green" : "plain")}>{f.status === "APPROVED" ? "Approved" : "Rejected"}</span>}</b>
      <span>{f.deal.code} · {f.where.upazila}, {f.where.district} · {ago(f.at)}</span>
    </button>
  );
  return (
    <>
      <div className="head"><div><h1>Delivery failures</h1><p>Stuck vehicles, most urgent first. Approve or reject with a reason. Unhandled reports alert every admin after 30 minutes.</p></div><span className="code">Screen A3</span></div>
      {!all.length ? <Empty title="No delivery failures">Reports from drivers appear here live.</Empty> : (
        <div className="md">
          <div className="panel list">
            <h5>Waiting · {data.waiting.length}</h5>
            {data.waiting.map(item)}
            {!data.waiting.length && <p className="small muted" style={{ padding: "10px 14px" }}>Nothing waiting.</p>}
            {data.done.length > 0 && <><h5>Decided</h5>{data.done.map(item)}</>}
          </div>
          {cur && <Detail f={cur} onDone={load} />}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Failures /></Suspense>;
}
