"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { tk0, kg, dateTime, Countdown, useNow } from "@/lib/format";
import type { Trip } from "@/lib/types";
import { useLiveEvent } from "@/lib/live";
import { Empty, Modal, useToast } from "@/components/ui";
import { Route, Fac, Track, SeasonTag, CodeBox } from "@/components/transport";
import { FailureReport } from "@/components/Emergency";

type Tab = "offers" | "confirmed" | "road" | "done";

function CodeEntry({ t, stage, onDone }: { t: Trip; stage: "pickup" | "deliver"; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const toast = useToast();
  async function go() {
    setErr("");
    try { await api(`/transport/trips/${t.id}/${stage}`, { body: { code } }); toast(stage === "pickup" ? "Pickup confirmed. Drive safely." : "Delivered. The deal is completed."); setCode(""); onDone(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed."); }
  }
  return (
    <div style={{ marginTop: 10 }}>
      <label className="lbl" htmlFor={"code-" + t.id}>{stage === "pickup" ? "Farmer's pickup code" : "Dealer's delivery code"}</label>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input id={"code-" + t.id} className="codein" inputMode="numeric" maxLength={4} placeholder="••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={{ width: 110, font: "500 20px var(--mono)", letterSpacing: ".3em", textAlign: "center" }} />
        <button className="btn rust" disabled={code.length !== 4} onClick={go}>{stage === "pickup" ? "Confirm pickup" : "Confirm delivery"}</button>
      </div>
      {err ? <div className="err" style={{ marginTop: 4 }}>{err}</div> : <p className="small muted" style={{ marginTop: 4 }}>{stage === "pickup" ? "Ask for the code only after loading and weighing." : "The dealer gives it after checking the produce."}</p>}
    </div>
  );
}

function Waybill({ t, tab, onDone }: { t: Trip; tab: Tab; onDone: () => void }) {
  const o = t.transport.offers.find((x) => x.mine && (x.status === "ACCEPTED" || x.status === "PENDING")) ?? t.transport.offers[0];
  const [cancel, setCancel] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("");
  const toast = useToast();
  const now = useNow(60_000);
  if (!o) return null;
  const urgent = tab === "confirmed" && new Date(o.pickupAt).getTime() - now < 12 * 3600_000;
  async function doCancel() {
    try { await api(`/transport/trips/${t.id}/cancel`, { body: { reason } }); toast("Trip cancelled. The deal is open for other transporters again."); setCancel(false); onDone(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); }
  }
  return (
    <div className={"waybill" + (urgent ? " urgent" : "")} style={{ marginBottom: 14 }}>
      <div className="wb-main">
        <div className="wb-top"><span className="wb-id">Trip {t.code} · {tab === "offers" ? "offer sent" : tab === "confirmed" ? "confirmed" : tab === "road" ? "on the road" : t.status === "COMPLETED" && o.status === "ACCEPTED" ? "completed" : o.status.replace("_", " ").toLowerCase()}</span>
          {tab === "offers" && <span className="tag gold">Dealer is choosing</span>}{tab === "road" && <span className="tag rust">In transit</span>}</div>
        <Route d={t} dash={tab === "offers"} />
        <div className="wb-meta"><span><b>{t.listing.product} · {kg(t.quantityKg)}</b></span><span>{o.vehicle.label} <span className="plate">{o.vehicle.regNo}</span></span><Fac f={o.vehicle.facility} /><SeasonTag o={o} /><span>{tk0(o.price)}</span></div>
        {tab !== "offers" && tab !== "done" && <div className="wb-meta" style={{ marginTop: 4 }}><span>Farmer <b>{t.farmer.name}</b> {t.farmer.phone}</span><span>Dealer <b>{t.dealer.name}</b> {t.dealer.phone}</span></div>}
        {tab !== "offers" && <div style={{ marginTop: 10 }}><Track d={t} /></div>}
        {tab === "confirmed" && <CodeEntry t={t} stage="pickup" onDone={onDone} />}
        {tab === "road" && t.status === "IN_TRANSIT" && <CodeEntry t={t} stage="deliver" onDone={onDone} />}
        {t.status === "FAILURE_REQUESTED" && <div className="note warn" style={{ marginTop: 10 }}>You reported a delivery failure{t.failure ? ` in ${t.failure.where}` : ""}. An admin is checking it. Stay with the vehicle.</div>}
        {t.status === "FAILED" && <div className="note" style={{ marginTop: 10 }}>Failure approved. The produce is being sold to dealers near the vehicle{t.failure?.emergency ? ` (${t.failure.emergency.code})` : ""}. You will be told who collects it{t.failure?.canMove ? " or where to drive it" : ""}.</div>}
        {t.emergencyFrom && <div className="note warn" style={{ marginTop: 10 }}>Emergency sale from the stuck vehicle{t.emergencyFrom.note ? ` (${t.emergencyFrom.note})` : ""}. Deliver to the new buyer and enter their code.</div>}
        {o.cancelReason && <p className="small muted" style={{ marginTop: 6 }}>You cancelled: {o.cancelReason}</p>}
      </div>
      <div className="wb-stub">
        {tab === "offers" ? <><small>Window closes in</small><div className="wb-time"><Countdown to={t.transport.windowEndsAt} /></div><Link className="btn ghost sm" style={{ marginTop: 12 }} href={"/transporter/deals?d=" + t.id}>Edit offer</Link></>
          : tab === "done" ? <><small>{t.deliveredAt ? "Delivered" : "Closed"}</small><div className="wb-time" style={{ fontSize: 16 }}>{t.deliveredAt ? dateTime(t.deliveredAt) : "—"}</div></>
          : <><small>{tab === "confirmed" ? "Pickup" : "Delivery by"}</small><div className="wb-time">{new Date(tab === "confirmed" ? o.pickupAt : o.deliverBy).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}</div><small>{new Date(tab === "confirmed" ? o.pickupAt : o.deliverBy).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</small>
            {tab === "confirmed" && <button className="btn warn sm" style={{ marginTop: 12 }} onClick={() => setCancel(true)}>Cancel trip</button>}
            {tab === "road" && t.status === "IN_TRANSIT" && <button className="btn warn sm" style={{ marginTop: 12 }} onClick={() => setReport(true)}>Report delivery failure</button>}</>}
      </div>
      {report && <FailureReport d={t} quantityKg={t.quantityKg} onClose={() => setReport(false)} onDone={onDone} />}
      {cancel && (
        <Modal title={`Cancel trip ${t.code}?`} onClose={() => setCancel(false)} actions={<button className="btn warn" disabled={reason.trim().length < 5} onClick={doCancel}>Cancel trip</button>}>
          <p style={{ marginBottom: 10 }}>The deal opens again for other transporters and the farmer and dealer are told your reason. Cancellations count towards the 30-day alert admins see.</p>
          <div className="field"><label htmlFor={"tr-" + t.id}>Reason (required)</label><textarea id={"tr-" + t.id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </Modal>
      )}
    </div>
  );
}

export default function Page() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [tab, setTab] = useState<Tab>("confirmed");
  const load = useCallback(async () => setTrips((await api<{ trips: Trip[] }>("/transport/trips")).trips), []);
  useEffect(() => { load(); }, [load]);
  useLiveEvent("deal", load);
  useLiveEvent("notification", load);

  const mineAccepted = (t: Trip) => t.transport.offers.some((o) => o.mine && o.status === "ACCEPTED");
  const all = trips ?? [];
  const offers = all.filter((t) => t.status === "AWAITING_TRANSPORT" && t.transport.offers.some((o) => o.mine && o.status === "PENDING"));
  const confirmed = all.filter((t) => t.status === "TRANSPORT_CONFIRMED" && mineAccepted(t));
  const road = all.filter((t) => (t.status === "IN_TRANSIT" || t.status === "FAILURE_REQUESTED") && mineAccepted(t));
  const handovers = all.filter((t) => t.handover && (t.status === "AWAITING_TRANSPORT" || t.status === "TRANSPORT_CONFIRMED"));
  // everything else: completed trips, offers not chosen / withdrawn, cancelled trips
  const groups: Record<Tab, Trip[]> = { offers, confirmed, road, done: all.filter((t) => !offers.includes(t) && !confirmed.includes(t) && !road.includes(t) && !handovers.includes(t)) };
  const labels: [Tab, string][] = [["offers", "Offers"], ["confirmed", "Confirmed"], ["road", "On the road"], ["done", "Completed & closed"]];
  return (
    <>
      <div className="head"><div><h1>My trips</h1><p>Offers you sent, confirmed pickups, trips on the road and finished trips.</p></div><span className="code">Screen T3</span></div>
      <div className="tabbar" role="tablist">{labels.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l} ({groups[k].length})</button>)}</div>
      {tab === "confirmed" && handovers.map((t) => (
        <div key={t.id} className="panel" style={{ marginBottom: 14 }}>
          <h3>Hand over {t.listing.product} · {kg(t.quantityKg)} <small>emergency sale {t.code} · new buyer {t.dealer.name}</small></h3>
          <div className="pb">
            {t.pickupCode ? <CodeBox label="Pickup code for the local transporter" code={t.pickupCode} hint="Give it to the driver who collects from your vehicle, after loading. It proves the handover." />
              : <div className="note">The buyer is choosing a local transporter to collect from your vehicle in {t.route.from.upazila}. The pickup code appears here when they confirm.</div>}
          </div>
        </div>
      ))}
      {!trips ? <p className="muted">Loading…</p> : groups[tab].length ? groups[tab].map((t) => <Waybill key={t.id} t={t} tab={tab} onDone={load} />)
        : <Empty title={tab === "offers" ? "No waiting offers" : tab === "confirmed" ? "No confirmed pickups" : tab === "road" ? "Nothing on the road" : "No finished trips yet"}>{tab === "offers" || tab === "confirmed" ? <p style={{ marginTop: 6 }}><Link href="/transporter/deals">Find deals</Link></p> : null}</Empty>}
    </>
  );
}
