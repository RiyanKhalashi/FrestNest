"use client";
import { useSession } from "./Session";
import { Icon } from "./Icon";

/** Admin has no banner picture yet: drawn teal leaves + waves on the left, a shield and a laptop with charts on the right. */
function AdminArt() {
  return (
    <svg className="art" viewBox="0 0 1200 260" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <g fill="#9ADDD2" opacity=".45"><path d="M40 20c30 10 40 40 30 70-30-10-40-40-30-70Z" /><path d="M20 90c32 2 50 26 48 56-32-2-50-26-48-56Z" /><path d="M70 130c26-16 58-10 72 14-26 16-58 10-72-14Z" /></g>
      <path d="M0 150C60 160 110 200 170 225S300 252 380 260H0Z" fill="#7FD3C6" opacity=".55" />
      <path d="M0 190C70 200 130 230 230 248S330 258 380 260H0Z" fill="#12A594" opacity=".55" />
      <g transform="translate(830 40)">
        <path d="M70 0 136 24v56c0 52-30 88-66 104C34 168 4 132 4 80V24Z" fill="rgba(255,255,255,.7)" stroke="#0E9F92" strokeWidth="4" />
        <circle cx="70" cy="70" r="20" fill="none" stroke="#0E9F92" strokeWidth="5" />
        <path d="M36 132c6-22 20-34 34-34s28 12 34 34" fill="none" stroke="#0E9F92" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g transform="translate(1000 52) rotate(-6)">
        <rect width="170" height="112" rx="10" fill="#0B4A4C" stroke="#0E9F92" strokeWidth="3" />
        <rect x="18" y="62" width="14" height="34" rx="2" fill="#4FE3C8" /><rect x="40" y="44" width="14" height="52" rx="2" fill="#4FE3C8" opacity=".85" /><rect x="62" y="28" width="14" height="68" rx="2" fill="#4FE3C8" opacity=".7" />
        <circle cx="126" cy="50" r="24" fill="none" stroke="#4FE3C8" strokeWidth="10" strokeDasharray="100 51" />
        <path d="M96 84h52M96 94h36" stroke="#4FE3C8" strokeWidth="3" opacity=".6" />
        <path d="M-14 112h198l10 14H-24Z" fill="#CFEFEA" stroke="#0E9F92" strokeWidth="2" />
      </g>
    </svg>
  );
}

/** Welcome banner (dashboard v3): the role's picture with the greeting on its calm left side. */
export function Welcome({ code, line }: { code: string; line: string }) {
  const { user } = useSession();
  const h = new Date().getHours();
  const admin = user!.role === "ADMIN";
  const greet = admin ? "Welcome back" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = user!.name.split(" ")[0]; // the person, not the business
  return (
    <section className="hello">
      {admin && <AdminArt />}
      <span className="code">Screen {code}</span>
      <div className="txt">
        <span className="date"><Icon name="calendar" size={16} />{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
        <h1>{greet}, <span className="g">{first}</span></h1>
        <p>{line}</p>
        <svg className="swoosh" viewBox="0 0 160 10" fill="none" aria-hidden="true"><path d="M2 7C40 2 100 1 156 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
      </div>
    </section>
  );
}
