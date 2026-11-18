"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { tk, tk0, kg, dateShort, dateTime, ago, Countdown, toLocalInput, STORAGE_LABEL, SCOPE_LABEL } from "@/lib/format";
import type { Deal, Listing, Offer } from "@/lib/types";
import { STATUS_TAG, OFFER_TAG } from "@/lib/types";
import { useListingLive, useLiveEvent } from "@/lib/live";
import { Empty, FieldErr, Modal, ProductIcon, useToast } from "@/components/ui";
import { DealCard } from "@/components/DealCard";

function OfferRow({ o, onDone }: { o: Offer; onDone: () => void }) {
  const toast = useToast();
  const [counter, setCounter] = useState(false);
  const [cp, setCp] = useState(String(o.pricePerKg));
  const [busy, setBusy] = useState(false);
  const act = async (path: string, body: unknown, msg: string) => {
    setBusy(true);
    try { await api(`/offers/${o.id}/${path}`, { body }); toast(msg); onDone(); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); } finally { setBusy(false); }
  };
  const open = o.status === "PENDING";
  return (
    <div className={"offer" + (["PENDING", "COUNTERED"].includes(o.status) ? "" : " dead")}>
      <div>
        <h5>{o.dealer.name} <span className="muted small" style={{ fontWeight: 400 }}>· {o.dealer.place}</span> <span className={"tag " + OFFER_TAG[o.status][0]} style={{ marginLeft: 6 }}>{OFFER_TAG[o.status][1]}</span></h5>
        <div className="small" style={{ marginTop: 3 }}><b className="num">{kg(o.quantityKg)}</b> at <b className="num">{tk(o.pricePerKg)}</b>/kg = {tk0(o.total)}{o.note ? <span className="muted"> · “{o.note}”</span> : null}</div>
        {o.status === "COUNTERED" && <div className="small" style={{ marginTop: 3 }}>You countered: {kg(o.counterQtyKg ?? o.quantityKg)} at {tk(o.counterPrice)}/kg. Waiting for the dealer.</div>}
        {["PENDING", "COUNTERED"].includes(o.status) && <div className="small muted"><Countdown to={o.expiresAt} prefix="Expires in " done="Expired" /> ({dateTime(o.expiresAt)})</div>}
        {!["PENDING", "COUNTERED"].includes(o.status) && <div className="small muted">{ago(o.at)}</div>}
      </div>
      {open && (
        <div className="btns" style={{ justifyContent: "flex-end" }}>
          <button className="btn sm" disabled={busy} onClick={() => act("accept", {}, "Offer accepted. Deal created.")}>Accept</button>
          <button className="btn ghost sm" disabled={busy} onClick={() => setCounter(!counter)}>Counter</button>
          <button className="btn warn sm" disabled={busy} onClick={() => act("reject", {}, "Offer rejected.")}>Reject</button>
        </div>
      )}
      {open && counter && (
        <div className="counter">
          <span className="small">Your price (৳/kg)</span><input type="number" step="0.5" value={cp} onChange={(e) => setCp(e.target.value)} />
          <button className="btn sm" disabled={busy || !+cp} onClick={() => act("counter", { pricePerKg: +cp }, "Counter-offer sent. You can counter only once.")}>Send counter-offer</button>
          <span className="small muted">Only one counter per offer.</span>
        </div>
      )}
    </div>
  );
}

function Relist({ l, onDone }: { l: Listing; onDone: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<"BID" | "OWN">("BID");
  const [end, setEnd] = useState(() => toLocalInput(new Date(Date.now() + (l.scope === "NATION" ? 25 : 13) * 3600_000)));
  const [price, setPrice] = useState(String(l.pricePerKg));
  const [reply, setReply] = useState("6");
  const [err, setErr] = useState<Record<string, string[] | undefined>>({});
  const [msg, setMsg] = useState("");
  async function go() {
    setErr({}); setMsg("");
    try {
      const r = await api<{ warning?: string }>(`/listings/${l.id}/relist`, { body: mode === "BID" ? { mode, bidEndsAt: new Date(end).toISOString(), pricePerKg: +price } : { mode, minResponseHours: +reply, pricePerKg: +price } });
      toast("Listing is open again. " + (r.warning ?? "")); onDone();
    } catch (e) { if (e instanceof ApiError) { setMsg(e.message); setErr(e.fields); } }
  }
  return (
    <div className="sec">
      <h4>Relist once <small>Bidding ended without bids</small></h4>
      <p className="small muted" style={{ marginBottom: 10 }}>Suggestions: give dealers more time, lower the price, or switch to your own price so dealers can buy part of the lot.</p>
      <div className="choice">
        <div><input type="radio" name="rm" id="rm1" checked={mode === "BID"} onChange={() => setMode("BID")} /><label htmlFor="rm1"><b>Bid again</b><small>New end time</small></label></div>
        <div><input type="radio" name="rm" id="rm2" checked={mode === "OWN"} onChange={() => setMode("OWN")} /><label htmlFor="rm2"><b>Switch to my own price</b><small>Dealers send offers</small></label></div>
      </div>
      <div className="row">
        <div className="field"><label htmlFor="rp">{mode === "BID" ? "Base price" : "Asking price"} (৳/kg)</label><input id="rp" type="number" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        {mode === "BID"
          ? <div className="field"><label htmlFor="re">Bidding ends</label><input id="re" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /><FieldErr e={err.bidEndsAt} /></div>
          : <div className="field"><label htmlFor="rr">Dealers must give me at least</label><select id="rr" value={reply} onChange={(e) => setReply(e.target.value)}><option value="2">2 hours</option><option value="6">6 hours</option><option value="12">12 hours</option><option value="24">24 hours</option></select></div>}
      </div>
      {msg && <div className="note bad" style={{ marginBottom: 10 }}>{msg}</div>}
      <button className="btn" onClick={go}>Relist</button>
    </div>
  );
}

function Detail({ l, deals, reload }: { l: Listing; deals: Deal[]; reload: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [withdraw, setWithdraw] = useState(false);
  const b = l.bidding;
  const myDeals = deals.filter((d) => d.listing.id === l.id);
  const pending = l.offers.filter((o) => o.status === "PENDING" || o.status === "COUNTERED");
  const closed = l.offers.filter((o) => !(o.status === "PENDING" || o.status === "COUNTERED"));

  return (
    <div className="panel">
      <div className="dhead">
        <div className="ttl"><ProductIcon name={l.product.name} size={44} /><div><h2>{l.product.name} · {kg(l.quantityKg)}</h2><p className="muted">{l.code} · {l.mode === "BID" ? "Open bidding" : "Own price"} · {SCOPE_LABEL[l.scope]}</p></div></div>
        <div style={{ textAlign: "right" }}>
          <span className={"tag " + STATUS_TAG[l.status][0]}>{STATUS_TAG[l.status][1]}</span>
          {l.status === "OPEN" && b && <div className="small muted" style={{ marginTop: 6 }}><Countdown to={b.endsAt} prefix="Bidding ends in " done="Bidding ended" /></div>}
          {l.urgent && l.status === "OPEN" && <div style={{ marginTop: 6 }}><span className="tag red">{l.daysLeft} day{l.daysLeft === 1 ? "" : "s"} of shelf life left</span></div>}
        </div>
      </div>

      {l.emergency && (
        <div className="sec"><div className="note warn"><b>Emergency sale</b> from the stuck vehicle{l.emergency.locationNote ? ` (${l.emergency.locationNote})` : ""}, original deal {l.emergency.originalDeal}. Pickup in {l.place.upazila}, {l.place.district}.
          {l.status === "OPEN" && <> Visible to: <b>{l.emergency.tierLabel.toLowerCase()}</b>. It widens by itself after 1 hour without bids.{l.emergency.tier < 3 && <button className="btn ghost sm" style={{ marginLeft: 8 }} onClick={async () => { try { await api(`/emergency/listing/${l.id}/widen`, { method: "POST" }); toast("Widened. More dealers are told."); reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); } }}>Widen now</button>}</>}
        </div></div>
      )}

      {l.photos.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <div className="sec"><div className="photos">{l.photos.map((p) => <img key={p} src={p} alt={l.product.name} style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)" }} />)}</div></div>
      )}

      <div className="sec">
        <dl className="kv">
          <dt>{l.mode === "BID" ? "Base price" : "Asking price"}</dt><dd>{tk(l.pricePerKg)} / kg</dd>
          {l.mode === "OWN" && <><dt>Left to sell</dt><dd>{kg(l.remainingKg)} of {kg(l.quantityKg)}<div className="bar" style={{ marginTop: 5, maxWidth: 260 }}><i style={{ width: (100 * (l.quantityKg - l.remainingKg)) / l.quantityKg + "%" }} /></div></dd></>}
          <dt>Harvest</dt><dd>{dateShort(l.harvestDate)} {l.harvested ? `· ${l.daysLeft} day(s) of shelf life left` : `· keeps about ${l.product.shelfLifeDays} days after`}</dd>
          <dt>Vehicle</dt><dd>{STORAGE_LABEL[l.product.storage]}{l.product.farmerSet ? " (your choice)" : ""}</dd>
          <dt>Visible to</dt><dd>{SCOPE_LABEL[l.scope]}{l.scope === "UPAZILA" ? ` (${[l.place.upazila, ...l.targets.upazilas.map((x) => x.name)].join(", ")})` : l.scope === "DISTRICT" ? ` (${[l.place.district, ...l.targets.districts.map((x) => x.name)].join(", ")})` : ""}</dd>
          {b && <><dt>Bidding</dt><dd>Ends {dateTime(b.endsAt)} · raise at least {tk(b.minIncrement)}{b.buyNowPrice ? ` · Buy Now ${tk(b.buyNowPrice)}` : ""}</dd></>}
          {l.own && <><dt>Offers</dt><dd>{l.own.minOrderKg ? `Minimum ${kg(l.own.minOrderKg)} · ` : ""}dealers give you at least {l.own.minResponseHours} h to reply</dd></>}
          {l.description && <><dt>Description</dt><dd>{l.description}</dd></>}
        </dl>
        {l.canEdit && (
          <div className="btns" style={{ marginTop: 12 }}>
            <button className="btn ghost sm" onClick={() => router.push("/farmer/create?edit=" + l.id)}>Edit</button>
            <button className="btn warn sm" onClick={() => setWithdraw(true)}>Withdraw</button>
            <span className="small muted" style={{ alignSelf: "center" }}>Possible until the first bid or offer.</span>
          </div>
        )}
      </div>

      {l.canRelist && <Relist l={l} onDone={reload} />}

      {b && (
        <div className="sec flush">
          <h4>Bids <small>{b.count} bid{b.count === 1 ? "" : "s"} from {b.bidders} dealer{b.bidders === 1 ? "" : "s"} · the highest wins automatically</small></h4>
          {b.top !== null && <div style={{ padding: "8px 16px 0" }}><span className="small muted">Highest bid</span><div className="num" style={{ font: "600 28px var(--display)", color: "var(--forest)" }}>{tk(b.top)} <span className="small muted" style={{ fontFamily: "var(--sans)" }}>/ kg · {tk0(b.top * l.quantityKg)} total</span></div></div>}
          {l.bids.length ? (
            <table className="ledger" style={{ marginTop: 8 }}>
              <thead><tr><th>Dealer</th><th className="right">Bid / kg</th><th className="right">Total</th><th>Placed</th></tr></thead>
              <tbody>{l.bids.map((x, i) => <tr key={x.id} className={i === 0 ? "top-row" : ""}><td><b>{x.who}</b></td><td className="right num">{tk(x.pricePerKg)}</td><td className="right num">{tk0(x.total)}</td><td className="small">{ago(x.at)}</td></tr>)}</tbody>
            </table>
          ) : <p className="muted" style={{ padding: "8px 16px 16px" }}>No bids yet. Dealers in your visibility area can see this listing.</p>}
        </div>
      )}

      {l.mode === "OWN" && (
        <div className="sec">
          <h4>Offers <small>{pending.length} waiting for you</small></h4>
          {pending.map((o) => <OfferRow key={o.id} o={o} onDone={reload} />)}
          {!pending.length && <p className="muted small" style={{ marginBottom: 8 }}>No open offers right now.</p>}
          {closed.length > 0 && <details><summary className="small muted" style={{ cursor: "pointer", marginBottom: 8 }}>Earlier offers ({closed.length})</summary>{closed.map((o) => <OfferRow key={o.id} o={o} onDone={reload} />)}</details>}
        </div>
      )}

      {myDeals.length > 0 && (
        <div className="sec">
          <h4>Deals <small>Primary deals from this listing</small></h4>
          {myDeals.map((d) => <DealCard key={d.id} d={d} side="farmer" onChange={reload} />)}
        </div>
      )}

      {withdraw && (
        <Modal title={`Withdraw ${l.code}?`} onClose={() => setWithdraw(false)} actions={<button className="btn warn" onClick={async () => { try { await api(`/listings/${l.id}/withdraw`, { method: "POST" }); toast("Listing withdrawn."); setWithdraw(false); reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); } }}>Withdraw</button>}>
          <p>Dealers will no longer see this listing. This cannot be undone, but you can create a new listing any time.</p>
        </Modal>
      )}
    </div>
  );
}

function Sales() {
  const params = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const sel = params.get("l");

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api<{ listings: Listing[] }>("/listings/mine"), api<{ deals: Deal[] }>("/deals")]);
    setListings(a.listings); setDeals(b.deals);
  }, []);
  useEffect(() => { load(); }, [load]);
  useListingLive(listings?.map((l) => l.id) ?? [], load);
  useLiveEvent("deal", load);

  if (!listings) return <p className="muted">Loading…</p>;
  const current = listings.find((l) => l.id === sel) ?? listings[0];
  const failed = (l: Listing) => deals.some((d) => d.listing.id === l.id && d.status === "FAILED" && !d.failure?.emergency);
  const groups: [string, Listing[]][] = [
    ["Needs your decision", listings.filter((l) => l.status === "NO_SALE" || failed(l))],
    ["Open", listings.filter((l) => l.status === "OPEN")],
    ["Sold", listings.filter((l) => l.status === "SOLD" && !failed(l))],
    ["Closed", listings.filter((l) => l.status === "WITHDRAWN" || l.status === "EXPIRED")],
  ];
  const waiting = (l: Listing) => l.offers.filter((o) => o.status === "PENDING").length;

  return (
    <>
      <div className="head"><div><h1>My Sales</h1><p>Your listings, bids, offers and deals.</p></div><span className="code">Screen F3</span></div>
      {listings.length === 0 ? (
        <Empty title="No listings yet"><p style={{ marginTop: 6 }}><Link href="/farmer/create">Create your first listing</Link></p></Empty>
      ) : (
        <div className="md">
          <div className="panel list">
            {groups.filter(([, xs]) => xs.length).map(([g, xs]) => (
              <div key={g}>
                <h5>{g} · {xs.length}</h5>
                {xs.map((l) => (
                  <button key={l.id} className={"item" + (l.id === current?.id ? " on" : "")} onClick={() => router.replace("/farmer/sales?l=" + l.id, { scroll: false })}>
                    <b><span className="nm" style={{ display: "flex", gap: 9, alignItems: "center" }}><ProductIcon name={l.product.name} />{l.product.name} · {kg(l.mode === "OWN" && l.status === "OPEN" ? l.remainingKg : l.quantityKg)}{l.mode === "OWN" && l.status === "OPEN" && l.remainingKg < l.quantityKg ? " left" : ""}</span>
                      {failed(l) ? <span className="tag red">Delivery failed</span> : l.emergency && l.status === "OPEN" ? <span className="tag red">Emergency</span> : waiting(l) > 0 ? <span className="tag gold">{waiting(l)} offer{waiting(l) > 1 ? "s" : ""}</span> : l.urgent && l.status === "OPEN" ? <span className="tag red">{l.daysLeft}d left</span> : <span className={"tag " + STATUS_TAG[l.status][0]}>{STATUS_TAG[l.status][1]}</span>}</b>
                    <span>{l.code} · {l.mode === "BID" ? (l.bidding?.top ? `highest ${tk(l.bidding.top)}` : "no bids yet") : `asking ${tk(l.pricePerKg)}`}{l.status === "OPEN" && l.bidding ? <> · <Countdown to={l.bidding.endsAt} prefix="ends in " /></> : null}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          {current && <Detail l={current} deals={deals} reload={load} />}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Sales /></Suspense>;
}
