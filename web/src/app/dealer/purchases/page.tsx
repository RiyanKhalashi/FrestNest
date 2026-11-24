"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { dateShort, Countdown } from "@/lib/format";
import { qty, per, type Unit } from "@/lib/units";
import type { Deal, OfferStatus } from "@/lib/types";
import { OFFER_TAG } from "@/lib/types";
import { useLiveEvent } from "@/lib/live";
import { DealCard } from "@/components/DealCard";
import { Empty } from "@/components/ui";

interface MyOffer { id: string; status: OfferStatus; quantityKg: number; pricePerKg: number; counterQtyKg: number | null; counterPrice: number | null; expiresAt: string; at: string; listing: { id: string; code: string; product: string; farmer: string; place: string; unit: Unit } }
interface MyBid { listingId: string; code: string; product: string; quantityKg: number; unit: Unit; farmer: string; place: string; status: string; endsAt: string; top: number; myBest: number; leading: boolean }

export default function Page() {
  const [tab, setTab] = useState<"deals" | "bids" | "offers">("deals");
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [mine, setMine] = useState<{ offers: MyOffer[]; bids: MyBid[] }>({ offers: [], bids: [] });
  const load = useCallback(async () => {
    const [d, m] = await Promise.all([api<{ deals: Deal[] }>("/deals"), api<{ offers: MyOffer[]; bids: MyBid[] }>("/offers/mine")]);
    setDeals(d.deals); setMine(m);
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveEvent("notification", load);
  useLiveEvent("deal", load);

  const live = deals?.filter((d) => d.status !== "COMPLETED" && d.status !== "CANCELLED") ?? [];
  const openBids = mine.bids.filter((b) => b.status === "OPEN");
  const activeOffers = mine.offers.filter((o) => o.status === "PENDING" || o.status === "COUNTERED");

  return (
    <>
      <div className="head"><div><h1>My Purchases</h1><p>Your deals, bids and offers.</p></div><span className="code">Screen D3</span></div>
      <div className="tabbar" role="tablist">
        {([["deals", `Deals (${live.length} active)`], ["bids", `Bids (${openBids.length} open)`], ["offers", `Offers (${activeOffers.length} active)`]] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={tab === k ? "on" : ""}>{label}</button>
        ))}
      </div>
      {!deals ? <p className="muted">Loading…</p> : tab === "deals" ? (
        deals.length ? <div>{deals.map((d) => <DealCard key={d.id} d={d} side="dealer" onChange={load} />)}</div>
          : <Empty title="No deals yet"><p style={{ marginTop: 6 }}>Win a bid, use Buy Now or get an offer accepted in the <Link href="/dealer/market">Marketplace</Link>.</p></Empty>
      ) : tab === "bids" ? (
        mine.bids.length ? (
          <div className="panel"><table className="ledger">
            <thead><tr><th>Listing</th><th>Farmer</th><th className="right">Highest</th><th className="right">Your bid</th><th>Status</th><th>Ends</th><th /></tr></thead>
            <tbody>{mine.bids.map((b) => (
              <tr key={b.listingId}>
                <td><b>{b.product} · {qty(b.quantityKg, b.unit)}</b><br /><span className="small muted">{b.code}</span></td>
                <td>{b.farmer}<br /><span className="small muted">{b.place}</span></td>
                <td className="right num">{per(b.top, b.unit)}</td><td className="right num">{per(b.myBest, b.unit)}</td>
                <td>{b.status === "OPEN" ? (b.leading ? <span className="tag green">You lead</span> : <span className="tag red">Outbid</span>) : b.leading ? <span className="tag blue">Won</span> : <span className="tag plain">Closed</span>}</td>
                <td className="small">{b.status === "OPEN" ? <Countdown to={b.endsAt} /> : dateShort(b.endsAt)}</td>
                <td className="right">{b.status === "OPEN" && <Link className="btn ghost sm" href={"/dealer/market?l=" + b.listingId}>{b.leading ? "View" : "Bid again"}</Link>}</td>
              </tr>
            ))}</tbody></table></div>
        ) : <Empty title="No bids yet" />
      ) : (
        mine.offers.length ? (
          <div className="panel"><table className="ledger">
            <thead><tr><th>Listing</th><th>Farmer</th><th className="right">Your offer</th><th>Status</th><th>Expires</th><th /></tr></thead>
            <tbody>{mine.offers.map((o) => (
              <tr key={o.id}>
                <td><b>{o.listing.product}</b><br /><span className="small muted">{o.listing.code}</span></td>
                <td>{o.listing.farmer}<br /><span className="small muted">{o.listing.place}</span></td>
                <td className="right num">{qty(o.quantityKg, o.listing.unit)} × {per(o.pricePerKg, o.listing.unit)}{o.status === "COUNTERED" && <div className="small">Counter: {per(o.counterPrice, o.listing.unit)}</div>}</td>
                <td><span className={"tag " + OFFER_TAG[o.status][0]}>{OFFER_TAG[o.status][1]}</span></td>
                <td className="small">{o.status === "PENDING" || o.status === "COUNTERED" ? <Countdown to={o.expiresAt} /> : "—"}</td>
                <td className="right">{(o.status === "PENDING" || o.status === "COUNTERED") && <Link className="btn ghost sm" href={"/dealer/market?l=" + o.listing.id}>{o.status === "COUNTERED" ? "Answer" : "View"}</Link>}</td>
              </tr>
            ))}</tbody></table></div>
        ) : <Empty title="No offers yet" />
      )}
    </>
  );
}
