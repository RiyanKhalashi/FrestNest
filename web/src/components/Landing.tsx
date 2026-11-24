"use client";
// Public home page (premium design, docs/decisions/fyp-premium-design.md): every FreshNest feature + the business model.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, HOME, ROLE_LABEL, type User } from "@/lib/api";
import { Icon, Logo } from "./Icon";
import { Furrow } from "./AuthFrame";

function Tomato({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 13c-9.5-.4-16.2 5.6-16 14.4.2 9 7.2 14.8 16.4 14.6 9-.2 15.8-6.3 15.6-14.9C39.7 18.6 33.2 13.3 24 13z" fill="#F4A890" stroke="#0E2218" strokeWidth="1.6" />
      <path d="M24.2 13.2c-2.6-2.2-6-2.3-8.4-.6 2.5 1.4 5 1.8 8.4.6zm.1 0c2.3-2.4 5.8-2.8 8.4-1.2-2.4 1.6-5 2.2-8.4 1.2zM24.1 13c.2-2.8 1-4.9 2.6-6.6" fill="#8FE6B4" stroke="#0E2218" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const ROLES = {
  farmer: { tab: "Farmers", bg: "linear-gradient(150deg,#1C8A55,#0B3B26)", icon: "leaf", h: "Sell from the field, at a fair price, without a middleman.", list: ["List in a minute: product, quantity, harvest date, price or bidding", "Choose who sees it: only your upazila, district or nationwide", "Answer offers or let the highest bid win by itself", "Give your pickup code only when the truck is loaded"] },
  dealer: { tab: "Dealers", bg: "linear-gradient(150deg,#2B5C8C,#0F2440)", icon: "cart", h: "Buy fresh lots near you, with a truck already lined up.", list: ["Browse nearest first, filter by upazila and product", "Bid, use Buy Now, or make an offer with your quantity and price", "Compare transport offers by price, vehicle and rating, counter once", "Confirm delivery with your code when the produce arrives"] },
  trans: { tab: "Transporters", bg: "linear-gradient(150deg,#D06A16,#3A1C06)", icon: "truck", h: "Find loads that fit your vehicles, on routes you already drive.", list: ["Only deals your vehicle can carry, searched by pickup upazila", "One offer per deal: vehicle, price, pickup and delivery time", "Accept or reject a dealer's counter-offer in one tap", "Report a breakdown with a photo; the load is sold nearby"] },
  admin: { tab: "Admins", bg: "linear-gradient(150deg,#0E3B2A,#06170F)", icon: "shield", h: "Keep the marketplace safe, fair and earning.", list: ["Verify dealers, transporters and their vehicles", "Approve delivery failures so emergency sales can start", "Handle reports and cancellations with a written reason", "Run the business: upazila reports, subscriptions, sponsored offers"] },
} as const;
type RoleKey = keyof typeof ROLES;

// Signed-in visitor: name + role chip with Open dashboard / Switch account / Log out.
function AccountMenu({ me, onSignedOut }: { me: User; onSignedOut: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", click); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);
  async function signOut(to: "/" | "/login") {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    if (to === "/login") window.location.assign("/login"); else { setOpen(false); onSignedOut(); }
  }
  return (
    <div className="lp-acct" ref={box}>
      <button className="who" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="av">{me.name.trim().charAt(0).toUpperCase()}</span>
        <span className="nm"><b>{me.name}</b><small>{ROLE_LABEL[me.role]}</small></span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="menu" role="menu">
          <Link role="menuitem" href={HOME[me.role]}><Icon name="home" size={17} />Open dashboard</Link>
          <button role="menuitem" onClick={() => signOut("/login")}><Icon name="swap" size={17} />Switch account</button>
          <button role="menuitem" className="out" onClick={() => signOut("/")}><Icon name="logout" size={17} />Log out</button>
        </div>
      )}
    </div>
  );
}

export function Landing() {
  const [solid, setSolid] = useState(false);
  const [role, setRole] = useState<RoleKey>("farmer");
  const [me, setMe] = useState<User | null>(null);
  const dash = me ? HOME[me.role] : null;

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on(); window.addEventListener("scroll", on, { passive: true });
    api<{ user: User }>("/auth/me").then((r) => setMe(r.user)).catch(() => {});
    return () => window.removeEventListener("scroll", on);
  }, []);
  const r = ROLES[role];

  return (
    <div className="lp">
      <header className={"lp-nav" + (solid ? " solid" : "")}><div className="lp-in">
        <Logo />
        <nav className="links" aria-label="Sections"><a href="#features">Features</a><a href="#how">How it works</a><a href="#roles">Roles</a><a href="#companies">For companies</a><a href="#about">About</a></nav>
        <span className="sp" />
        {me ? <AccountMenu me={me} onSignedOut={() => setMe(null)} />
          : <><Link className="login" href="/login">Log in</Link><Link className="lp-btn green sm" href="/register">Join free</Link></>}
      </div></header>

      <section className="lp-hero">
        <div className="lp-in">
          <div>
            <h1>From the field to the dealer, <span className="g">before it spoils.</span></h1>
            <p className="sub">Farmers sell straight from the field. Dealers bid or make offers, verified transporters carry the load, and if a truck breaks down on the way, the harvest is sold nearby instead of going to waste.</p>
            <div className="ctas"><Link className="lp-btn white" href={dash ?? "/register"}>{dash ? "Open your dashboard" : "Start selling, free"} <Icon name="arrow" /></Link>{!dash && <Link className="lp-btn outline" href="/login">I already have an account</Link>}</div>
            <div className="lp-checks"><span><Icon name="check" />Verified dealers &amp; transporters</span><span><Icon name="check" />Codes at every handover</span><span><Icon name="check" />Down to your upazila</span></div>
          </div>
          <div className="lp-stage" aria-label="Example listing with live updates">
            <div className="ring" />
            <div className="lp-chip c1"><span className="ic" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}><Icon name="gavel" /></span><span><b>New bid · ৳38.00/kg</b><small>Hasan Traders, Bogura Sadar</small></span></div>
            <div className="lp-chip c2"><span className="ic" style={{ background: "var(--amber-soft)", color: "var(--orange)" }}><Icon name="truck" /></span><span><b>Truck confirmed</b><small>Bogura-Ta 14-1177 · pickup 7 am</small></span></div>
            <div className="lp-ticket">
              <div className="t-top"><span>Listing FN-1058</span><b>Bidding</b></div>
              <div className="crop"><span className="ci"><Tomato /></span><span><b>Tomato · 900 kg</b><small>Karim Uddin · Shibganj, Bogura</small></span></div>
              <div className="bids">
                {([["Hasan Traders", "৳38.00", 100], ["Joypurhat Fresh", "৳37.50", 86], ["Rangpur Mart", "৳36.00", 64]] as const).map(([n, p, w]) => (
                  <div className="bid" key={n}><span>{n}</span><b className="num">{p}</b><span className="bar"><i style={{ width: w + "%" }} /></span></div>
                ))}
              </div>
              <div className="t-foot"><span>Ends in<b className="num">5h 12m</b></span><span>Buy Now<b className="num">৳40.00/kg</b></span><span>Vehicle<b>Normal</b></span></div>
            </div>
            <div className="lp-chip c3"><span className="ic" style={{ background: "var(--green-soft)", color: "var(--green)" }}><Icon name="key" /></span><span><b>Pickup code ready</b><small>Give it only after loading</small></span></div>
          </div>
        </div>
        <Furrow />
        <div className="lp-curve" />
      </section>

      <section className="lp-who lp-in" aria-label="Who it is for">
        <span className="lp-eyebrow">Made for everyone between the field and the market</span>
        <div className="row"><span><Icon name="leaf" size={22} />Farmers</span><span><Icon name="cart" size={22} />Dealers</span><span><Icon name="truck" size={22} />Transporters</span><span><Icon name="brief" size={22} />Agri companies</span></div>
      </section>

      <section className="lp-sec" id="features"><div className="lp-in">
        <div className="lp-sec-h"><span className="lp-eyebrow">Features</span><h2>Everything a harvest needs. Nothing that slows it down.</h2><p>Built around one rule: fresh produce can&apos;t wait.</p></div>
        <div className="lp-bento">
          <article className="lp-bx w2 tint">
            <span className="ic"><Icon name="gavel" /></span>
            <h3>Sell your way</h3>
            <p>Open bidding where the highest bid wins by itself, or your own price with dealer offers and one counter-offer. Add a Buy Now price if you want it gone fast.</p>
            <div className="lp-demo">
              <div className="lp-mini lead"><span className="lp-dot" style={{ background: "var(--green)" }} /><b>Hasan Traders</b><span style={{ color: "var(--muted)" }}>leading</span><span className="r num">৳38.00</span></div>
              <div className="lp-mini"><span className="lp-dot" style={{ background: "#9DB7A6" }} /><b>Joypurhat Fresh</b><span className="r num">৳37.50</span></div>
              <div className="lp-mini"><span className="lp-dot" style={{ background: "var(--amber)" }} /><b>Offer · 500 kg at ৳21</b><span className="lp-tag amber" style={{ marginLeft: "auto" }}>You countered ৳22</span></div>
            </div>
          </article>
          <article className="lp-bx">
            <span className="ic"><Icon name="key" /></span>
            <h3>Proof at every handover</h3>
            <p>The farmer gives a 4-digit code at loading, the dealer gives another at delivery. No code, no handover.</p>
            <div className="lp-demo"><div className="lp-codes"><span>4</span><span>8</span><span>2</span><span className="cur">9</span></div></div>
          </article>
          <article className="lp-bx">
            <span className="ic"><Icon name="truck" /></span>
            <h3>The right vehicle, every time</h3>
            <p>Deals reach only transporters whose vehicle fits the load and the produce. A better vehicle can always offer.</p>
            <div className="lp-demo"><div className="lp-facs"><span className="lp-tag plain">Normal</span><span className="lp-tag blue">Ventilated</span><span className="lp-tag green"><Icon name="snow" size={14} />Refrigerated</span></div><div className="lp-mini"><span>Pickup up to 300 kg · local transporters only</span></div></div>
          </article>
          <article className="lp-bx">
            <span className="ic"><Icon name="swap" /></span>
            <h3>Bargain on transport</h3>
            <p>Dealers compare offers with rating and vehicle, and can counter once. A yes books the truck straight away.</p>
            <div className="lp-demo"><div className="lp-mini"><b>Bogura Logistics</b><span className="r num" style={{ textDecoration: "line-through", color: "var(--muted)", fontWeight: 600 }}>৳3,200</span></div><div className="lp-mini lead"><b>Counter accepted</b><span className="r num" style={{ color: "var(--green)" }}>৳2,700</span></div></div>
          </article>
          <article className="lp-bx">
            <span className="ic"><Icon name="sun" /></span>
            <h3>Season-aware advice</h3>
            <p>Summer and monsoon warnings for open vehicles, a cost-saving tag in winter. Advice only, never a block.</p>
            <div className="lp-demo"><span className="lp-tag green">Winter · cost-saving</span><span className="lp-tag amber">Monsoon · cover with tarpaulin</span></div>
          </article>
          <article className="lp-bx w2 tint">
            <span className="ic"><Icon name="life" /></span>
            <h3>A breakdown doesn&apos;t mean a lost harvest</h3>
            <p>The driver reports the problem with a photo, an admin approves, and the load goes on emergency sale to dealers near the stuck vehicle, widening step by step until someone buys.</p>
            <div className="lp-demo"><div className="lp-tiers">
              <div className="now"><span className="n">1</span><b>Same upazila</b><small>straight away</small></div>
              <div><span className="n">2</span><b>Whole district</b><small>after 1 hour without bids</small></div>
              <div><span className="n">3</span><b>Neighbouring districts</b><small>after another hour</small></div>
            </div></div>
          </article>
          <article className="lp-bx">
            <span className="ic"><Icon name="star" /></span>
            <h3>Fair play, on the record</h3>
            <p>Reviews after every deal, reports tied to the deal, and a private account standing that shows any admin warning.</p>
            <div className="lp-demo"><div className="lp-mini"><span style={{ color: "var(--amber)", letterSpacing: 2 }}>★★★★★</span><span>“Fair price, paid on time.”</span></div></div>
          </article>
          <article className="lp-bx">
            <span className="ic"><Icon name="bell" /></span>
            <h3>Live, not refresh</h3>
            <p>Bids, offers and trip updates arrive the moment they happen, on every screen and phone.</p>
            <div className="lp-demo"><div className="lp-mini"><span className="lp-dot" style={{ background: "var(--red)" }} /><span><b>You were outbid</b> on Green chili · ৳64.00</span></div></div>
          </article>
          <article className="lp-bx w2">
            <span className="ic"><Icon name="map" /></span>
            <h3>Down to the upazila</h3>
            <p>Sell only in your upazila, your district or nationwide. Dealers sort nearest first; transporters search by pickup upazila.</p>
            <div className="lp-demo"><div className="lp-facs"><span className="lp-tag dark">Only my upazila</span><span className="lp-tag plain">District</span><span className="lp-tag plain">Nationwide</span></div></div>
          </article>
        </div>
      </div></section>

      <section className="lp-sec wash" id="how"><div className="lp-in">
        <div className="lp-sec-h"><span className="lp-eyebrow">How it works</span><h2>From harvest to handover in four steps</h2></div>
        <div className="lp-steps">
          {([["plus", "List the harvest", "Product, quantity, harvest date, and how far it may travel."], ["gavel", "Dealers compete", "Highest bid wins, or you accept the best offer."], ["truck", "A truck is booked", "Matched transporters offer; the dealer confirms one."], ["key", "Codes close the deal", "Pickup code at loading, delivery code at the door."]] as const).map(([ic, h, p], i) => (
            <div className="lp-step" key={h}><span className="ic"><Icon name={ic} size={26} /><b>{i + 1}</b></span><h3>{h}</h3><p>{p}</p></div>
          ))}
        </div>
      </div></section>

      <section className="lp-sec" id="roles"><div className="lp-in">
        <div className="lp-sec-h"><span className="lp-eyebrow">For everyone in the chain</span><h2>One platform, four roles</h2></div>
        <div className="lp-rtabs" role="tablist" aria-label="Roles">
          {(Object.keys(ROLES) as RoleKey[]).map((k) => <button key={k} role="tab" aria-selected={role === k} onClick={() => setRole(k)}>{ROLES[k].tab}</button>)}
        </div>
        <div className="lp-rpanel" role="tabpanel">
          <div className="l" style={{ background: r.bg }}><span className="ic"><Icon name={r.icon} size={26} /></span><h3>{r.h}</h3></div>
          <div className="r"><ul>{r.list.map((t) => <li key={t}><Icon name="check" /><span>{t}</span></li>)}</ul><Link className="lp-more" href="/register">Create your account <Icon name="arrow" /></Link></div>
        </div>
      </div></section>

      <section className="lp-sec wash" id="companies"><div className="lp-in">
        <div className="lp-sec-h"><span className="lp-eyebrow">For agri companies · the business model</span><h2>Know what grows where. Reach the farmers who want to hear from you.</h2><p>FreshNest stays free for farmers, dealers and transporters. Seed, fertiliser, equipment and cold-storage companies pay for insight and reach.</p></div>
        <div className="lp-biz">
          <article className="lp-bx">
            <span className="ic"><Icon name="chart" /></span>
            <h3>Upazila market reports</h3>
            <p>What sells in each upazila, how much, and at what price, month by month. Farmer names only for farmers who allowed it.</p>
            <div className="lp-price">৳1,500<small> per upazila / month</small></div>
            <div className="lp-demo lp-bars" aria-label="Example: top products in an upazila">
              <div><span>Potato</span><i style={{ width: "100%" }} /><span className="num">41 t</span></div>
              <div><span>Tomato</span><i style={{ width: "62%" }} /><span className="num">26 t</span></div>
              <div><span>Brinjal</span><i style={{ width: "37%" }} /><span className="num">15 t</span></div>
            </div>
          </article>
          <article className="lp-bx tint">
            <span className="ic"><Icon name="bell" /></span>
            <h3>Sponsored offers, with consent</h3>
            <p>A company&apos;s offer goes only to farmers in chosen upazilas who switched on “Agri partner offers”, always with a Sponsored label.</p>
            <div className="lp-demo">
              <div className="lp-mini" style={{ alignItems: "flex-start" }}><span className="lp-tag amber">Sponsored</span><span><b>10% off potato seed</b><br /><span style={{ color: "var(--muted)" }}>GreenSeed Bangladesh · Bogura Sadar farmers</span></span></div>
              <div className="lp-mini"><Icon name="check" /><span>Reaches only farmers who opted in</span></div>
            </div>
          </article>
        </div>
      </div></section>

      <section className="lp-sec lp-dark" id="trust"><div className="lp-in">
        <div className="lp-sec-h"><span className="lp-eyebrow">Trust</span><h2>Built so nobody gets cheated</h2><p>Every step leaves proof, and every admin decision has a written reason.</p></div>
        <div className="lp-nums">
          <div><b>4<em>-digit</em></b><p>pickup and delivery codes prove each handover</p></div>
          <div><b>3<em>tiers</em></b><p>of emergency sale when a vehicle gets stuck</p></div>
          <div><b>1<em>counter</em></b><p>per offer, so bargaining stays quick and fair</p></div>
          <div><b>42<em>upazilas</em></b><p>covered, with nearest-first matching</p></div>
        </div>
        <div className="lp-trust">
          <div><Icon name="shield" />Dealers and transporters are verified by an admin</div>
          <div><Icon name="shield" />Vehicles approved with their papers before any trip</div>
          <div><Icon name="shield" />Cancelling a booked deal needs a reason and admin approval</div>
          <div><Icon name="shield" />Companies see farmer names only with the farmer&apos;s consent</div>
        </div>
      </div></section>

      <section className="lp-sec" id="about"><div className="lp-in lp-about">
        <div><span className="lp-eyebrow">About</span>
          <blockquote>A farmer often sells to whoever reaches the field first, and one breakdown on the highway can cost a whole harvest. FreshNest brings dealers and trucks to the field, with proof at every step.</blockquote>
        </div>
        <div className="lp-vals">
          <div><span className="ic"><Icon name="leaf" /></span><span><b>Farmer first</b><span>Free to sell, no verification needed to start.</span></span></div>
          <div><span className="ic"><Icon name="shield" /></span><span><b>Verified partners</b><span>Dealers, transporters and vehicles are checked by an admin.</span></span></div>
          <div><span className="ic"><Icon name="life" /></span><span><b>Less waste</b><span>Stuck produce is sold nearby instead of rotting.</span></span></div>
        </div>
      </div></section>

      <section className="lp-in" style={{ paddingBottom: 96 }}><div className="lp-cta">
        <h2>Your next harvest, sold before it leaves the field.</h2>
        <p>Create a free account in a minute. Farmers can list right away; dealers and transporters start after a quick verification.</p>
        <div className="ctas"><Link className="lp-btn white" href={dash ?? "/register"}>{dash ? "Open your dashboard" : "Join FreshNest"} <Icon name="arrow" /></Link>{!dash && <Link className="lp-btn outline" href="/login">Log in</Link>}</div>
      </div></section>

      <footer className="lp-foot"><div className="lp-in">
        <div className="cols">
          <div style={{ display: "grid", gap: 14, alignContent: "start" }}><Logo dark /><p style={{ maxWidth: "30ch" }}>Fresh produce from the field to the dealer: fair prices, verified transport, less waste.</p></div>
          <div><h4>Product</h4><ul><li><a href="#features">Features</a></li><li><a href="#how">How it works</a></li><li><a href="#trust">Trust</a></li><li><a href="#about">About</a></li></ul></div>
          <div><h4>For</h4><ul><li><Link href="/register">Farmers</Link></li><li><Link href="/register">Dealers</Link></li><li><Link href="/register">Transporters</Link></li><li><a href="#companies">Agri companies</a></li></ul></div>
          <div><h4>Account</h4><ul><li><Link href="/login">Log in</Link></li><li><Link href="/register">Join free</Link></li></ul></div>
        </div>
        <div className="bot"><span>© 2026 FreshNest · final year project</span><span>Made in Bangladesh · <Link href="/login">Admin login</Link></span></div>
      </div></footer>
    </div>
  );
}
