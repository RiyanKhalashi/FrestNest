"use client";
// Shared transport pieces (waybill look from the transporter prototype)
import { useState } from "react";
import { dateTime, tk0, Countdown } from "@/lib/format";
import { api, ApiError } from "@/lib/api";
import type { Deal, Storage, TransportOffer } from "@/lib/types";
import { Modal, useToast } from "../common/UI";

export function Fac({ f }: { f: Storage }) {
  const c = f === "NORMAL" ? "normal" : f === "VENTILATED" ? "vent" : "cold";
  return <span className={"fac " + c}>{f === "NORMAL" ? "Normal" : f === "VENTILATED" ? "Ventilated" : "Refrigerated"}</span>;
}

export function Route({ d, dash }: { d: Deal; dash?: boolean }) {
  return (
    <div className={"route" + (dash ? " dash" : "")}>
      <div className="end"><b>{d.route.from.upazila}, {d.route.from.district}</b><span>{d.route.from.village ? d.route.from.village + " · " : ""}{d.farmer.name}&apos;s farm</span></div>
      <div className="line"><i /><span className="km">{d.route.long ? "long trip" : "local"}</span><i /></div>
      <div className="end to"><b>{[d.route.to.upazila, d.route.to.district].filter(Boolean).join(", ")}</b><span>{d.route.to.name}</span></div>
    </div>
  );
}

/** Confirmed → Picked up → In transit → Delivered → Completed */
export function Track({ d }: { d: Deal }) {
  const done = { TRANSPORT_CONFIRMED: 1, IN_TRANSIT: 2, COMPLETED: 5 }[d.status as string];
  if (!done) return null;
  const steps: [string, string | null][] = [
    ["Transport confirmed", d.transport.confirmed ? dateTime(d.transport.confirmed.pickupAt).replace(/^/, "pickup ") : null],
    ["Picked up", d.pickedUpAt ? dateTime(d.pickedUpAt) : null],
    ["In transit", d.pickedUpAt ? "on the road" : null],
    ["Delivered", d.deliveredAt ? dateTime(d.deliveredAt) : null],
    ["Completed", d.deliveredAt ? "receipt confirmed" : null],
  ];
  return <div className="track" style={{ marginBottom: 10 }}>{steps.map(([label, sub], k) => <div key={label} className={k < done ? "done" : k === done ? "now" : ""}>{label}{sub && <><br /><span className="small muted">{sub}</span></>}</div>)}</div>;
}

export function SeasonTag({ o }: { o: Pick<TransportOffer, "season"> }) {
  if (!o.season.tag) return null;
  return o.season.tag === "COST_SAVING"
    ? <span className="tag green" title={o.season.text ?? ""}>Cost-saving</span>
    : <span className="tag gold" title={o.season.text ?? ""}>Weather risk</span>;
}

export function Stars({ value, onChange, size = 22 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="rate" onMouseLeave={() => setHover(0)} role={onChange ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={(hover || value) >= n ? "on" : ""} style={{ fontSize: size, cursor: onChange ? "pointer" : "default" }}
          aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => onChange && setHover(n)} onClick={() => onChange?.(n)} disabled={!onChange}>★</button>
      ))}
    </span>
  );
}

export function CodeBox({ label, code, hint }: { label: string; code: string; hint: string }) {
  return (
    <div className="note good" style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <div className="otp" aria-label={label}>{code}</div>
      <div><b>{label}</b><br /><span className="small">{hint}</span></div>
    </div>
  );
}

/** One line about the dealer's counter-offer on a transport offer, worded for whoever is looking. */
export function CounterStatus({ o, side }: { o: TransportOffer; side: "farmer" | "dealer" | "transporter" }) {
  const c = o.counter;
  if (!c) return null;
  const ask = tk0(c.price);
  const who = side === "dealer" ? "You" : "The dealer";
  if (c.state === "ACCEPTED") return <div className="small" style={{ marginTop: 4, color: "var(--leaf)" }}>Agreed at {ask} after a counter-offer{o.originalPrice ? ` (first offered ${tk0(o.originalPrice)})` : ""}</div>;
  if (c.state === "CLOSED") return <div className="small muted" style={{ marginTop: 4 }}>Counter-offer of {ask} closed</div>;
  if (c.state === "REJECTED") return <div className="small muted" style={{ marginTop: 4 }}>{side === "transporter" ? `You said no to the dealer's ${ask}. Your offer still stands.` : `${who} asked ${ask}; the transporter said no. This offer still stands.`}</div>;
  if (c.state === "EXPIRED") return <div className="small muted" style={{ marginTop: 4 }}>{side === "transporter" ? `The dealer's ${ask} counter expired. Your offer still stands.` : `${who} asked ${ask}; no answer in time. This offer still stands.`}</div>;
  if (o.status !== "PENDING" || side === "transporter") return null; // the transporter answers in <CounterAnswer>
  return (
    <div className="small" style={{ marginTop: 4, color: "#7c5606" }}>
      {who} asked {ask}{c.note ? ` (“${c.note}”)` : ""} · waiting for the transporter · <Countdown to={c.expiresAt} prefix="answer within " done="time is up" />
    </div>
  );
}

/** Transporter: accept (books the trip at the counter price) or reject (keeps the original offer). */
export function CounterAnswer({ o, onDone }: { o: TransportOffer; onDone: () => void }) {
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = o.counter;
  if (!c || c.state !== "WAITING" || o.status !== "PENDING") return null;
  async function answer(yes: boolean) {
    setBusy(true);
    try {
      await api(`/transport/offers/${o.id}/counter/${yes ? "accept" : "reject"}`, { method: "POST" });
      toast(yes ? "Trip booked at the counter price. Ask the farmer for the pickup code at loading." : "Counter rejected. Your offer still stands.");
      setAsk(false); onDone();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); } finally { setBusy(false); }
  }
  return (
    <div className="note warn" style={{ marginTop: 10 }}>
      <b>The dealer asks {tk0(c.price)}</b> instead of your {tk0(o.price)}{c.note ? `: “${c.note}”` : "."} <Countdown to={c.expiresAt} prefix="Answer within " done="Time is up." />
      <div className="btns" style={{ marginTop: 8 }}>
        <button className="btn sm" disabled={busy} onClick={() => setAsk(true)}>Accept {tk0(c.price)}</button>
        <button className="btn ghost sm" disabled={busy} onClick={() => answer(false)}>Reject, keep my offer</button>
      </div>
      {ask && (
        <Modal title={`Accept ${tk0(c.price)}?`} onClose={() => setAsk(false)} actions={<button className="btn" disabled={busy} onClick={() => answer(true)}>Accept and book the trip</button>}>
          <p>The trip is <b>booked straight away</b> at {tk0(c.price)}: {o.vehicle.label} <span className="plate">{o.vehicle.regNo}</span>, pickup {dateTime(o.pickupAt)}, delivery by {dateTime(o.deliverBy)}.</p>
          <p className="small muted" style={{ marginTop: 8 }}>After this, giving up the trip needs a cancellation with a reason.</p>
        </Modal>
      )}
    </div>
  );
}
