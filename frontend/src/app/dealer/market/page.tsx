"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { tk0, dateShort, dateTime, ago, Countdown, useNow, STORAGE_LABEL, SCOPE_LABEL } from "@/lib/format";
import type { Listing, Offer } from "@/lib/types";
import { OFFER_TAG } from "@/lib/types";
import { useListingLive, useLiveEvent } from "@/lib/live";
import { Empty, FieldErr, Modal, ProductIcon, useToast } from "@/components/common/UI";
import { useSession } from "@/components/layout/Session";
import { qty, price as pr, per, UNIT_LABEL, UNIT_KG, toKg, toPerKg, fromKg, fromPerKg, fromPerKgUp } from "@/lib/units";

interface Options { products: { id: number; name: string; count: number }[]; districts: { id: number; name: string; count: number }[]; upazilas: { id: number; name: string; districtId: number; count: number }[] }

function tagFor(l: Listing, now: number): [string, string] {
  const b = l.bidding;
  if (l.emergency && !b?.leading && !b?.myBest) return ["red", "Emergency"];
  if (b?.leading) return ["green", "You lead"];
  if (b?.myBest) return ["red", "Outbid"];
  const mine = l.offers.find((o) => o.mine && (o.status === "PENDING" || o.status === "COUNTERED"));
  if (mine) return mine.status === "COUNTERED" ? ["blue", "Countered"] : ["gold", "Your offer"];
  if (l.urgent) return ["red", `${l.daysLeft}d left`];
  if (now - new Date(l.createdAt).getTime() < 86400000) return ["plain", "New"];
  return ["plain", l.mode === "BID" ? "Bidding" : "Own price"];
}

function BidBox({ l, onDone, blocked }: { l: Listing; onDone: () => void; blocked: string | null }) {
  const b = l.bidding!;
  const u = l.unit, U = UNIT_LABEL[u], minU = fromPerKgUp(b.nextMin, u);
  const toast = useToast();
  const [price, setPrice] = useState(String(minU));
  const [buy, setBuy] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPrice(String(minU)); }, [minU]);
  const now = useNow();
  const open = l.status === "OPEN" && new Date(b.endsAt).getTime() > now;

  async function bid() {
    setBusy(true);
    try { await api(`/market/${l.id}/bid`, { body: { pricePerKg: toPerKg(+price, u) } }); toast("Bid placed. You have the highest bid."); onDone(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); onDone(); } finally { setBusy(false); }
  }
  async function buyNow() {
    setBusy(true);
    try { const r = await api<{ deal: string }>(`/market/${l.id}/buy-now`, { method: "POST" }); setBuy(false); toast(`You bought the whole lot. Deal ${r.deal} created.`); onDone(); }
    catch (e) { setBuy(false); toast(e instanceof ApiError ? e.message : "Failed."); onDone(); } finally { setBusy(false); }
  }

  return (
    <div className="sec">
      <div className="grid g3" style={{ gap: 12, marginBottom: 12 }}>
        <div><span className="small muted">Highest bid</span><div className="num" style={{ font: "600 26px var(--display)", color: "var(--forest)" }}>{b.top !== null ? pr(b.top, u) : "—"}</div><span className="small muted">{b.count ? `${b.count} bid${b.count > 1 ? "s" : ""}` : `Base ${per(l.pricePerKg, u)}`}</span></div>
        <div><span className="small muted">Your bid</span><div className="num" style={{ font: "600 26px var(--display)" }}>{b.myBest !== null ? pr(b.myBest, u) : "—"}</div><span className="small">{b.leading ? <span className="tag green">You lead</span> : b.myBest ? <span className="tag red">Outbid</span> : "Bids are anonymous"}</span></div>
        {b.buyNowPrice && <div><span className="small muted">Buy Now</span><div className="num" style={{ font: "600 26px var(--display)", color: b.buyNowAvailable ? "var(--mustard)" : "var(--muted)" }}>{pr(b.buyNowPrice, u)}</div><span className="small muted">{b.buyNowAvailable ? "Whole lot · instant deal" : "Gone: bids reached it"}</span></div>}
      </div>
      {open ? (
        blocked ? <div className="note warn">{blocked}</div> : (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ margin: 0 }}><label htmlFor="bp">Your bid (৳/{U})</label><input id="bp" type="number" step={u === "KG" ? 0.5 : 1} min={minU} value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 150 }} /></div>
            <button className="btn" disabled={busy || b.leading || +price < minU} onClick={bid}>{b.leading ? "You lead" : "Place bid"}</button>
            {b.buyNowAvailable && <button className="btn gold" disabled={busy} onClick={() => setBuy(true)}>Buy Now at {per(b.buyNowPrice, u)}</button>}
            <span className="small muted">At least {per(toPerKg(minU, u), u)} · whole {qty(l.quantityKg, u)} = {tk0(toPerKg(+price || 0, u) * l.quantityKg)}</span>
          </div>
        )
      ) : <div className="note">Bidding is closed.</div>}
      {open && <p className="small muted" style={{ marginTop: 8 }}>Ends {dateTime(b.endsAt)} (<Countdown to={b.endsAt} prefix="in " done="ending now" />). The highest bid wins automatically.</p>}
      {buy && (
        <Modal title="Buy the whole lot now?" onClose={() => setBuy(false)} actions={<button className="btn gold" disabled={busy} onClick={buyNow}>Confirm Buy Now</button>}>
          <p>You buy <b>{qty(l.quantityKg, u)} of {l.product.name}</b> at <b>{per(b.buyNowPrice, u)}</b> = <b>{tk0((b.buyNowPrice ?? 0) * l.quantityKg)}</b>.</p>
          <p className="small muted" style={{ marginTop: 8 }}>The deal is created immediately without the farmer&apos;s approval. Bidding closes and other bidders are told. You pay for transport, chosen in the next step.</p>
        </Modal>
      )}
    </div>
  );
}

function OfferBox({ l, onDone, blocked }: { l: Listing; onDone: () => void; blocked: string | null }) {
  const toast = useToast();
  const mine: Offer | undefined = l.offers.find((o) => o.mine && (o.status === "PENDING" || o.status === "COUNTERED"));
  const minReply = l.own?.minResponseHours ?? 2;
  const u = l.unit, U = UNIT_LABEL[u]; // the dealer types in the farmer's unit
  const [f, setF] = useState({ q: String(fromKg(Math.min(l.remainingKg, Math.max(l.own?.minOrderKg ?? 0, u === "KG" ? 100 : UNIT_KG[u])), u)), p: String(fromPerKg(l.pricePerKg, u)), h: String(Math.max(minReply, 6)), note: "" });
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true); setFields({});
    try { await fn(); toast(msg); setEditing(false); onDone(); } catch (e) { if (e instanceof ApiError) { toast(e.message); setFields(e.fields); } } finally { setBusy(false); }
  };
  const body = { quantityKg: toKg(+f.q, u), pricePerKg: toPerKg(+f.p, u), replyHours: +f.h, note: f.note || undefined };

  const form = (
    <>
      <div className="row3">
        <div className="field"><label htmlFor="oq">Quantity ({U})</label><input id="oq" type="number" min={0} step={u === "KG" ? 1 : 0.01} max={fromKg(l.remainingKg, u)} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /><FieldErr e={fields.quantityKg} /><small>{qty(l.remainingKg, u)} left{l.own?.minOrderKg ? ` · minimum ${qty(l.own.minOrderKg, u)}` : ""}</small></div>
        <div className="field"><label htmlFor="op">Your price (৳/{U})</label><input id="op" type="number" step={u === "KG" ? 0.5 : 1} value={f.p} onChange={(e) => setF({ ...f, p: e.target.value })} /><small>Asking {per(l.pricePerKg, u)} · total {tk0((+f.q || 0) * (+f.p || 0))}</small></div>
        <div className="field"><label htmlFor="oh">Farmer must reply within</label><select id="oh" value={f.h} onChange={(e) => setF({ ...f, h: e.target.value })}>{[2, 6, 12, 24].map((h) => <option key={h} value={h} disabled={h < minReply}>{h} hours{h < minReply ? " (below farmer's minimum)" : ""}</option>)}</select><FieldErr e={fields.replyHours} /></div>
      </div>
      <div className="field"><label htmlFor="on">Note to the farmer <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input id="on" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Can pick up on harvest day" /></div>
    </>
  );

  if (l.status !== "OPEN") return <div className="sec"><div className="note">This listing is closed.</div></div>;
  if (blocked) return <div className="sec"><div className="note warn">{blocked}</div></div>;
  return (
    <div className="sec">
      <h4>{mine ? "Your offer" : "Make an offer"} <small>One active offer per listing · the farmer may counter once</small></h4>
      {mine && !editing && (
        <div className="offer">
          <div>
            <h5>{qty(mine.quantityKg, u)} at {per(mine.pricePerKg, u)} = {tk0(mine.total)} <span className={"tag " + OFFER_TAG[mine.status][0]} style={{ marginLeft: 6 }}>{OFFER_TAG[mine.status][1]}</span></h5>
            {mine.status === "COUNTERED" && <div className="note" style={{ marginTop: 8 }}><b>Farmer&apos;s counter-offer:</b> {qty(mine.counterQtyKg ?? mine.quantityKg, u)} at <b>{per(mine.counterPrice, u)}</b> = {tk0((mine.counterPrice ?? 0) * (mine.counterQtyKg ?? mine.quantityKg))}. Answer before your offer time ends.</div>}
            <div className="small muted" style={{ marginTop: 4 }}><Countdown to={mine.expiresAt} prefix="Expires in " done="Expired" /></div>
          </div>
          <div className="btns" style={{ justifyContent: "flex-end" }}>
            {mine.status === "PENDING" && <><button className="btn ghost sm" onClick={() => { setF({ q: String(fromKg(mine.quantityKg, u)), p: String(fromPerKg(mine.pricePerKg, u)), h: String(Math.max(minReply, 6)), note: mine.note ?? "" }); setEditing(true); }}>Edit</button>
              <button className="btn warn sm" disabled={busy} onClick={() => act(() => api(`/offers/${mine.id}/withdraw`, { method: "POST" }), "Offer withdrawn.")}>Withdraw</button></>}
            {mine.status === "COUNTERED" && <><button className="btn sm" disabled={busy} onClick={() => act(() => api(`/offers/${mine.id}/accept-counter`, { method: "POST" }), "Counter-offer accepted. Deal created.")}>Accept counter</button>
              <button className="btn warn sm" disabled={busy} onClick={() => act(() => api(`/offers/${mine.id}/reject-counter`, { method: "POST" }), "Counter-offer declined.")}>Decline</button></>}
          </div>
        </div>
      )}
      {(!mine || editing) && (
        <>
          {form}
          <div className="btns">
            {editing ? <><button className="btn" disabled={busy} onClick={() => act(() => api(`/offers/${mine!.id}`, { method: "PUT", body }), "Offer updated.")}>Save offer</button><button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button></>
              : <button className="btn" disabled={busy || !+f.q || !+f.p} onClick={() => act(() => api(`/offers/listing/${l.id}`, { body }), "Offer sent. The farmer is notified.")}>Send offer</button>}
          </div>
        </>
      )}
    </div>
  );
}

function Detail({ l, reload, blocked }: { l: Listing; reload: () => void; blocked: string | null }) {
  return (
    <div className="panel">
      <div className="dhead">
        <div className="ttl"><ProductIcon name={l.product.name} size={44} /><div><h2>{l.product.name} · {qty(l.mode === "OWN" ? l.remainingKg : l.quantityKg, l.unit)}{l.mode === "OWN" && l.remainingKg < l.quantityKg ? " left" : ""}</h2><p className="muted">{l.code} · {l.farmer.name} · {l.place.upazila}, {l.place.district}</p></div></div>
        <div style={{ textAlign: "right" }}>
          <span className="tag plain">{l.near?.label}</span>
          {l.urgent && <div style={{ marginTop: 6 }}><span className="tag red">{l.daysLeft} day{l.daysLeft === 1 ? "" : "s"} of shelf life left</span></div>}
        </div>
      </div>
      {l.photos.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <div className="sec"><div className="photos">{l.photos.map((p) => <img key={p} src={p} alt={l.product.name} style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)" }} />)}</div></div>
      )}
      {l.emergency && <div className="sec"><div className="note warn"><b>Emergency sale.</b> A vehicle carrying this produce is stuck{l.emergency.locationNote ? ` (${l.emergency.locationNote})` : ""} in {l.place.upazila}. {l.emergency.canMove ? "If you win, the same vehicle brings it to you." : "If you win, you choose a local transporter to collect it from the vehicle."} Sold at a lower price so it does not go to waste.</div></div>}
      <div className="sec">
        <dl className="kv">
          <dt>Selling</dt><dd>{l.mode === "BID" ? "Open bidding, whole lot" : `Farmer's price ${per(l.pricePerKg, l.unit)} · offers with your quantity`}</dd>
          <dt>Pickup</dt><dd>{l.place.upazila}, {l.place.district} <span className="muted">({l.near?.label})</span></dd>
          <dt>Harvest</dt><dd>{dateShort(l.harvestDate)} {l.harvested ? `· ${l.daysLeft} day(s) of shelf life left` : `· keeps about ${l.product.shelfLifeDays} days after harvest`}</dd>
          <dt>Vehicle needed</dt><dd>{STORAGE_LABEL[l.product.storage]}{l.product.farmerSet ? " (farmer asked for this)" : ""} <span className="muted">· you pay for transport</span></dd>
          <dt>Visible to</dt><dd>{l.emergency ? `${l.emergency.tierLabel} (step ${l.emergency.tier} of 3)` : SCOPE_LABEL[l.scope]}</dd>
          {l.description && <><dt>Description</dt><dd>{l.description}</dd></>}
        </dl>
      </div>
      {l.mode === "BID" ? <BidBox l={l} onDone={reload} blocked={blocked} /> : <OfferBox l={l} onDone={reload} blocked={blocked} />}
      {l.mode === "BID" && l.bids.length > 0 && (
        <div className="sec flush">
          <h4>Bids <small>Bidders are anonymous to each other</small></h4>
          <table className="ledger"><thead><tr><th>Bidder</th><th className="right">Bid / kg</th><th>Placed</th></tr></thead>
            <tbody>{l.bids.slice(0, 10).map((x, i) => <tr key={x.id} className={i === 0 ? "top-row" : ""}><td><b>{x.who}</b></td><td className="right num">{per(x.pricePerKg, l.unit)}</td><td className="small">{ago(x.at)}</td></tr>)}</tbody></table>
        </div>
      )}
    </div>
  );
}

function Market() {
  const { user } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [opts, setOpts] = useState<Options>({ products: [], districts: [], upazilas: [] });
  const [detail, setDetail] = useState<Listing | null>(null);
  const [f, setF] = useState({ productId: "", districtId: "", upazilaId: "", mode: "", harvest: "", sort: "near" });
  const sel = params.get("l");
  const now = useNow(60_000);

  const load = useCallback(async () => {
    const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
    const r = await api<{ listings: Listing[]; options: Options }>("/market?" + q);
    setListings(r.listings); setOpts(r.options);
  }, [f]);
  const loadDetail = useCallback(async () => {
    const id = sel ?? listings?.[0]?.id;
    if (!id) { setDetail(null); return; }
    try { setDetail((await api<{ listing: Listing }>("/listings/" + id)).listing); } catch { setDetail(null); }
  }, [sel, listings]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDetail(); }, [loadDetail]);
  useLiveEvent("market", load);
  useListingLive(detail ? [detail.id] : [], () => { loadDetail(); load(); });

  const blocked = user?.status === "ACTIVE" ? null : user?.status === "PENDING" ? "Your account is waiting for admin verification. You can look, but not bid or make offers yet." : "Your account cannot start new deals right now.";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, [k]: e.target.value, ...(k === "districtId" ? { upazilaId: "" } : {}) });
  const ups = f.districtId ? opts.upazilas.filter((u) => u.districtId === +f.districtId) : [];

  return (
    <>
      <div className="head"><div><h1>Marketplace</h1><p>Produce you can buy: listings in your area, listings that target your area, and nationwide listings.</p></div><span className="code">Screen D2</span></div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="pb" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, alignItems: "end" }}>
          <div className="field" style={{ margin: 0 }}><label htmlFor="fp">Product</label><select id="fp" value={f.productId} onChange={set("productId")}><option value="">All products</option>{opts.products.map((p) => <option key={p.id} value={p.id}>{`${p.name} (${p.count})`}</option>)}</select></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="fd">Farmer&apos;s district</label><select id="fd" value={f.districtId} onChange={set("districtId")}><option value="">All districts</option>{opts.districts.map((d) => <option key={d.id} value={d.id}>{`${d.name} (${d.count})`}</option>)}</select></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="fu">Farmer&apos;s upazila</label><select id="fu" value={f.upazilaId} onChange={set("upazilaId")} disabled={!f.districtId}><option value="">{f.districtId ? "All upazilas" : "Choose a district first"}</option>{ups.map((u) => <option key={u.id} value={u.id}>{`${u.name} (${u.count})`}</option>)}</select></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="fm">Selling mode</label><select id="fm" value={f.mode} onChange={set("mode")}><option value="">Any</option><option value="BID">Bidding</option><option value="OWN">Own price</option></select></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="fh">Harvest</label><select id="fh" value={f.harvest} onChange={set("harvest")}><option value="">Any time</option><option value="done">Already harvested</option><option value="soon">Harvest coming</option></select></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="fs">Sort</label><select id="fs" value={f.sort} onChange={set("sort")}><option value="near">Nearest first</option><option value="new">Newest first</option><option value="ending">Ending soon</option></select></div>
        </div>
      </div>
      {!listings ? <p className="muted">Loading…</p> : listings.length === 0 ? (
        <Empty title="No listings match">Try fewer filters. New listings appear here live.</Empty>
      ) : (
        <div className="md">
          <div className="panel list">
            <h5>{listings.length} listing{listings.length > 1 ? "s" : ""}</h5>
            {listings.map((l) => {
              const t = tagFor(l, now);
              return (
                <button key={l.id} className={"item" + (detail?.id === l.id ? " on" : "")} onClick={() => router.replace("/dealer/market?l=" + l.id, { scroll: false })}>
                  <b><span className="nm" style={{ display: "flex", gap: 9, alignItems: "center" }}><ProductIcon name={l.product.name} />{l.product.name} · {qty(l.mode === "OWN" ? l.remainingKg : l.quantityKg, l.unit)}</span><span className={"tag " + t[0]}>{t[1]}</span></b>
                  <span>{l.farmer.name} · {l.mode === "BID" ? `bidding · ${l.bidding?.top ? per(l.bidding.top, l.unit) + " highest" : "from " + per(l.pricePerKg, l.unit)}` : `own price · ${per(l.pricePerKg, l.unit)}`} · {l.place.upazila} ({l.near?.label})</span>
                </button>
              );
            })}
          </div>
          {detail ? <Detail l={detail} reload={() => { loadDetail(); load(); }} blocked={blocked} /> : <div />}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Market /></Suspense>;
}
