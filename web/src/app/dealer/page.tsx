"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { tk, tk0, kg, Countdown } from "@/lib/format";
import type { Deal, Listing } from "@/lib/types";
import { useLiveEvent } from "@/lib/live";
import { Welcome } from "@/components/Welcome";
import { ProductIcon } from "@/components/ui";

interface MyBid { listingId: string; code: string; product: string; quantityKg: number; status: string; endsAt: string; top: number; myBest: number; leading: boolean }
interface MyOffer { id: string; status: string; counterPrice: number | null; expiresAt: string; listing: { id: string; product: string; farmer: string } }

export default function Page() {
  const [market, setMarket] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [mine, setMine] = useState<{ bids: MyBid[]; offers: MyOffer[] }>({ bids: [], offers: [] });
  const router = useRouter();
  const load = useCallback(async () => {
    const [m, d, o] = await Promise.all([api<{ listings: Listing[] }>("/market"), api<{ deals: Deal[] }>("/deals"), api<{ bids: MyBid[]; offers: MyOffer[] }>("/offers/mine")]);
    setMarket(m.listings); setDeals(d.deals); setMine(o);
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveEvent("notification", load);
  useLiveEvent("market", load);
  useLiveEvent("deal", load);

  const outbid = mine.bids.filter((b) => b.status === "OPEN" && !b.leading);
  const leading = mine.bids.filter((b) => b.status === "OPEN" && b.leading);
  const countered = mine.offers.filter((o) => o.status === "COUNTERED");
  const active = deals.filter((d) => d.status !== "COMPLETED" && d.status !== "CANCELLED");
  const spent = active.reduce((s, d) => s + d.total, 0);

  return (
    <>
      <Welcome code="D1" line="Buy fresh produce straight from farmers." />
      <div className="stats">
        <div><span>In the market</span><b className="num">{market.length}</b><small>{market.filter((l) => l.near && l.near.rank <= 1).length} in or next to your upazila</small></div>
        <div><span>Leading bids</span><b className="num">{leading.length}</b><small>{outbid.length} outbid</small></div>
        <div><span>Active deals</span><b className="num">{active.length}</b><small>{tk0(spent)} · {active.filter((d) => d.status === "AWAITING_TRANSPORT" && d.transport.offers.some((o) => o.status === "PENDING")).length} with transport offers to choose</small></div>
        <div><span>Counter-offers</span><b className="num">{countered.length}</b><small>{countered.length ? "answer before they expire" : "none waiting"}</small></div>
      </div>
      <div className="grid g-main">
        <div className="panel">
          <h3>Needs your attention</h3>
          {outbid.length + countered.length ? <table className="ledger"><tbody>
            {outbid.map((b) => <tr key={b.listingId}><td style={{ width: 90 }}><span className="tag red">Outbid</span></td><td><b>{b.product} · {kg(b.quantityKg)}</b> · highest {tk(b.top)}, yours {tk(b.myBest)}<br /><span className="small muted">Ends in <Countdown to={b.endsAt} /></span></td><td className="right"><Link className="btn ghost sm" href={"/dealer/market?l=" + b.listingId}>Bid again</Link></td></tr>)}
            {countered.map((o) => <tr key={o.id}><td><span className="tag blue">Counter</span></td><td><b>{o.listing.farmer}</b> asks {tk(o.counterPrice)}/kg for {o.listing.product}<br /><span className="small muted">Answer within <Countdown to={o.expiresAt} /></span></td><td className="right"><Link className="btn ghost sm" href={"/dealer/market?l=" + o.listing.id}>Answer</Link></td></tr>)}
          </tbody></table> : <p className="pb muted">All caught up.</p>}
        </div>
        <div className="panel">
          <h3>Nearest listings <Link className="small" href="/dealer/market">Marketplace</Link></h3>
          {market.length ? <table className="ledger"><tbody>{market.slice(0, 6).map((l) => (
            <tr key={l.id} className="click" onClick={() => router.push("/dealer/market?l=" + l.id)}>
              <td style={{ display: "flex", gap: 8, alignItems: "center" }}><ProductIcon name={l.product.name} /><div><b>{l.product.name} · {kg(l.mode === "OWN" ? l.remainingKg : l.quantityKg)}</b><br /><span className="small muted">{l.place.upazila} · {l.near?.label}</span></div></td>
              <td className="right small">{l.mode === "BID" ? tk(l.bidding?.top ?? l.pricePerKg) : tk(l.pricePerKg)}</td>
            </tr>))}</tbody></table> : <p className="pb muted">Nothing in your area right now.</p>}
        </div>
      </div>
    </>
  );
}
