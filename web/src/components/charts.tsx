"use client";
// SVG charts for A8 (ported from the prototype). Method: dataviz reference palette, validated
// (light: all checks pass; three slots under 3:1 → every chart carries visible value labels).
// Product colour = fixed categorical slot (follows the product, never its rank).
import { useState } from "react";

export const PRODUCT_COLOR: Record<string, string> = { Potato: "#2a78d6", Tomato: "#eb6834", Cauliflower: "#1baf7a", Brinjal: "#eda100", "Green chili": "#e87ba4", "Lal shak": "#008300" };
export const SLOT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"]; // series slots for non-product charts (≤ 3 stacked + "open")
const RAMP = ["#f3f7fd", "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281"];
const fmt = (n: number, dp = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: dp, minimumFractionDigits: 0 });

/* ---------- tooltip (one per chart) ---------- */
type Tip = { x: number; y: number; html: React.ReactNode } | null;
function useTip() {
  const [tip, setTip] = useState<Tip>(null);
  const show = (e: React.MouseEvent, html: React.ReactNode) => { let x = e.clientX + 14; if (x + 270 > window.innerWidth) x = e.clientX - 270; setTip({ x, y: e.clientY + 14, html }); };
  const node = tip ? <div className="tip" style={{ left: tip.x, top: tip.y }}>{tip.html}</div> : null;
  return { show, hide: () => setTip(null), node };
}
function nice(max: number) { if (max <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(max))), m = max / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; }
const barUp = (x: number, y: number, w: number, h: number, r = 4) => { r = Math.min(r, w / 2, h); return `M${x},${y + h}v-${h - r}a${r},${r} 0 0 1 ${r},-${r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - r}z`; };
const barRight = (x: number, y: number, w: number, h: number, r = 4) => { r = Math.min(r, w, h / 2); return `M${x},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - r}z`; };

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return <div className="legend">{items.map((i) => <span key={i.name}><i style={{ background: i.color }} />{i.name}</span>)}</div>;
}

/* ---------- horizontal bars ---------- */
export function HBars({ rows, unit = "", onPick, label }: { rows: { name: string; value: number; color?: string; note?: string }[]; unit?: string; onPick?: (name: string) => void; label: string }) {
  const t = useTip();
  const W = 520, rh = 30, L = 150, R = 70, H = rows.length * rh + 4, max = Math.max(1, ...rows.map((r) => r.value)), tot = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {rows.map((r, i) => {
          const y = i * rh + 6, w = Math.max(2, (W - L - R) * r.value / max);
          return (
            <g key={r.name}>
              <text x={L - 10} y={y + 13} textAnchor="end">{r.name}</text>
              <path d={barRight(L, y, w, 18)} fill={r.color ?? "var(--slate-2)"} />
              <text x={L + w + 6} y={y + 13} className="lbl-strong">{fmt(r.value, 1)}{unit}</text>
              <rect x={0} y={y - 4} width={W} height={rh} fill="transparent" style={{ cursor: onPick ? "pointer" : "default" }} onClick={() => onPick?.(r.name)}
                onMouseMove={(e) => t.show(e, <><b>{r.name}</b><br />{fmt(r.value, 1)}{unit} · {Math.round(100 * r.value / tot)}% of total{r.note ? <><br />{r.note}</> : null}</>)} onMouseLeave={t.hide} />
            </g>
          );
        })}
      </svg>
      {t.node}
    </div>
  );
}

/* ---------- stacked vertical bars (≤ 3 series) ---------- */
export function VStack({ labels, series, colors = SLOT, every = 2, H = 210, fmtV = (n: number) => fmt(n, 1), label }: { labels: string[]; series: { name: string; values: number[] }[]; colors?: string[]; every?: number; H?: number; fmtV?: (n: number) => string; label: string }) {
  const t = useTip();
  const W = 520, L = 38, R = 6, T = 16, B = 24, n = labels.length;
  const tot = labels.map((_, i) => series.reduce((s, se) => s + se.values[i], 0));
  const max = nice(Math.max(...tot, 1)), slot = (W - L - R) / n, bw = Math.min(30, slot * 0.68);
  const Y = (v: number) => T + (H - T - B) * (1 - v / max);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 0.5, 1].map((f) => <g key={f}><line x1={L} x2={W - R} y1={Y(max * f)} y2={Y(max * f)} stroke={f ? "var(--grid)" : "#cfcdc4"} /><text x={L - 6} y={Y(max * f) + 4} textAnchor="end">{fmtV(max * f)}</text></g>)}
        {labels.map((lb, i) => {
          const x = L + slot * i + (slot - bw) / 2;
          let acc = 0;
          const last = series.map((s) => s.values[i] > 0).lastIndexOf(true);
          return (
            <g key={lb + i}>
              {series.map((se, k) => {
                const v = se.values[i]; if (v <= 0) return null;
                const y0 = Y(acc), y1 = Y(acc + v); acc += v;
                return <path key={se.name} d={k === last ? barUp(x, y1, bw, y0 - y1, 3) : `M${x},${y1 + 1}h${bw}V${y0}h-${bw}z`} fill={colors[k]} />;
              })}
              {(i % every === 0 || i === n - 1) && <text x={x + bw / 2} y={H - 7} textAnchor="middle">{lb}</text>}
              {i === n - 1 && tot[i] > 0 && <text x={x + bw / 2} y={Y(tot[i]) - 5} textAnchor="middle" className="lbl-strong">{fmtV(tot[i])}</text>}
              <rect x={L + slot * i} y={0} width={slot} height={H} fill="transparent"
                onMouseMove={(e) => t.show(e, <><b>{lb}</b>{series.map((se) => <div key={se.name}>{se.name}: {fmtV(se.values[i])}</div>)}{series.length > 1 && <div>Total: {fmtV(tot[i])}</div>}</>)} onMouseLeave={t.hide} />
            </g>
          );
        })}
      </svg>
      {t.node}
    </div>
  );
}

/* ---------- lines with crosshair (≤ 3 series) ---------- */
export function Lines({ labels, series, unit = "", label }: { labels: string[]; series: { name: string; color: string; values: (number | null)[] }[]; unit?: string; label: string }) {
  const t = useTip();
  const [hover, setHover] = useState<number | null>(null);
  const W = 1100, H = 260, L = 44, R = 150, T = 14, B = 26, n = labels.length;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (!all.length) return <p className="small muted">No deals in this period.</p>;
  const lo = Math.floor(Math.min(...all) * 0.92), hi = Math.ceil(Math.max(...all) * 1.06);
  const X = (i: number) => L + (W - L - R) * i / (n - 1), Y = (v: number) => T + (H - T - B) * (1 - (v - lo) / Math.max(1, hi - lo));
  const ends = series.map((s) => { const i = s.values.map((v) => v !== null).lastIndexOf(true); return { s, i, y: i >= 0 ? Y(s.values[i]!) : 0 }; }).filter((e) => e.i >= 0).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 0.5, 1].map((f) => { const v = lo + (hi - lo) * f; return <g key={f}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={f ? "var(--grid)" : "#cfcdc4"} /><text x={L - 6} y={Y(v) + 4} textAnchor="end">{unit}{fmt(v)}</text></g>; })}
        {labels.map((lb, i) => (i % 2 === 1 || i === n - 1) && <text key={i} x={X(i)} y={H - 8} textAnchor="middle">{lb}</text>)}
        {hover !== null && <line x1={X(hover)} x2={X(hover)} y1={T} y2={H - B} stroke="#9aa39a" strokeDasharray="3 3" />}
        {series.map((s) => {
          const d = s.values.map((v, i) => (v === null ? "" : `${i && s.values[i - 1] !== null ? "L" : "M"}${X(i)},${Y(v)}`)).join("");
          return <path key={s.name} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />;
        })}
        {hover !== null && series.map((s) => s.values[hover] !== null && <circle key={s.name} cx={X(hover)} cy={Y(s.values[hover]!)} r={5} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />)}
        {ends.map((e) => <g key={e.s.name}><circle cx={W - R + 8} cy={e.y - 4} r={4} fill={e.s.color} /><text x={W - R + 16} y={e.y} className="lbl-strong">{e.s.name} {unit}{e.s.values[e.i]}</text></g>)}
        <rect x={L} y={0} width={W - L - R} height={H} fill="transparent"
          onMouseMove={(e) => { const r = (e.currentTarget as SVGRectElement).getBoundingClientRect(); const i = Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left) / r.width * (n - 1)))); setHover(i); t.show(e, <><b>Week of {labels[i]}</b>{series.map((s) => <div key={s.name}>{s.name}: {s.values[i] === null ? "no deals" : `${unit}${s.values[i]}/kg`}</div>)}</>); }}
          onMouseLeave={() => { setHover(null); t.hide(); }} />
      </svg>
      {t.node}
    </div>
  );
}

/* ---------- heatmap table (sequential, one hue) ---------- */
export function Heat({ rowsLabel, cols, rows, onRow, unit = " t", label }: { rowsLabel: string; cols: string[]; rows: { name: string; values: number[] }[]; onRow?: (name: string) => void; unit?: string; label: string }) {
  const t = useTip();
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  const shade = (v: number) => (v <= 0.05 ? RAMP[0] : RAMP[1 + Math.min(11, Math.floor(Math.sqrt(v / max) * 12))]);
  return (
    <>
      <table className="hm" aria-label={label}>
        <thead><tr><th>{rowsLabel}</th>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.name}>
            <td className="rowl" onClick={() => onRow?.(r.name)} style={{ cursor: onRow ? "pointer" : "default" }}>{r.name}</td>
            {r.values.map((v, i) => { const bg = shade(v); const dark = RAMP.indexOf(bg) >= 7; return (
              <td key={i} className="cell" style={{ background: bg, color: dark ? "#fff" : "var(--text-primary)" }} onMouseMove={(e) => t.show(e, <><b>{cols[i]}</b> in {r.name}<br />{fmt(v, 1)}{unit}</>)} onMouseLeave={t.hide}>{v ? fmt(v, v < 10 ? 1 : 0) : "·"}</td>
            ); })}
          </tr>
        ))}</tbody>
      </table>
      {t.node}
    </>
  );
}

/* ---------- stacked horizontal bars (share or count) ---------- */
export function HStack({ rows, series, colors = SLOT, pct, label }: { rows: { name: string; values: number[] }[]; series: string[]; colors?: string[]; pct?: boolean; label: string }) {
  const t = useTip();
  const W = 520, rh = 34, L = 130, R = 50, H = rows.length * rh + 4;
  const max = pct ? 1 : Math.max(1, ...rows.map((r) => r.values.reduce((a, b) => a + b, 0)));
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {rows.map((r, i) => {
          const y = i * rh + 6, tot = r.values.reduce((a, b) => a + b, 0) || 1, scale = (W - L - R) / (pct ? tot : max);
          let x = L;
          return (
            <g key={r.name}>
              <text x={L - 10} y={y + 14} textAnchor="end">{r.name}</text>
              {r.values.map((v, k) => { const w = v * scale; const x0 = x; x += w; return w > 0 ? <g key={k}><rect x={x0} y={y} width={Math.max(0, w - 2)} height={20} fill={colors[k]} rx={2} />{pct && w > 36 && <text x={x0 + w / 2} y={y + 14} textAnchor="middle" style={{ fill: "#fff", fontWeight: 600 }}>{Math.round(100 * v / tot)}%</text>}</g> : null; })}
              <text x={x + 6} y={y + 14} className="lbl-strong">{fmt(r.values.reduce((a, b) => a + b, 0))}</text>
              <rect x={0} y={y - 6} width={W} height={rh} fill="transparent" onMouseMove={(e) => t.show(e, <><b>{r.name}</b>{series.map((s, k) => <div key={s}>{s}: {fmt(r.values[k])}{pct ? ` (${Math.round(100 * r.values[k] / tot)}%)` : ""}</div>)}</>)} onMouseLeave={t.hide} />
            </g>
          );
        })}
      </svg>
      {t.node}
    </div>
  );
}

/* ---------- small multiple (each on its own scale) ---------- */
export function MiniLine({ name, labels, values, color, unit }: { name: string; labels: string[]; values: number[]; color: string; unit: string }) {
  const t = useTip();
  const W = 300, H = 110, L = 6, R = 40, T = 12, B = 20, max = Math.max(1, ...values) * 1.1, n = values.length;
  const X = (i: number) => L + (W - L - R) * i / (n - 1), Y = (v: number) => T + (H - T - B) * (1 - v / max);
  const d = values.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join("");
  return (
    <div>
      <div className="small" style={{ display: "flex", justifyContent: "space-between" }}><b>{name}</b><span className="muted">{fmt(values.reduce((a, b) => a + b, 0))} in 12 months</span></div>
      <div className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name} sign-ups per month`}>
          <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#cfcdc4" />
          <path d={d + `L${X(n - 1)},${H - B}L${X(0)},${H - B}z`} fill={color} opacity={0.1} />
          <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
          <circle cx={X(n - 1)} cy={Y(values[n - 1])} r={3.5} fill={color} />
          <text x={X(n - 1) + 7} y={Y(values[n - 1]) + 4} className="lbl-strong">{values[n - 1]}</text>
          {[0, 3, 6, 9, 11].map((i) => <text key={i} x={X(i)} y={H - 5} textAnchor="middle">{labels[i]}</text>)}
          <rect x={0} y={0} width={W} height={H} fill="transparent" onMouseMove={(e) => { const r = (e.currentTarget as SVGRectElement).getBoundingClientRect(); const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width * W - L) / ((W - L - R) / (n - 1))))); t.show(e, <><b>{name} · {labels[i]}</b><br />{values[i]} new {unit}</>); }} onMouseLeave={t.hide} />
        </svg>
      </div>
      {t.node}
    </div>
  );
}
