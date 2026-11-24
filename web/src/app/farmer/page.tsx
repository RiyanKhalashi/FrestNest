"use client";
import { Icon } from "@/components/Icon";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { tk0, Countdown } from "@/lib/format";
import { qty, per } from "@/lib/units";
import type { Deal, Listing } from "@/lib/types";
import { useLiveEvent } from "@/lib/live";
import { Welcome } from "@/components/Welcome";
import { ProductIcon } from "@/components/ui";

export default function Page() {
  const [ls, setLs] = useState<Listing[] | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const router = useRouter();
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api<{ listings: Listing[] }>("/listings/mine"), api<{ deals: Deal[] }>("/deals")]);
    setLs(a.listings); setDeals(b.deals);
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveEvent("notification", load);
  useLiveEvent("deal", load);

  const open = ls?.filter((l) => l.status === "OPEN") ?? [];
  const offers = open.flatMap((l) => l.offers.filter((o) => o.status === "PENDING").map((o) => ({ l, o })));
  const noSale = ls?.filter((l) => l.canRelist) ?? [];
  const urgent = open.filter((l) => l.urgent);
  const active = deals.filter((d) => d.status !== "COMPLETED" && d.status !== "CANCELLED");
  const month = deals.filter((d) => d.status !== "CANCELLED" && new Date(d.at).getMonth() === new Date().getMonth()).reduce((s, d) => s + d.total, 0);

  const todo: { tag: [string, string]; text: React.ReactNode; href: string; btn: string }[] = [
    ...deals.filter((d) => d.status === "FAILED" && !d.failure?.emergency).map((d) => ({ tag: ["red", "Delivery failed"] as [string, string], text: <><b>{d.listing.product} {d.code}</b>: the vehicle is stuck in {d.failure?.where}<br /><span className="muted small">Set up the emergency sale so {d.failure?.usableKg} kg does not go to waste</span></>, href: "/farmer/sales?l=" + d.listing.id, btn: "Set up sale" })),
    ...offers.map(({ l, o }) => ({ tag: ["gold", "Offer"] as [string, string], text: <><b>{o.dealer.name}</b> offers {qty(o.quantityKg, l.unit)} of {l.product.name} at {per(o.pricePerKg, l.unit)}<br /><span className="muted small"><Countdown to={o.expiresAt} prefix="Reply within " done="Reply time is over" /></span></>, href: "/farmer/sales?l=" + l.id, btn: "Answer" })),
    ...noSale.map((l) => ({ tag: ["gold", "No bids"] as [string, string], text: <><b>{l.product.name} {l.code}</b> got no bids<br /><span className="muted small">Relist once with more time, a lower price or your own price</span></>, href: "/farmer/sales?l=" + l.id, btn: "Relist" })),
    ...urgent.map((l) => ({ tag: ["red", "Shelf life"] as [string, string], text: <><b>{l.product.name} {l.code}</b> has {l.daysLeft} day(s) left<br /><span className="muted small">Consider a lower price or a smaller area next time</span></>, href: "/farmer/sales?l=" + l.id, btn: "Open" })),
  ];

  return (
    <>
      <Welcome code="F1" line="Your listings, deals and deliveries in one place." />
      <div className="stats">
        <div><i className="si"><Icon name="leaf" /></i><span>Open listings</span><b className="num">{open.length}</b><small>{open.filter((l) => l.mode === "BID").length} bidding · {open.filter((l) => l.mode === "OWN").length} own price</small></div>
        <div><i className="si"><Icon name="bell" /></i><span>Offers waiting</span><b className="num">{offers.length}</b><small>{offers.length ? "answer before they expire" : "nothing to answer"}</small></div>
        <div><i className="si"><Icon name="truck" /></i><span>Active deals</span><b className="num">{active.length}</b><small>{active.filter((d) => d.status === "AWAITING_TRANSPORT").length} waiting for transport · {active.filter((d) => d.pickupCode).length} pickup code ready</small></div>
        <div><i className="si"><Icon name="chart" /></i><span>Sold this month</span><b className="num">{tk0(month)}</b><small>{deals.filter((d) => d.status !== "CANCELLED").length} deals in total</small></div>
      </div>
      <div className="grid g-main">
        <div className="panel">
          <h3>Needs your attention <Link className="small" href="/farmer/create">+ New listing</Link></h3>
          {todo.length ? <table className="ledger"><tbody>{todo.map((t, i) => <tr key={i}><td style={{ width: 90 }}><span className={"tag " + t.tag[0]}>{t.tag[1]}</span></td><td>{t.text}</td><td className="right"><Link className="btn ghost sm" href={t.href}>{t.btn}</Link></td></tr>)}</tbody></table>
            : <p className="pb muted">All caught up. {ls && !ls.length ? <Link href="/farmer/create">Create your first listing.</Link> : null}</p>}
        </div>
        <div className="panel">
          <h3>Live now</h3>
          {open.length ? <table className="ledger"><tbody>{open.slice(0, 6).map((l) => (
            <tr key={l.id} className="click" onClick={() => router.push("/farmer/sales?l=" + l.id)}>
              <td style={{ display: "flex", gap: 8, alignItems: "center" }}><ProductIcon name={l.product.name} /><div><b>{l.product.name}</b><br /><span className="small muted">{l.mode === "BID" ? (l.bidding?.top ? `highest ${per(l.bidding.top, l.unit)}` : "no bids yet") : `${qty(l.remainingKg, l.unit)} left`}</span></div></td>
              <td className="right small">{l.bidding ? <Countdown to={l.bidding.endsAt} /> : null}</td>
            </tr>))}</tbody></table> : <p className="pb muted">No open listings.</p>}
        </div>
      </div>
    </>
  );
}
