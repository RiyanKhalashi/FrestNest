"use client";
import { useSession } from "./Session";
import { FieldScene } from "./Art";

export function Welcome({ code, line }: { code: string; line: string }) {
  const { user } = useSession();
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="head hero">
      <div style={{ position: "absolute", right: 0, bottom: 0, width: 420, opacity: .9 }}><FieldScene /></div>
      <div style={{ position: "relative" }}>
        <h1>{greet}, {user!.name.split(" ")[0]}</h1>
        <p>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {line}</p>
      </div>
      <span className="code" style={{ position: "relative" }}>Screen {code}</span>
    </div>
  );
}
