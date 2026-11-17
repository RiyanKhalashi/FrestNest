"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { tk0, kg, dateTime, Countdown } from "@/lib/format";
import type { Trip, Vehicle } from "@/lib/types";
import { useLiveEvent } from "@/lib/live";
import { Welcome } from "@/components/Welcome";
import { Fac } from "@/components/transport";

function season() {
  const m = new Date().getMonth();
  if (m >= 10 || m <= 1) return ["Winter · Nov–Feb", "Normal vehicles are fine and get a cost-saving tag. Plan extra time for morning fog on highways.", "good"];
  if (m <= 4) return ["Summer · Mar–May", "Heat can spoil produce in normal vehicles. Travel at night or early morning; dealers see a weather warning.", "warn"];
  return ["Monsoon · Jun–Oct", "Cover loads with a tarpaulin and allow for delays. Dealers see a weather warning on normal vehicles.", "warn"];
}

export default function Page() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [open, setOpen] = useState(0);
  const [vs, setVs] = useState<Vehicle[]>([]);
  const load = useCallback(async () => {
    const [t, b, v] = await Promise.all([api<{ trips: Trip[] }>("/transport/trips"), api<{ deals: Trip[] }>("/transport/deals"), api<{ vehicles: Vehicle[] }>("/vehicles")]);
    setTrips(t.trips); setOpen(b.deals.filter((d) => !d.transport.offers.some((o) => o.mine)).length); setVs(v.vehicles);
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveEvent("deal", load);
  useLiveEvent("transport", load);

  const mine = (t: Trip) => t.transport.offers.find((o) => o.mine && o.status === "ACCEPTED");
  const road = trips.filter((t) => t.status === "IN_TRANSIT" && mine(t));
  const confirmed = trips.filter((t) => t.status === "TRANSPORT_CONFIRMED" && mine(t)).sort((a, b) => +new Date(mine(a)!.pickupAt) - +new Date(mine(b)!.pickupAt));
  const waiting = trips.filter((t) => t.status === "AWAITING_TRANSPORT" && t.transport.offers.some((o) => o.mine && o.status === "PENDING"));
  const done = trips.filter((t) => t.status === "COMPLETED" && mine(t));
  const earned = done.filter((t) => t.deliveredAt && new Date(t.deliveredAt).getMonth() === new Date().getMonth()).reduce((s, t) => s + (mine(t)?.price ?? 0), 0);
  const [sName, sText, sTone] = season();

  return (
    <>
      <Welcome code="T1" line={`${vs.filter((v) => v.status === "APPROVED").length} approved vehicle${vs.length === 1 ? "" : "s"}`} />
      <div className="stats">
        <div><span>On the road now</span><b className="num">{road.length}</b><small>{road[0] ? `${road[0].code} · deliver by ${dateTime(mine(road[0])!.deliverBy)}` : "nothing in transit"}</small></div>
        <div><span>Confirmed pickups</span><b className="num">{confirmed.length}</b><small>{confirmed[0] ? `next ${dateTime(mine(confirmed[0])!.pickupAt)}` : "none booked"}</small></div>
        <div><span>Offers waiting</span><b className="num">{waiting.length}</b><small>{open} new deal{open === 1 ? "" : "s"} you can offer on</small></div>
        <div><span>Earned this month</span><b className="num">{tk0(earned)}</b><small>{done.length} trip{done.length === 1 ? "" : "s"} completed</small></div>
      </div>
      <div className="grid g-main">
        <div className="panel">
          <h3>Next trips <Link className="small" href="/transporter/trips">My trips</Link></h3>
          {[...road, ...confirmed].length ? <table className="ledger"><tbody>{[...road, ...confirmed].slice(0, 6).map((t) => {
            const o = mine(t)!;
            return (
              <tr key={t.id}>
                <td><span className={"tag " + (t.status === "IN_TRANSIT" ? "rust" : "blue")}>{t.status === "IN_TRANSIT" ? "On the road" : "Pickup"}</span></td>
                <td><b>{t.listing.product} · {kg(t.quantityKg)}</b> · {t.route.from.upazila} → {t.route.to.district}<br /><span className="small muted">{o.vehicle.regNo} · {t.status === "IN_TRANSIT" ? "deliver by " + dateTime(o.deliverBy) : "pickup " + dateTime(o.pickupAt)}</span></td>
                <td className="right"><Link className="btn ghost sm" href="/transporter/trips">{t.status === "IN_TRANSIT" ? "Enter delivery code" : "Open"}</Link></td>
              </tr>
            );
          })}</tbody></table> : <p className="pb muted">No trips booked. <Link href="/transporter/deals">Find deals</Link></p>}
          {waiting.length > 0 && <><h3 style={{ borderTop: "1px solid var(--line)", borderRadius: 0 }}>Waiting for dealers</h3><table className="ledger"><tbody>{waiting.map((t) => <tr key={t.id}><td><b>{t.listing.product} · {kg(t.quantityKg)}</b> · {t.route.from.upazila} → {t.route.to.district}</td><td className="right small">closes in <Countdown to={t.transport.windowEndsAt} /></td></tr>)}</tbody></table></>}
        </div>
        <div className="grid">
          <div className="panel"><h3>Season tip</h3><div className="pb"><div className={"note " + sTone}><b>{sName}.</b> {sText}</div><p className="small muted" style={{ marginTop: 8 }}>Advice only. It never blocks an offer.</p></div></div>
          <div className="panel"><h3>Your vehicles <Link className="small" href="/transporter/vehicles">Manage</Link></h3>
            <table className="ledger"><tbody>{vs.map((v) => <tr key={v.id}><td><b>{v.label}</b> <Fac f={v.facility} /><br /><span className="plate">{v.regNo}</span></td><td className="right">{v.status !== "APPROVED" ? <span className="tag gold">Admin check</span> : v.bookings.length ? <span className="tag blue">Booked</span> : v.active ? <span className="tag green">Free</span> : <span className="tag plain">Off</span>}</td></tr>)}</tbody></table>
          </div>
        </div>
      </div>
    </>
  );
}
