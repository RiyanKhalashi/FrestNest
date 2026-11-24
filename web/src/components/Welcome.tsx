"use client";
import { useSession } from "./Session";

const SCENE: Partial<Record<string, string>> = { FARMER: "/art/farmer.webp", DEALER: "/art/dealer.webp", TRANSPORTER: "/art/transporter.webp" };

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
    </div>
  );
}
