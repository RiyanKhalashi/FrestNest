"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ago, kg } from "@/lib/format";
import { useLiveEvent } from "@/lib/live";
import { Empty, Modal, useToast } from "@/components/ui";
import { Fac } from "@/components/transport";
import { HistoryPanel, LockTag, type Lock } from "@/components/admin";
import type { Storage } from "@/lib/types";

interface VUser { id: string; name: string; person: string; role: string; phone: string; place: string; status: string; statusReason: string | null; since: string; docs: { kind: string; file: string | null; at: string | null }[]; complete: boolean; vehicles: number; lock: Lock }
interface VVehicle { id: string; label: string; regNo: string; facility: Storage; capacityKg: number; docPhoto: string | null; since: string; owner: { id: string; name: string; verified: boolean }; lock: Lock }
const DOC: Record<string, string> = { NID: "National ID (NID)", TRADE_LICENSE: "Trade licence", DRIVING_LICENSE: "Driving licence" };
const REUPLOAD = ["Blurry photo", "Expired document", "Name does not match", "Wrong document"];
const REJECT = ["Fake or edited document", "Business does not exist", "Duplicate account", "Other"];

function DocImg({ src, alt }: { src: string | null; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={alt} style={{ width: "100%", maxHeight: 220, objectFit: "contain", border: "1px solid var(--line)", borderRadius: 4, background: "#fff" }} /></a> : <div className="doc">Not uploaded yet</div>;
}

export default function Page() {
  const toast = useToast();
  const [d, setD] = useState<{ users: VUser[]; vehicles: VVehicle[] } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [ask, setAsk] = useState<null | "reupload" | "reject">(null);
  const [reason, setReason] = useState("");
  const [n, setN] = useState(0);
  const load = useCallback(async () => setD(await api("/admin/verification")), []);
  useEffect(() => { load(); }, [load]);
  useLiveEvent("notification", load);
  if (!d) return <p className="muted">Loading…</p>;
  const items = [...d.users.map((u) => ({ key: "verify:" + u.id, kind: "user" as const, u })), ...d.vehicles.map((v) => ({ key: "vehicle:" + v.id, kind: "vehicle" as const, v }))];
  const cur = items.find((i) => i.key === sel) ?? items[0];

  async function open(key: string) {
    setSel(key);
    try { await api(`/admin/locks/${encodeURIComponent(key)}/take`, { method: "POST" }); } catch (e) { if (e instanceof ApiError) toast(e.message); }
    load();
  }
  async function decide(action: "approve" | "reupload" | "reject", why?: string) {
    if (!cur) return;
    const url = cur.kind === "user" ? `/admin/verification/user/${cur.u.id}` : `/admin/verification/vehicle/${cur.v.id}`;
    try { await api(url, { body: { action, reason: why } }); toast(action === "approve" ? "Approved. They are notified." : action === "reupload" ? "Re-upload requested." : "Rejected. They are notified."); setAsk(null); setSel(null); setN(n + 1); load(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); load(); }
  }

  return (
    <>
      <div className="head"><div><h1>Verification</h1><p>Dealers and transporters can bid, offer or take trips only after an admin checks their documents. Every vehicle is checked too.</p></div><span className="code">Screen A2</span></div>
      {!items.length ? <Empty title="Nothing to verify">New accounts and vehicles appear here when they register.</Empty> : (
        <div className="md">
          <div className="panel list">
            {d.users.length > 0 && <h5>Accounts · {d.users.length}</h5>}
            {d.users.map((u) => (
              <button key={u.id} className={"item" + (cur?.key === "verify:" + u.id ? " on" : "")} onClick={() => open("verify:" + u.id)}>
                <b>{u.name}{u.lock ? <span className="tag gold">{u.lock.by}</span> : !u.complete ? <span className="tag plain">Docs missing</span> : u.status === "REUPLOAD" ? <span className="tag gold">Re-upload</span> : <span className="tag green">Ready</span>}</b>
                <span style={{ marginLeft: 0 }}>{u.role === "DEALER" ? "Dealer" : "Transporter"} · {u.place} · {ago(u.since)}</span>
              </button>
            ))}
            {d.vehicles.length > 0 && <h5>Vehicles · {d.vehicles.length}</h5>}
            {d.vehicles.map((v) => (
              <button key={v.id} className={"item" + (cur?.key === "vehicle:" + v.id ? " on" : "")} onClick={() => open("vehicle:" + v.id)}>
                <b>{v.regNo}{v.lock ? <span className="tag gold">{v.lock.by}</span> : <span className="tag green">Ready</span>}</b>
                <span style={{ marginLeft: 0 }}>{v.label} · {v.owner.name} · {ago(v.since)}</span>
              </button>
            ))}
          </div>
          {cur && (
            <div className="panel case">
              <div>
                <div className="dhead">
                  <div><h2>{cur.kind === "user" ? cur.u.name : cur.v.regNo}</h2><p className="muted">{cur.kind === "user" ? `${cur.u.role === "DEALER" ? "Dealer" : "Transporter"} · ${cur.u.person} · ${cur.u.phone} · ${cur.u.place}` : `${cur.v.label} · ${kg(cur.v.capacityKg)} · owner ${cur.v.owner.name}${cur.v.owner.verified ? "" : " (account not verified yet)"}`}</p></div>
                  <LockTag lock={cur.kind === "user" ? cur.u.lock : cur.v.lock} lockKey={cur.key} onChange={load} />
                </div>
                <div className="sec">
                  {cur.kind === "user" ? (
                    <div className="grid g2">{cur.u.docs.map((x) => <div key={x.kind}><div className="lbl" style={{ marginBottom: 4 }}>{DOC[x.kind]}</div><DocImg src={x.file} alt={DOC[x.kind]} />{x.at && <div className="small muted">uploaded {ago(x.at)}</div>}</div>)}</div>
                  ) : (
                    <div className="grid g2"><div><div className="lbl" style={{ marginBottom: 4 }}>Registration document</div><DocImg src={cur.v.docPhoto} alt="Registration document" /></div>
                      <dl className="kv"><dt>Type</dt><dd>{cur.v.label}</dd><dt>Facility</dt><dd><Fac f={cur.v.facility} /></dd><dt>Capacity</dt><dd>{kg(cur.v.capacityKg)}</dd><dt>Check</dt><dd>Number plate matches the document; capacity is realistic for the type.</dd></dl></div>
                  )}
                  {cur.kind === "user" && cur.u.statusReason && <p className="small" style={{ marginTop: 10 }}>Last request: {cur.u.statusReason}</p>}
                </div>
                <div className="sec">
                  <div className="btns">
                    <button className="btn slate" disabled={cur.kind === "user" && !cur.u.complete} onClick={() => decide("approve")}>Approve</button>
                    <button className="btn ghost" onClick={() => { setAsk("reupload"); setReason(REUPLOAD[0]); }}>Ask for re-upload</button>
                    <button className="btn warn" onClick={() => { setAsk("reject"); setReason(REJECT[0]); }}>Reject</button>
                  </div>
                  {cur.kind === "user" && !cur.u.complete && <p className="small muted" style={{ marginTop: 8 }}>Approve becomes available when both documents are uploaded.</p>}
                </div>
              </div>
              <HistoryPanel userId={cur.kind === "user" ? cur.u.id : cur.v.owner.id} refresh={n} />
            </div>
          )}
        </div>
      )}
      {ask && (
        <Modal title={ask === "reupload" ? "Ask for a re-upload" : "Reject verification"} onClose={() => setAsk(null)} actions={<button className={"btn " + (ask === "reject" ? "warn" : "slate")} onClick={() => decide(ask, reason)}>{ask === "reupload" ? "Send request" : "Reject"}</button>}>
          <div className="field"><label htmlFor="vr">Reason (the user sees it)</label><select id="vr" value={reason} onChange={(e) => setReason(e.target.value)}>{(ask === "reupload" ? REUPLOAD : REJECT).map((r) => <option key={r}>{r}</option>)}</select></div>
        </Modal>
      )}
    </>
  );
}
