"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { tk, tk0, kg, dateShort, dateTime, Countdown, toLocalInput } from "@/lib/format";
import type { Trip, Vehicle } from "@/lib/types";
import { useLiveEvent } from "@/lib/live";
import { useSession } from "@/components/Session";
import { Empty, FieldErr, ProductIcon, useToast } from "@/components/ui";
import { Route, Fac, CounterAnswer, CounterStatus } from "@/components/transport";

interface Board { deals: Trip[]; hidden: { facility: number; local: number }; vehicles: number; districts: { id: number; name: string; upazilas: { id: number; name: string }[] }[]; myDistrictId: number | null }

// season preview on the client (same calendar as the server)
function seasonPreview(facility: string, at: Date) {
  if (facility !== "NORMAL" || isNaN(at.getTime())) return null;
  const m = at.getMonth();
  if (m >= 10 || m <= 1) return { good: true, text: "Winter: a normal vehicle is fine and cheaper. Your offer is tagged Cost-saving." };
  if (m <= 4) return { good: false, text: "Summer heat: produce may spoil in a normal vehicle. Prefer night or early-morning travel. Dealers see a weather warning." };
  return { good: false, text: "Monsoon: cover the load with a tarpaulin and expect delays. Dealers see a weather warning." };
}

function OfferForm({ d, vehicles, onDone, blocked }: { d: Trip; vehicles: Vehicle[]; onDone: () => void; blocked: string | null }) {
  const toast = useToast();
  const mine = d.transport.offers.find((o) => o.mine && o.status === "PENDING");
  const fits = vehicles.filter((v) => d.fittingVehicles?.includes(v.id));
  const [f, setF] = useState(() => {
    const defPickup = new Date(Math.max(Date.now() + 2 * 3600_000, new Date(d.listing.harvestDate).getTime()));
    defPickup.setMinutes(0, 0, 0);
    return {
    vehicleId: mine?.vehicle.id ?? fits[0]?.id ?? "", price: mine ? String(mine.price) : "",
    pickupAt: toLocalInput(mine ? new Date(mine.pickupAt) : defPickup), deliverBy: toLocalInput(mine ? new Date(mine.deliverBy) : new Date(defPickup.getTime() + (d.route.long ? 10 : 4) * 3600_000)), note: mine?.note ?? "",
    };
  });
  const [editing, setEditing] = useState(!mine);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [busy, setBusy] = useState(false);
  const v = vehicles.find((x) => x.id === f.vehicleId);
  const season = v ? seasonPreview(v.facility, new Date(f.pickupAt)) : null;

  async function send() {
    setBusy(true); setFields({});
    const body = { vehicleId: f.vehicleId, price: +f.price, pickupAt: new Date(f.pickupAt).toISOString(), deliverBy: new Date(f.deliverBy).toISOString(), note: f.note || undefined };
    try {
      if (mine) await api(`/transport/offers/${mine.id}`, { method: "PUT", body }); else await api(`/transport/deals/${d.id}/offers`, { body });
      toast(mine ? "Offer updated." : "Offer sent. The dealer and the farmer are notified."); setEditing(false); onDone();
    } catch (e) { if (e instanceof ApiError) { toast(e.message); setFields(e.fields); } } finally { setBusy(false); }
  }
  async function withdraw() {
    try { await api(`/transport/offers/${mine!.id}/withdraw`, { method: "POST" }); toast("Offer withdrawn."); onDone(); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); }
  }

  if (blocked) return <div className="sec"><div className="note warn">{blocked}</div></div>;
  if (!fits.length) return <div className="sec"><div className="note warn">None of your approved vehicles fits this deal.</div></div>;
  return (
    <div className="sec">
      <h4>{mine ? "Your offer" : "Send a transport offer"} <small>One offer per deal · edit or withdraw until the dealer confirms</small></h4>
      {mine && !editing ? (
        <div className="offer">
          <div><h5>{mine.vehicle.label} <span className="plate">{mine.vehicle.regNo}</span> · {tk0(mine.price)}</h5>
            <div className="small muted">Pickup {dateTime(mine.pickupAt)} · delivery by {dateTime(mine.deliverBy)}</div>
            <CounterStatus o={mine} side="transporter" /></div>
          <div className="btns">{mine.counter?.state !== "WAITING" && <button className="btn ghost sm" onClick={() => setEditing(true)}>Edit</button>}<button className="btn warn sm" onClick={withdraw}>Withdraw</button></div>
          <div style={{ gridColumn: "1 / -1" }}><CounterAnswer o={mine} onDone={onDone} /></div>
        </div>
      ) : (
        <>
          <div className="row">
            <div className="field"><label htmlFor="ov">Vehicle</label>
              <select id="ov" value={f.vehicleId} onChange={(e) => setF({ ...f, vehicleId: e.target.value })}>{fits.map((x) => <option key={x.id} value={x.id}>{x.label} · {x.facility.toLowerCase()} · {x.regNo}</option>)}</select><FieldErr e={fields.vehicleId} /></div>
            <div className="field"><label htmlFor="op">Your price (total ৳, paid by the dealer)</label><input id="op" type="number" min={100} step={50} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /><FieldErr e={fields.price} />{+f.price > 0 && <small>{tk(+f.price / d.quantityKg)} per kg</small>}</div>
          </div>
          <div className="row">
            <div className="field"><label htmlFor="opa">Pickup date and time</label><input id="opa" type="datetime-local" value={f.pickupAt} onChange={(e) => setF({ ...f, pickupAt: e.target.value })} /><FieldErr e={fields.pickupAt} /></div>
            <div className="field"><label htmlFor="odb">Delivery by</label><input id="odb" type="datetime-local" value={f.deliverBy} onChange={(e) => setF({ ...f, deliverBy: e.target.value })} /><FieldErr e={fields.deliverBy} /></div>
          </div>
          <div className="field"><label htmlFor="on">Note for the dealer <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input id="on" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Tarpaulin and 2 loaders included" /></div>
          {season && <div className={"note " + (season.good ? "good" : "warn")} style={{ marginBottom: 12 }}>{season.text} <span className="muted">(advice only)</span></div>}
          <div className="btns"><button className="btn rust" disabled={busy || !f.vehicleId || !+f.price} onClick={send}>{mine ? "Save offer" : "Send offer"}</button>{mine && <button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>}</div>
        </>
      )}
    </div>
  );
}

function Detail({ d, vehicles, reload, blocked }: { d: Trip; vehicles: Vehicle[]; reload: () => void; blocked: string | null }) {
  return (
    <div className="panel">
      <div className="dhead">
        <div className="ttl"><ProductIcon name={d.listing.product} size={44} /><div><h2>{d.listing.product} · {kg(d.quantityKg)}</h2><p className="muted">Deal {d.code} · {d.farmer.name} ({d.route.from.district}) sold to {d.dealer.name} ({d.route.to.district ?? "—"}) · {d.transport.offers.length ? "your offer sent" : "no offer from you yet"}</p></div></div>
        <div style={{ textAlign: "right" }}>{d.small ? <span className="tag plain">Small · local</span> : <span className="tag green">Open for offers</span>}<div className="small muted" style={{ marginTop: 6 }}>{d.transport.windowOpen ? <Countdown to={d.transport.windowEndsAt} prefix="Window closes in " done="Window closed" /> : "Window closed"}</div></div>
      </div>
      <div className="sec"><Route d={d} /></div>
      <div className="sec">
        <dl className="kv">
          <dt>Vehicle needed</dt><dd><Fac f={d.need} />{d.route.long ? " · long trip" : " · local trip"}{d.needByFarmer ? " · farmer asked for this" : ""}</dd>
          <dt>Harvest</dt><dd>{dateShort(d.listing.harvestDate)} · keeps about {d.listing.shelfLifeDays} days</dd>
          <dt>Your vehicles that fit</dt><dd>{vehicles.filter((v) => d.fittingVehicles?.includes(v.id)).map((v) => v.regNo).join(", ") || "none"}</dd>
          {d.small && <><dt>Why you see this</dt><dd>Small pickups (under 300 kg) go only to transporters based in or next to the pickup upazila.</dd></>}
        </dl>
      </div>
      <OfferForm key={d.id + (d.transport.offers[0]?.id ?? "")} d={d} vehicles={vehicles} onDone={reload} blocked={blocked} />
    </div>
  );
}

function Deals() {
  const { user } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dists, setDists] = useState<number[] | null>(null);
  const [f, setF] = useState({ upazilaId: "", need: "", state: "" });
  const sel = params.get("d");

  const load = useCallback(async () => {
    const q = new URLSearchParams({ ...(dists ? { districtIds: dists.join(",") || "0" } : {}), ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) });
    const [b, v] = await Promise.all([api<Board>("/transport/deals?" + q), api<{ vehicles: Vehicle[] }>("/vehicles")]);
    setBoard(b); setVehicles(v.vehicles);
    if (dists === null && b.myDistrictId) setDists(b.districts.map((x) => x.id));
  }, [dists, f]);
  useEffect(() => { load(); }, [load]);
  useLiveEvent("transport", load);
  useLiveEvent("deal", load);

  const ups = useMemo(() => (board?.districts ?? []).filter((d) => !dists || dists.includes(d.id)).flatMap((d) => d.upazilas), [board, dists]);
  if (!board) return <p className="muted">Loading…</p>;
  const current = board.deals.find((d) => d.id === sel) ?? board.deals[0];
  const blocked = user?.status === "ACTIVE" ? null : user?.status === "PENDING" ? "Your account is waiting for admin verification. You can look, but not send offers yet." : "Your account cannot send new offers right now.";
  const toggle = (id: number) => setDists((ds) => (ds ?? []).includes(id) ? (ds ?? []).filter((x) => x !== id) : [...(ds ?? []), id]);

  return (
    <>
      <div className="head"><div><h1>Find deals</h1><p>Primary deals that one of your vehicles can carry. Pick the pickup districts you want to work in.</p></div><span className="code">Screen T2</span></div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="pb" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
          <div className="field" style={{ margin: 0 }}><label>Pickup districts (farmer&apos;s district)</label>
            <div className="checks" style={{ marginTop: 4, marginBottom: 0 }}>{board.districts.map((d) => <label key={d.id}><input type="checkbox" checked={!dists || dists.includes(d.id)} onChange={() => toggle(d.id)} />{d.name}</label>)}</div></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="fu">Pickup upazila</label><select id="fu" value={f.upazilaId} onChange={(e) => setF({ ...f, upazilaId: e.target.value })}><option value="">All upazilas</option>{ups.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="fn">Vehicle needed</label><select id="fn" value={f.need} onChange={(e) => setF({ ...f, need: e.target.value })}><option value="">Any I can carry</option><option value="NORMAL">Normal</option><option value="VENTILATED">Ventilated</option><option value="REFRIGERATED">Refrigerated</option></select></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="fs">Status</label><select id="fs" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}><option value="">All</option><option value="new">Not offered yet</option><option value="mine">My offer sent</option></select></div>
        </div>
        <div className="pb" style={{ paddingTop: 0 }}><p className="small muted">Matching uses facility and capacity: a deal appears only if one of your approved vehicles has the facility the produce needs and can carry the full quantity.
          {board.hidden.facility > 0 && <> <b>{board.hidden.facility} deal{board.hidden.facility > 1 ? "s are" : " is"} hidden</b> because your vehicles cannot carry {board.hidden.facility > 1 ? "them" : "it"}.</>}
          {board.hidden.local > 0 && <> {board.hidden.local} small local pickup{board.hidden.local > 1 ? "s are" : " is"} reserved for transporters near the farm.</>}</p></div>
      </div>
      {board.vehicles === 0 ? <Empty title="No approved vehicles yet"><p style={{ marginTop: 6 }}>Add your vehicles in <Link href="/transporter/vehicles">My vehicles</Link>. An admin checks each registration before you can send offers.</p></Empty>
        : !board.deals.length ? <Empty title="No deals match right now">New deals appear here live when farmers and dealers agree.</Empty> : (
          <div className="md">
            <div className="panel list">
              <h5>{board.deals.length} deal{board.deals.length > 1 ? "s" : ""}</h5>
              {board.deals.map((d) => {
                const my = d.transport.offers.find((o) => o.mine && o.status === "PENDING"), mine = !!my;
                return (
                  <button key={d.id} className={"item" + (current?.id === d.id ? " on" : "")} onClick={() => router.replace("/transporter/deals?d=" + d.id, { scroll: false })}>
                    <b><span className="nm" style={{ display: "flex", gap: 9, alignItems: "center" }}><ProductIcon name={d.listing.product} />{d.listing.product} · {kg(d.quantityKg)}</span>{my?.counter?.state === "WAITING" ? <span className="tag red">Counter-offer</span> : mine ? <span className="tag gold">Your offer</span> : d.small ? <span className="tag plain">Small · local</span> : <span className="tag green">New</span>}</b>
                    <span>{d.route.from.upazila} → {d.route.to.district ?? d.route.to.name} · {d.need.toLowerCase()} · <Countdown to={d.transport.windowEndsAt} prefix="closes in " done="closed" /></span>
                  </button>
                );
              })}
            </div>
            {current && <Detail d={current} vehicles={vehicles} reload={load} blocked={blocked} />}
          </div>
        )}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Deals /></Suspense>;
}
