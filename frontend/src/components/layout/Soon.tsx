import { FieldScene } from "../landing/Art";

/** Placeholder for screens built in a later phase. */
export function Soon({ title, code, intro, phase, points }: { title: string; code: string; intro: string; phase: string; points: string[] }) {
  return (
    <>
      <div className="head"><div><h1>{title}</h1><p>{intro}</p></div><span className="code">Screen {code}</span></div>
      <div className="soon">
        <b>Coming in {phase}</b>
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 4 }}>{points.map((p) => <li key={p}>{p}</li>)}</ul>
        <div style={{ maxWidth: 420, margin: "18px auto 0", opacity: .8 }}><FieldScene /></div>
      </div>
    </>
  );
}
