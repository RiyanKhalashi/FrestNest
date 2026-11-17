"use client";
// Shared transport pieces (waybill look from the transporter prototype)
import { useState } from "react";
import { dateTime } from "@/lib/format";
import type { Deal, Storage, TransportOffer } from "@/lib/types";

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
