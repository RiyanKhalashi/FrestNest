"use client";
import { useSession } from "./Session";

/** Dark gradient welcome card in the role's colour (premium design). */
export function Welcome({ code, line }: { code: string; line: string }) {
  const { user } = useSession();
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = user!.name.split(" ")[0]; // the person, not the business
  return (
    <div className="wel">
      <div className="row">
        <div>
          <small>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</small>
          <h1>{greet}, <span className="g">{first}</span></h1>
          <p>{line}</p>
        </div>
        <span className="code">Screen {code}</span>
      </div>
    </div>
  );
}
