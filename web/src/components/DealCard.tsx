"use client";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { tk, tk0, kg, dateShort, dateTime, Countdown, STORAGE_LABEL } from "@/lib/format";
import { qty, per } from "@/lib/units";
import type { Deal, TransportOffer } from "@/lib/types";
import { Modal, FieldErr, useToast } from "./ui";
import { Route, Track, Fac, SeasonTag, Stars, CodeBox, CounterStatus } from "./transport";
import { AutoPreference, EmergencySetup, REASON_LABEL, CONDITION_LABEL } from "./Emergency";
import { ReportButton } from "./Reporting";

const SOURCE: Record<string, string> = { BID: "Won in bidding", BUY_NOW: "Buy Now", OFFER: "Offer accepted", EMERGENCY: "Emergency sale" };
const STATUS: Record<string, [string, string]> = {
  AWAITING_TRANSPORT: ["gold", "Waiting for transport"], TRANSPORT_CONFIRMED: ["blue", "Transport confirmed"],
  IN_TRANSIT: ["blue", "On the road"], COMPLETED: ["green", "Completed"], CANCELLED: ["plain", "Cancelled"],
  FAILURE_REQUESTED: ["red", "Delivery problem reported"], FAILED: ["red", "Failed: released for emergency sale"],
};

function OfferLine({ o, d, side, onChoose, onCounter }: { o: TransportOffer; d: Deal; side: "farmer" | "dealer"; onChoose: (o: TransportOffer) => void; onCounter: (o: TransportOffer) => void }) {
  const dead = o.status !== "PENDING" && o.status !== "ACCEPTED";
  return (
    <div className={"offer" + (dead ? " dead" : "")}>
      <div>
        <h5>{o.transporter.name} <span className="small muted" style={{ fontWeight: 400 }}>{o.transporter.rating ? `★ ${o.transporter.rating.avg} (${o.transporter.rating.count})` : "new transporter"}{o.transporter.failures ? ` · ${o.transporter.failures} delivery failure${o.transporter.failures > 1 ? "s" : ""} in 90 days` : ""}{o.transporter.base ? " · based in " + o.transporter.base : ""}</span></h5>
        <div className="small" style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{o.vehicle.label} <span className="plate">{o.vehicle.regNo}</span> <Fac f={o.vehicle.facility} /> <SeasonTag o={o} /></div>
        <div className="small muted" style={{ marginTop: 3 }}>Pickup {dateTime(o.pickupAt)} · delivery by {dateTime(o.deliverBy)}{o.note ? ` · “${o.note}”` : ""}</div>
        {o.season.tag === "WEATHER_RISK" && <div className="small" style={{ color: "#7c5606", marginTop: 3 }}>{o.season.text}</div>}
        <CounterStatus o={o} side={side} />
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="num" style={{ font: "600 18px var(--display)" }}>{tk0(o.price)}</div>
        <div className="small muted">{tk(o.price / d.quantityKg)} / kg</div>
        {side === "dealer" && o.status === "PENDING" && d.status === "AWAITING_TRANSPORT" && <div className="btns" style={{ marginTop: 6, justifyContent: "flex-end" }}>
          {!o.counter && <button className="btn ghost sm" onClick={() => onCounter(o)}>Counter</button>}
          <button className="btn sm" onClick={() => onChoose(o)}>Choose</button>
        </div>}
        {dead && <span className="tag plain">{o.status === "NOT_CHOSEN" ? "Not chosen" : o.status === "WITHDRAWN" ? "Withdrawn" : "Cancelled"}</span>}
      </div>
    </div>
  );
}

function ReviewForm({ d, t, onDone }: { d: Deal; t: Deal["reviews"]["targets"][number]; onDone: () => void }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<Record<string, string[] | undefined>>({});
  const toast = useToast();
  async function send() {
    try { await api(`/deals/${d.id}/review`, { body: { toId: t.id, stars, comment } }); toast("Thank you. Your review is published."); onDone(); }
    catch (e) { if (e instanceof ApiError) { toast(e.message); setErr(e.fields); } }
  }
  return (
    <div className="offer" style={{ gridTemplateColumns: "1fr" }}>
      <div><h5>Rate {t.name} <span className="small muted" style={{ fontWeight: 400 }}>({t.role.toLowerCase()})</span></h5>
        <Stars value={stars} onChange={setStars} />
        <div className="field" style={{ margin: "6px 0 8px" }}><textarea rows={2} placeholder="What went well, what could be better?" value={comment} onChange={(e) => setComment(e.target.value)} aria-label={"Comment for " + t.name} /><FieldErr e={err.comment} /></div>
        <button className="btn sm" disabled={!stars || comment.trim().length < 5} onClick={send}>Publish review</button></div>
    </div>
  );
}

/** One Primary Deal for the farmer or the dealer, from "waiting for transport" to "completed". */
export function DealCard({ d, side, onChange }: { d: Deal; side: "farmer" | "dealer"; onChange: () => void }) {
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [choose, setChoose] = useState<TransportOffer | null>(null);
  const [counter, setCounter] = useState<TransportOffer | null>(null);
  const [cPrice, setCPrice] = useState("");
  const [cNote, setCNote] = useState("");
  const [cFields, setCFields] = useState<Record<string, string[] | undefined>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const other = side === "farmer" ? d.dealer : d.farmer;
  const st = STATUS[d.status];
  const offers = d.transport.offers.filter((o) => o.status === "PENDING");
  const closedOffers = d.transport.offers.filter((o) => o.status !== "PENDING" && o.status !== "ACCEPTED");
  const c = d.transport.confirmed;
  const canCancel = (d.status === "AWAITING_TRANSPORT" || d.status === "TRANSPORT_CONFIRMED") && !d.cancelRequest;
  const needsAdmin = d.status === "TRANSPORT_CONFIRMED";

  async function doCancel() {
    setErr("");
    try {
      const r = await api<{ requested?: boolean }>(`/deals/${d.id}/cancel`, { body: { reason } });
      setCancel(false); setReason("");
      toast(r.requested ? "Request sent. An admin will decide; until then nothing changes." : `Deal ${d.code} cancelled. ${side === "farmer" ? "The dealer" : "The farmer"} is notified.`);
      onChange();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Could not cancel."); }
  }
  async function confirmTransport() {
    if (!choose) return;
    setBusy(true);
    try { await api(`/deals/${d.id}/transport/${choose.id}/accept`, { method: "POST" }); setChoose(null); toast("Transport confirmed. Your delivery code is ready."); onChange(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); setChoose(null); onChange(); } finally { setBusy(false); }
  }
  function openCounter(o: TransportOffer) { setCounter(o); setCPrice(""); setCNote(""); setCFields({}); }
  async function sendCounter() {
    if (!counter) return;
    setBusy(true); setCFields({});
    try {
      await api(`/deals/${d.id}/transport/${counter.id}/counter`, { body: { price: +cPrice, note: cNote || undefined } });
      toast(`Counter sent to ${counter.transporter.name}. They have ${d.transport.counterHours} hours to answer.`); setCounter(null); onChange();
    } catch (e) { if (e instanceof ApiError) { toast(e.message); setCFields(e.fields); } } finally { setBusy(false); }
  }
  async function setWindow(hours: number) {
    try { await api(`/deals/${d.id}/window`, { body: { hours } }); toast(`Transporters now have ${hours} hours to send offers.`); onChange(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); }
  }
  async function extend() {
    try { const r = await api<{ hours: number }>(`/deals/${d.id}/extend`, { method: "POST" }); toast(`Offer window extended by ${r.hours} hours.`); onChange(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); }
  }

  return (
    <div className="panel" style={{ marginBottom: 14, opacity: d.status === "CANCELLED" ? 0.7 : 1 }}>
      <div className="dhead">
        <div>
          <h2 style={{ fontSize: 18 }}>{d.code} · {d.listing.product} · {qty(d.quantityKg, d.unit)}{d.unit !== "KG" ? ` (${kg(d.quantityKg)})` : ""} <span className={"tag " + st[0]} style={{ marginLeft: 6, verticalAlign: 3 }}>{st[1]}</span></h2>
          <p className="small muted">{side === "farmer" ? "Buyer" : "Farmer"}: <b style={{ color: "var(--ink)" }}>{other.name}</b>{other.phone ? " · " + other.phone : ""} · {SOURCE[d.source]} · {dateShort(d.at)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="num" style={{ font: "600 20px var(--display)" }}>{tk0(d.total)}</div>
          <div className="small muted">{per(d.pricePerKg, d.unit)}</div>
        </div>
      </div>

      {d.status !== "CANCELLED" && (
        <div className="sec">
          <Route d={d} dash={d.status === "AWAITING_TRANSPORT"} />
          <div className="small muted">Vehicle needed: <Fac f={d.need} />{d.route.long ? " (long trip)" : ""}{d.needByFarmer ? " (farmer asked for this)" : ""} · harvest {dateShort(d.listing.harvestDate)} · {side === "dealer" ? "you pay for transport" : "the dealer pays for transport"}</div>
        </div>
      )}

      {d.emergencyFrom && d.status !== "CANCELLED" && <div className="sec"><div className="note warn"><b>Emergency sale</b> from a stuck vehicle{d.emergencyFrom.note ? ` (${d.emergencyFrom.note})` : ""}{d.emergencyFrom.originalDeal ? `, original deal ${d.emergencyFrom.originalDeal}` : ""}. {d.emergencyFrom.sameVehicle ? "The same vehicle brings it to the buyer." : "A local transporter collects it from the vehicle; the original driver hands it over with the pickup code."}</div></div>}

      {(d.status === "FAILURE_REQUESTED" || d.status === "FAILED") && d.failure && (
        <div className="sec">
          <h4>Delivery failure <small>{d.status === "FAILURE_REQUESTED" ? "an admin is checking the driver's report" : "approved by an admin"}</small></h4>
          <p className="small" style={{ marginBottom: 10 }}>{REASON_LABEL[d.failure.reason]} in <b>{d.failure.where}</b>{d.failure.note ? ` (${d.failure.note})` : ""} · produce {CONDITION_LABEL[d.failure.condition].toLowerCase()} · {kg(d.failure.usableKg)} usable · vehicle {d.failure.canMove ? "can still move" : "cannot move"}</p>
          {d.status === "FAILED" && side === "farmer" && <EmergencySetup d={d} onChange={onChange} />}
          {d.status === "FAILED" && side === "dealer" && <div className="note">This deal is closed as failed, so you do not receive this lot. The farmer sells it to dealers near the vehicle. Your rating is not affected.</div>}
          {d.status === "FAILURE_REQUESTED" && <div className="note">If the admin rejects the report, the trip continues as planned.</div>}
        </div>
      )}

      {d.cancelRequest && <div className="sec"><div className="note warn"><b>Cancellation requested{d.cancelRequest.mine ? " by you" : ` by the ${d.cancelRequest.by.toLowerCase()}`}</b> · {d.cancelRequest.reason}. An admin decides; until then the deal and the transport stay as they are.</div></div>}
      {d.lastCancelDecision?.status === "REJECTED" && d.status !== "CANCELLED" && <div className="sec"><div className="note">An admin rejected the cancellation request{d.lastCancelDecision.note ? `: ${d.lastCancelDecision.note}` : ""}. The deal continues.</div></div>}

      {d.status === "AWAITING_TRANSPORT" && (
        <div className="sec">
          <h4>Transport offers <small>{d.transport.windowOpen
            ? <>transporters can offer for <Countdown to={d.transport.windowEndsAt} /> more · {side === "dealer" ? "pick one (you can pick before the time ends)" : "the dealer picks one, since they pay for transport"}</>
            : offers.length ? (side === "dealer" ? "offers closed · choose one" : "offers closed · the dealer is choosing") : "offers closed"}</small></h4>
          {side === "dealer" && d.transport.canSetWindow && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label>How long should transporters have to send offers?</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {d.transport.windowOptions.map((o) => {
                  const on = (d.transport.windowHours ?? d.transport.defaultHours) === o.hours;
                  return <button key={o.hours} type="button" className={"btn sm" + (on ? "" : " ghost")} disabled={!o.ok || on} title={o.ok ? undefined : "Too long: the produce would not arrive fresh enough"} onClick={() => setWindow(o.hours)}>{o.hours} h{o.hours === d.transport.defaultHours ? " (suggested)" : ""}</button>;
                })}
              </div>
              <small>{d.transport.windowHours ? `You chose ${d.transport.windowHours} h.` : `The suggested ${d.transport.defaultHours} h started on its own.`} A new choice counts from now. You can change it until the first offer arrives.{d.transport.windowOptions.some((o) => !o.ok) ? " Longer times are off because the produce would not arrive fresh enough." : ""}</small>
            </div>
          )}
          {offers.map((o) => <OfferLine key={o.id} o={o} d={d} side={side} onChoose={setChoose} onCounter={openCounter} />)}
          {!offers.length && <p className="small muted" style={{ marginBottom: 8 }}>{d.transport.windowOpen ? "No offers yet. Transporters with a matching vehicle can see this deal." : "No offers arrived in the window."}</p>}
          {d.transport.canExtend && <div className="note warn" style={{ marginBottom: 8 }}>The offer window has closed{offers.length ? "" : " without offers"}. <button className="btn sm" style={{ marginLeft: 8 }} onClick={extend}>Extend once ({d.transport.defaultHours} h)</button></div>}
          {!d.transport.windowOpen && d.transport.windowExtended && !offers.length && <div className="note bad">The extended window also closed without offers. Contact the {side === "dealer" ? "farmer" : "dealer"} or cancel with a reason.</div>}
          {closedOffers.length > 0 && <details><summary className="small muted" style={{ cursor: "pointer" }}>Earlier offers ({closedOffers.length})</summary>{closedOffers.map((o) => <OfferLine key={o.id} o={o} d={d} side={side} onChoose={setChoose} onCounter={openCounter} />)}</details>}
        </div>
      )}

      {(d.status === "TRANSPORT_CONFIRMED" || d.status === "IN_TRANSIT" || d.status === "COMPLETED") && c && (
        <div className="sec">
          <Track d={d} />
          <div className="small" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <b>{c.transporter.name}</b>{c.transporter.phone && <span className="muted">{c.transporter.phone}</span>} · {c.vehicle.label} <span className="plate">{c.vehicle.regNo}</span> <Fac f={c.vehicle.facility} /> · {tk0(c.price)} · pickup {dateTime(c.pickupAt)} · delivery by {dateTime(c.deliverBy)}
          </div>
          {c.counter?.state === "ACCEPTED" && <div style={{ marginTop: -6, marginBottom: 10 }}><CounterStatus o={c} side={side} /></div>}
          {side === "farmer" && d.pickupCode && <CodeBox label="Your pickup code" code={d.pickupCode} hint="Give it to the driver only after the produce is loaded and weighed. It proves the handover." />}
          {side === "dealer" && d.deliveryCode && <CodeBox label="Your delivery code" code={d.deliveryCode} hint="Give it to the driver only after you have received and checked the produce. It completes the deal." />}
          {side === "farmer" && d.status === "IN_TRANSIT" && <div className="note">Picked up {d.pickedUpAt ? dateTime(d.pickedUpAt) : ""}. The dealer confirms receipt with their code.</div>}
          {side === "dealer" && d.status === "TRANSPORT_CONFIRMED" && <p className="small muted" style={{ marginTop: 8 }}>The driver collects with the farmer&apos;s pickup code, then brings it to you.</p>}
        </div>
      )}

      {d.status === "COMPLETED" && (d.reviews.targets.length > 0 || d.reviews.given.length > 0) && (
        <div className="sec">
          <h4>Reviews <small>stars + a short comment</small></h4>
          {d.reviews.targets.map((t) => <ReviewForm key={t.id} d={d} t={t} onDone={onChange} />)}
          {d.reviews.given.map((g) => <div key={g.toId} className="small" style={{ marginBottom: 4 }}><Stars value={g.stars} size={15} /> “{g.comment}”</div>)}
        </div>
      )}

      {d.status === "CANCELLED" && <div className="sec small">Cancelled by the {d.cancelledBy?.toLowerCase()}{d.cancelledAt ? " on " + dateShort(d.cancelledAt) : ""}: {d.cancelReason}</div>}

      {side === "farmer" && ["AWAITING_TRANSPORT", "TRANSPORT_CONFIRMED", "IN_TRANSIT"].includes(d.status) && !d.emergencyFrom && <div className="sec"><AutoPreference d={d} onChange={onChange} /></div>}

      {d.status !== "AWAITING_TRANSPORT" && <div className="sec" style={{ display: "flex", justifyContent: "flex-end" }}>
        <ReportButton dealId={d.id} people={[...(side === "farmer" ? [{ id: d.dealer.id, name: d.dealer.name, role: "dealer" }] : [{ id: d.farmer.id, name: d.farmer.name, role: "farmer" }]), ...(c ? [{ id: c.transporter.id, name: c.transporter.name, role: "transporter" }] : [])]} />
      </div>}

      {canCancel && <div className="sec" style={{ textAlign: "right" }}><button className="btn warn sm" onClick={() => setCancel(true)}>{needsAdmin ? "Request cancellation" : "Cancel deal"}</button></div>}

      {choose && (
        <Modal title={`Confirm ${choose.transporter.name}?`} onClose={() => setChoose(null)} actions={<button className="btn" disabled={busy} onClick={confirmTransport}>Confirm transport</button>}>
          <p><b>{choose.vehicle.label}</b> <span className="plate">{choose.vehicle.regNo}</span> <Fac f={choose.vehicle.facility} /> for <b>{tk0(choose.price)}</b>.</p>
          <p className="small" style={{ marginTop: 6 }}>Pickup {dateTime(choose.pickupAt)} in {d.route.from.upazila} · delivery by {dateTime(choose.deliverBy)}.</p>
          {choose.season.tag === "WEATHER_RISK" && <div className="note warn" style={{ marginTop: 10 }}><b>Season warning (advice only):</b> {choose.season.text}</div>}
          {choose.season.tag === "COST_SAVING" && <div className="note good" style={{ marginTop: 10 }}>{choose.season.text}</div>}
          {choose.vehicle.facility !== d.need && <p className="small muted" style={{ marginTop: 8 }}>This vehicle has more than the {STORAGE_LABEL[d.need].toLowerCase()} facility this produce needs.</p>}
          {choose.counter?.state === "WAITING" && <div className="note warn" style={{ marginTop: 10 }}>You asked {tk0(choose.counter.price)} and are waiting for an answer. Choosing now books it at their price, {tk0(choose.price)}, and closes your counter.</div>}
          <p className="small muted" style={{ marginTop: 8 }}>You pay the transporter. Other offers are closed and the transporters are told. Your delivery code appears next.</p>
        </Modal>
      )}
      {counter && (
        <Modal title={`Counter ${counter.transporter.name}'s offer`} onClose={() => setCounter(null)} actions={<button className="btn" disabled={busy || !cPrice} onClick={sendCounter}>Send counter</button>}>
          <p>They offer <b>{tk0(counter.price)}</b> for {counter.vehicle.label} <span className="plate">{counter.vehicle.regNo}</span>, pickup {dateTime(counter.pickupAt)}.</p>
          <div className="row" style={{ marginTop: 12 }}>
            <div className="field"><label htmlFor={"cp-" + counter.id}>Your price (total ৳)</label><input id={"cp-" + counter.id} type="number" min={100} max={counter.price - 1} step={50} value={cPrice} onChange={(e) => setCPrice(e.target.value)} placeholder={String(Math.round(counter.price * 0.85 / 50) * 50)} /><FieldErr e={cFields.price} />{+cPrice > 0 && <small>{tk(+cPrice / d.quantityKg)} per kg</small>}</div>
            <div className="field"><label htmlFor={"cn-" + counter.id}>Note <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input id={"cn-" + counter.id} value={cNote} maxLength={200} onChange={(e) => setCNote(e.target.value)} placeholder="e.g. Short route, only 25 km" /></div>
          </div>
          <p className="small muted">Only the price changes; vehicle and times stay as offered. You get <b>one counter per offer</b>. If they accept, transport is confirmed straight away at your price. If they say no or don&apos;t answer within {d.transport.counterHours} hours, their offer stays and you can still choose it.</p>
        </Modal>
      )}
      {cancel && (
        <Modal title={needsAdmin ? `Request to cancel ${d.code}` : `Cancel deal ${d.code}?`} onClose={() => setCancel(false)} actions={<button className="btn warn" onClick={doCancel}>{needsAdmin ? "Send request" : "Cancel deal"}</button>}>
          <p style={{ marginBottom: 10 }}>{needsAdmin ? "Transport is already booked, so an admin must approve the cancellation. Until then the deal and the transport stay as they are." : `No transport is booked yet, so the deal is cancelled immediately. ${side === "farmer" ? "The dealer" : "The farmer"} is told your reason.`}</p>
          <div className="field"><label htmlFor={"cr-" + d.id}>Reason (required)</label><textarea id={"cr-" + d.id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          {err && <div className="note bad">{err}</div>}
          <p className="small muted">Admins review cancellation reasons. Three or more cancellations in 30 days raise an alert.</p>
        </Modal>
      )}
    </div>
  );
}
