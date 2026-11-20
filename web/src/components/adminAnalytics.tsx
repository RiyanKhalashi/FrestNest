"use client";
// Admin analytics pieces shared by the Analytics page (A8) and the Business page (simple admin mode).
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { tk0, kg } from "@/lib/format";
import { HBars, VStack, Lines, Heat, HStack, MiniLine, Legend, PRODUCT_COLOR, SLOT } from "@/components/charts";

interface Market {
  filters: { districts: { id: number; name: string; upazilas: { id: number; name: string }[] }[]; products: { id: number; name: string }[] };
  kpis: { tonnes: number; value: number; farmers: number; price: number | null; savedKg: number; optedIn: number };
  products: string[]; heat: { id: number; name: string; values: number[] }[]; heatBy: string;
  top: { id: number; name: string; tonnes: number; price: number | null }[];
  weeks: string[]; price: { id: number; name: string; values: (number | null)[] }[];
  farmers: { name: string; place: string; kg: number; deals: number; avgPrice: number; consent: boolean; crops: string[] }[];
  supply: { id: number; name: string; tonnes: number }[];
  flows: { from: string; district: string; to: string; tonnes: number; local: boolean }[];
  seasonality: { months: string[]; rows: { name: string; values: number[] }[] };
  savedByMonth: { month: string; kg: number }[];
  insights: { product: string; where: string; tonnes: number; change: number | null; target: string }[];
}
interface Platform {
  kpis: { deals: number; bidShare: number; users: number; onTime: number | null; cancelRate: number };
  weeks: string[]; dealsBySource: { name: string; values: number[] }[]; valueByWeek: number[];
  months: string[]; signups: { name: string; values: number[] }[];
  outcome: { name: string; values: number[] }[]; failReasons: { name: string; value: number }[];
  verification: { name: string; values: number[] }[]; reportsBy: { name: string; values: number[] }[];
  hours: number[]; cancellations: { name: string; values: number[] }[]; workload: { name: string; values: number[] }[];
}
interface Companies { fee: number; companies: { id: string; name: string; sells: string; upazilas: string[]; trial: boolean; trialUntil: string | null; monthly: number; active: boolean }[] }

export function MarketTab({ showCompanies = true }: { showCompanies?: boolean }) {
  const [f, setF] = useState({ months: "3", districtId: "", upazilaId: "", productId: "" });
  const [d, setD] = useState<Market | null>(null);
  const [sel, setSel] = useState<string[] | null>(null);
  const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const load = useCallback(async () => setD(await api<Market>("/admin/analytics/market?" + q)), [q]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <p className="muted">Loading…</p>;
  const district = d.filters.districts.find((x) => String(x.id) === f.districtId);
  const area = f.upazilaId ? district?.upazilas.find((u) => String(u.id) === f.upazilaId)?.name + " upazila" : district ? district.name + " district" : "all districts";
  const product = d.filters.products.find((p) => String(p.id) === f.productId)?.name;
  // price lines: ≤ 3 products (series cap); default = the top 3 by tonnes, or the filtered product
  const chosen = sel ?? (product ? [product] : d.top.slice(0, 3).map((p) => p.name));
  const togglePrice = (n: string) => setSel(chosen.includes(n) ? chosen.filter((x) => x !== n) : chosen.length >= 3 ? [...chosen.slice(1), n] : [...chosen, n]);
  const savedTotal = d.savedByMonth.reduce((s, m) => s + m.kg, 0);
  const drill = (name: string) => {
    if (d.heatBy === "District") { const x = d.filters.districts.find((y) => y.name === name); if (x) setF({ ...f, districtId: String(x.id), upazilaId: "" }); }
    else { const u = district?.upazilas.find((y) => y.name === name); if (u) setF({ ...f, upazilaId: String(u.id) }); }
  };
  return (
    <>
      <div className="panel" style={{ marginBottom: 16 }}><div className="pb filters">
        <div className="field" style={{ margin: 0 }}><label htmlFor="fm">Period</label><select id="fm" value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })}><option value="1">Last 30 days</option><option value="3">Last 3 months</option><option value="12">Last 12 months</option></select></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="fd">District</label><select id="fd" value={f.districtId} onChange={(e) => setF({ ...f, districtId: e.target.value, upazilaId: "" })}><option value="">All districts</option>{d.filters.districts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="fu">Upazila</label><select id="fu" value={f.upazilaId} disabled={!district} onChange={(e) => setF({ ...f, upazilaId: e.target.value })}><option value="">{district ? "All upazilas" : "Choose a district"}</option>{district?.upazilas.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="fp">Product</label><select id="fp" value={f.productId} onChange={(e) => { setF({ ...f, productId: e.target.value }); setSel(null); }}><option value="">All products</option>{d.filters.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="btns"><button className="btn ghost sm" onClick={() => { setF({ months: "3", districtId: "", upazilaId: "", productId: "" }); setSel(null); }}>Reset</button><a className="btn slate sm" href={"/api/admin/analytics/market.csv?" + q}>Company report (CSV)</a></div>
      </div></div>

      <div className="stats" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div><span>Sold</span><b className="num">{d.kpis.tonnes.toLocaleString("en-IN")} t</b><small>{product ?? "all products"} · {area}</small></div>
        <div><span>Trade value</span><b className="num">৳{(d.kpis.value / 1e7).toFixed(2)} cr</b><small>deal value, before transport</small></div>
        <div><span>Farmers selling</span><b className="num">{d.kpis.farmers}</b><small>{d.kpis.optedIn} opted in to agri partner offers</small></div>
        <div><span>Price now</span><b className="num">{d.kpis.price ? "৳" + d.kpis.price : "—"}</b><small>{product ? "per kg, average of the period" : "choose a product to see price"}</small></div>
        <div><span>Saved by emergency sales</span><b className="num">{kg(d.kpis.savedKg)}</b><small>in this period, {area}</small></div>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="panel"><h3>Where each product sells <small>tonnes · {area}</small></h3><div className="pb"><p className="small muted" style={{ marginBottom: 8 }}>Darker = more. Click a {d.heatBy.toLowerCase()} to zoom in.</p>
          <Heat rowsLabel={d.heatBy} cols={d.products} rows={d.heat} onRow={drill} label="Tonnes sold by area and product" /></div></div>
        <div className="panel"><h3>Top products <small>{area}</small></h3><div className="pb">
          <HBars label="Top products by tonnes" unit=" t" rows={d.top.map((p) => ({ name: p.name, value: p.tonnes, color: PRODUCT_COLOR[p.name], note: p.price ? `Average ৳${p.price}/kg` : undefined }))} onPick={(n) => { const p = d.filters.products.find((x) => x.name === n); if (p) { setF({ ...f, productId: String(p.id) }); setSel(null); } }} />
          <p className="small muted" style={{ marginTop: 8 }}>Click a product to filter.</p></div></div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Price ups and downs <small>average deal price, ৳ per kg, by week · up to 3 products</small></h3>
        <div className="pb">
          <div className="chips" style={{ marginBottom: 10 }}>{d.products.map((n) => <label key={n}><input type="checkbox" checked={chosen.includes(n)} onChange={() => togglePrice(n)} /><i style={{ background: PRODUCT_COLOR[n] }} />{n}</label>)}</div>
          <Lines label="Weekly average price" unit="৳" labels={d.weeks} series={d.price.filter((p) => chosen.includes(p.name)).map((p) => ({ name: p.name, color: PRODUCT_COLOR[p.name], values: p.values }))} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Farmers by quantity sold <small>{area}{product ? " · " + product : ""}</small></h3>
        <table className="ledger">
          <thead><tr><th>#</th><th>Farmer</th><th>Crops</th><th className="right">Sold</th><th className="right">Deals</th><th className="right">Avg ৳/kg</th><th>Shown to companies</th></tr></thead>
          <tbody>{d.farmers.map((x, i) => (
            <tr key={x.name + i}><td className="muted">{i + 1}</td><td><b>{x.name}</b><br /><span className="small muted">{x.place}</span></td>
              <td>{x.crops.map((c) => <i key={c} title={c} style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, marginRight: 4, background: PRODUCT_COLOR[c] }} />)}<span className="small muted">{x.crops.join(", ")}</span></td>
              <td className="right num" style={{ whiteSpace: "nowrap" }}><span className="minibar" style={{ width: Math.round(60 * x.kg / d.farmers[0].kg) }} />{kg(x.kg)}</td><td className="right num">{x.deals}</td><td className="right num">{x.avgPrice}</td>
              <td>{x.consent ? <span className="tag green">Name (opted in)</span> : <span className="tag plain">Totals only</span>}</td></tr>
          ))}</tbody>
        </table>
        <p className="small muted" style={{ padding: "10px 16px" }}>Companies see farmer names only for farmers who turned on &quot;Agri partner offers&quot;. Everyone else appears only inside upazila totals.</p>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="panel"><h3>Coming supply <small>open listings harvesting in the next 30 days · tonnes</small></h3><div className="pb">
          {d.supply.some((s) => s.tonnes > 0) ? <HBars label="Coming supply" unit=" t" rows={d.supply.filter((s) => s.tonnes > 0).map((s) => ({ name: s.name, value: s.tonnes, color: PRODUCT_COLOR[s.name] }))} /> : <p className="small muted">No open listings with a harvest date in the next 30 days.</p>}</div></div>
        <div className="panel"><h3>Where the produce goes <small>pickup upazila → buyer&apos;s district</small></h3>
          <table className="ledger"><thead><tr><th>From (upazila)</th><th>To</th><th className="right">Tonnes</th></tr></thead>
            <tbody>{d.flows.map((x) => <tr key={x.from + x.to}><td><b>{x.from}</b> <span className="muted small">{x.district}</span></td><td>{x.to}{x.local && <span className="muted small"> (local)</span>}</td><td className="right num" style={{ whiteSpace: "nowrap" }}><span className="minibar" style={{ width: Math.round(60 * x.tonnes / (d.flows[0]?.tonnes || 1)) }} />{x.tonnes}</td></tr>)}</tbody></table></div>
      </div>

      <div style={{ marginBottom: 16 }}><div className="panel"><h3>Seasonality <small>tonnes by month, last 12 months · {area}</small></h3><div className="pb"><Heat rowsLabel="Product" cols={d.seasonality.months} rows={d.seasonality.rows} label="Tonnes by product and month" /></div></div></div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="panel"><h3>Produce saved by emergency sales <small>kg per month</small></h3><div className="pb">
          <div style={{ display: "flex", gap: 24, alignItems: "flex-end", marginBottom: 10 }}><div><div className="hero-num">{kg(d.savedByMonth[11].kg)}</div><span className="small muted">this month · food that would otherwise have rotted on the road</span></div><div><div className="hero-num" style={{ fontSize: 26 }}>{kg(savedTotal)}</div><span className="small muted">last 12 months</span></div></div>
          <VStack label="Produce saved per month" labels={d.savedByMonth.map((m) => m.month)} series={[{ name: "Saved (kg)", values: d.savedByMonth.map((m) => m.kg) }]} colors={["#2a78d6"]} every={1} H={170} fmtV={(n) => Math.round(n).toLocaleString("en-IN")} /></div></div>
        <div className="panel"><h3>What this means for companies</h3><div className="pb">
          {d.insights.map((x) => <div key={x.product} className="insight"><b>{x.product}:</b> {x.where} sells the most, {x.tonnes} t.{x.change !== null && <> Price {x.change < 0 ? `fell ${-x.change}` : `rose ${x.change}`}% in 12 weeks.</>} <span className="muted">Target here: {x.target}.</span></div>)}
          <p className="small muted" style={{ marginTop: 10 }}>Companies receive upazila totals and prices. Farmer names only for farmers who allowed it.</p></div></div>
      </div>

      {showCompanies && <CompaniesPanel />}
    </>
  );
}

export function PlatformTab() {
  const [d, setD] = useState<Platform | null>(null);
  useEffect(() => { api<Platform>("/admin/analytics/platform").then(setD); }, []);
  if (!d) return <p className="muted">Loading…</p>;
  const outS = ["On time", "Late", "Failed → same vehicle", "Failed → local pickup"];
  const repS = ["Warned", "Suspended / banned", "Dismissed", "Still open"];
  const admS = ["Verification", "Delivery failures", "Cancel requests", "Reports & reviews"];
  const hourLabels = d.hours.map((_, i) => (i === 0 ? "12a" : i < 12 ? i + "a" : i === 12 ? "12p" : i - 12 + "p"));
  return (
    <>
      <div className="stats" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div><span>Deals completed</span><b className="num">{d.kpis.deals.toLocaleString("en-IN")}</b><small>last 12 weeks · {d.kpis.bidShare}% through bidding</small></div>
        <div><span>Active users</span><b className="num">{d.kpis.users.toLocaleString("en-IN")}</b><small>farmers, dealers, transporters</small></div>
        <div><span>Delivered on time</span><b className="num">{d.kpis.onTime ?? "—"}%</b><small>last 3 months</small></div>
        <div><span>Deals cancelled</span><b className="num">{d.kpis.cancelRate}%</b><small>last 30 days, all roles</small></div>
        <div><span>Failure reasons logged</span><b className="num">{d.failReasons.reduce((s, x) => s + x.value, 0)}</b><small>approved, last 3 months</small></div>
      </div>
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="panel"><h3>Deals per week <small>by how they were made</small></h3><div className="pb"><Legend items={d.dealsBySource.map((s, i) => ({ name: s.name, color: SLOT[i] }))} /><VStack label="Deals per week" labels={d.weeks} series={d.dealsBySource} fmtV={(n) => String(Math.round(n))} /></div></div>
        <div className="panel"><h3>Trade value per week <small>৳ lakh, before transport</small></h3><div className="pb"><VStack label="Trade value per week" labels={d.weeks} series={[{ name: "Trade value (৳ lakh)", values: d.valueByWeek }]} colors={["#3c6a80"]} fmtV={(n) => "৳" + n.toFixed(n >= 100 ? 0 : 1) + "L"} /></div></div>
      </div>
      <div className="panel" style={{ marginBottom: 16 }}><h3>New sign-ups per month <small>each role on its own scale</small></h3><div className="pb"><div className="grid g3">
        {d.signups.map((s, i) => <MiniLine key={s.name} name={s.name} labels={d.months} values={s.values} color={[SLOT[2], SLOT[0], SLOT[1]][i]} unit={s.name.toLowerCase()} />)}</div></div></div>
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="panel"><h3>Delivery outcome by vehicle <small>share of trips, last 3 months</small></h3><div className="pb"><Legend items={outS.map((n, i) => ({ name: n, color: ["#1baf7a", "#eda100", "#2a78d6", "#8a8a84"][i] }))} /><HStack label="Delivery outcome by vehicle facility" rows={d.outcome} series={outS} colors={["#1baf7a", "#eda100", "#2a78d6", "#8a8a84"]} pct /></div></div>
        <div className="panel"><h3>Why deliveries failed <small>approved reports, last 3 months</small></h3><div className="pb">{d.failReasons.length ? <HBars label="Failure reasons" rows={d.failReasons.map((x) => ({ name: x.name, value: x.value, color: "#eb6834" }))} /> : <p className="small muted">No approved failures.</p>}</div></div>
      </div>
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="panel"><h3>Verification decisions per week</h3><div className="pb"><Legend items={d.verification.map((s, i) => ({ name: s.name, color: ["#1baf7a", "#eda100", "#eb6834"][i] }))} /><VStack label="Verification decisions" labels={d.weeks} series={d.verification} colors={["#1baf7a", "#eda100", "#eb6834"]} fmtV={(n) => String(Math.round(n))} /></div></div>
        <div className="panel"><h3>Reports by type <small>and what admins decided · last 3 months</small></h3><div className="pb">{d.reportsBy.length ? <><Legend items={repS.map((n, i) => ({ name: n, color: ["#eda100", "#eb6834", "#8a8a84", "#2a78d6"][i] }))} /><HStack label="Reports by type" rows={d.reportsBy} series={repS} colors={["#eda100", "#eb6834", "#8a8a84", "#2a78d6"]} /></> : <p className="small muted">No reports.</p>}</div></div>
      </div>
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="panel"><h3>Pickup time of day <small>last 30 days</small></h3><div className="pb"><VStack label="Pickups by hour" labels={hourLabels} series={[{ name: "Pickups", values: d.hours }]} colors={["#2a78d6"]} every={3} fmtV={(n) => String(Math.round(n))} /></div></div>
        <div className="panel"><h3>Cancellations per week <small>by who cancelled</small></h3><div className="pb"><Legend items={d.cancellations.map((s, i) => ({ name: s.name, color: SLOT[[0, 2, 1][i]] }))} /><VStack label="Cancellations per week" labels={d.weeks} series={d.cancellations} colors={[SLOT[0], SLOT[2], SLOT[1]]} fmtV={(n) => String(Math.round(n))} /></div></div>
      </div>
      <div className="panel"><h3>Admin workload <small>cases closed per admin, last 30 days</small></h3><div className="pb">{d.workload.length ? <><Legend items={admS.map((n, i) => ({ name: n, color: SLOT[i] }))} /><HStack label="Admin workload" rows={d.workload} series={admS} /></> : <p className="small muted">No admin actions in the last 30 days.</p>}</div></div>
    </>
  );
}

/** Agri companies paying for the monthly upazila report (the business model). */
export function CompaniesPanel() {
  const [co, setCo] = useState<Companies | null>(null);
  useEffect(() => { api<Companies>("/admin/companies").then(setCo).catch(() => {}); }, []);
  return (
    <div className="panel"><h3>Company subscriptions <small>monthly upazila report · ৳{co?.fee.toLocaleString("en-IN")} per upazila</small></h3>
          {co && <table className="ledger"><thead><tr><th>Company</th><th>Sells</th><th>Upazilas</th><th className="right">Monthly</th></tr></thead>
            <tbody>{co.companies.map((c) => <tr key={c.id}><td><b>{c.name}</b>{c.trial && <> <span className="tag gold">Trial</span></>}</td><td>{c.sells}</td><td className="small">{c.upazilas.length > 4 ? `${c.upazilas.length} upazilas` : c.upazilas.join(", ")}</td><td className="right num">{c.monthly ? tk0(c.monthly) : "free trial"}</td></tr>)}
              <tr><td colSpan={3} className="muted">Total per month</td><td className="right num"><b>{tk0(co.companies.reduce((s, c) => s + c.monthly, 0))}</b></td></tr></tbody></table>}
    </div>
  );
}
