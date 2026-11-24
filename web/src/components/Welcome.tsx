"use client";
import { useSession } from "./Session";
import { RoleEdge } from "./RoleEdge";

// Painted scenes are ready but switched off (2026-11-25, the user will decide later). To turn them on:
// { FARMER: "/art/farmer.webp", DEALER: "/art/dealer.webp", TRANSPORTER: "/art/transporter.webp" }
const SCENE: Partial<Record<string, string>> = {};

/** Welcome card: a painted Bangladeshi scene for farmer/dealer/transporter (docs/design/role-scenes-gen.py),
 *  the dark gradient card in the role's colour for admins. */
export function Welcome({ code, line }: { code: string; line: string }) {
  const { user } = useSession();
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = user!.name.split(" ")[0]; // the person, not the business
  return (
    <div className={"wel" + (SCENE[user!.role] ? " scene" : "")}>
      {SCENE[user!.role] && <img className="wel-art" src={SCENE[user!.role]} alt="" aria-hidden="true" />}
      <div className="row">
        <div>
          <small>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</small>
          <h1>{greet}, <span className="g">{first}</span></h1>
          <p>{line}</p>
        </div>
        <span className="code">Screen {code}</span>
      </div>
      {!SCENE[user!.role] && <RoleEdge role={user!.role} />}
    </div>
  );
}
