// Public sign-in / register frame: soft green background with a faint grid and a field line, logo + Home link, centred card.
import Link from "next/link";
import { Icon, Logo } from "./Icon";

export function Furrow({ className }: { className?: string }) {
  return (
    <svg className={"furrow" + (className ? " " + className : "")} viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 40 C 120 40 160 40 240 40 S 330 12 380 12 S 450 40 520 40 L 760 40 C 820 40 850 22 890 22 S 960 40 1010 40 L 1100 40 C 1150 40 1180 8 1230 8 S 1300 40 1350 40 L 1440 40" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function AuthFrame({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="au">
      <Furrow />
      <div className="au-top"><Logo /><Link className="au-home" href="/"><Icon name="arrow" size={15} className="flip" />Home</Link></div>
      <div className="au-wrap"><div className={"au-card" + (wide ? " wide" : "")}>
        <div className="au-mk"><Icon name="leaf" size={26} /></div>
        {children}
      </div></div>
    </div>
  );
}
