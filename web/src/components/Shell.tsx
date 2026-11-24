"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, HOME, ROLE_LABEL, type Role, type User } from "@/lib/api";
import { NAV, BRAND_SUB, BODY_CLASS } from "@/lib/nav";
import { SessionProvider, useSession } from "./Session";
import { Icon, Logo } from "./Icon";
import { Bell } from "./Bell";
import { ToastProvider } from "./ui";
import { useAdminMode, setAdminMode } from "@/lib/adminMode";

function canSee(u: User, perm?: string) {
  if (!perm) return true;
  if (u.isSuperAdmin) return true;
  if (perm === "SUPER") return false;
  return u.permissions.includes(perm as never);
}

function StatusBanner({ u }: { u: User }) {
  if (u.status === "ACTIVE") return null;
  const text: Record<string, [string, string]> = {
    PENDING: ["warn", "Your account is waiting for admin verification. You can look around, but you can bid, offer or take trips only after approval."],
    REUPLOAD: ["warn", "Admin asked you to upload a clearer document." + (u.statusReason ? " Reason: " + u.statusReason : "")],
    REJECTED: ["bad", "Your verification was rejected." + (u.statusReason ? " Reason: " + u.statusReason : "")],
    SUSPENDED: ["bad", "Your account is suspended" + (u.suspendedUntil ? " until " + new Date(u.suspendedUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "") + ". Active deals continue, but you cannot start new ones." + (u.statusReason ? " Reason: " + u.statusReason : "")],
  };
  const t = text[u.status]; if (!t) return null;
  return <div className={"note " + t[0]} style={{ marginBottom: 18 }}>{t[1]}</div>;
}

function Frame({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, unread, loading } = useSession();
  const path = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const simple = useAdminMode(role === "ADMIN");
  useEffect(() => { setNavOpen(false); }, [path]); // close the mobile menu after navigating

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=" + encodeURIComponent(path));
    else if (user.role !== role) router.replace(HOME[user.role]);
  }, [loading, user, role, path, router]);

  useEffect(() => {
    const c = BODY_CLASS[role];
    if (c) document.body.classList.add(c);
    return () => { if (c) document.body.classList.remove(c); };
  }, [role]);

  if (loading || !user || user.role !== role) return <div className="boot">Loading FreshNest…</div>;

  const items = NAV[role].filter((i) => canSee(user, i.perm) && (!i.mode || (simple ?? true) === (i.mode === "simple")));
  const place = [user.upazila?.name, user.district?.name].filter(Boolean).join(", ");

  async function logout() { await api("/auth/logout", { method: "POST" }); window.location.assign("/login"); } // full reload clears all in-memory state on sign-out

  return (
    <div className={"app" + (navOpen ? " nav-open" : "")}>
      <div className="scrim" onClick={() => setNavOpen(false)} />
      <aside className="side" id="side-nav">
        <Logo href={HOME[role]} />
        <div className="me"><span className="av">{(user.businessName ?? user.name)[0]}</span><span><b>{user.businessName ?? user.name}</b><small>{role === "ADMIN" ? (user.isSuperAdmin ? "Super Admin" : "Admin") : ROLE_LABEL[role]}{place ? " · " + place : ""}</small></span></div>
        <nav className="nav">
          {items.map((i, idx) => {
            const head = i.group && i.group !== items[idx - 1]?.group ? <div className="grp">{i.group}</div> : null;
            const on = i.href === HOME[role] ? path === i.href : path.startsWith(i.href);
            return (
              <div key={i.href}>{head}<Link href={i.href} className={on ? "on" : ""}><Icon name={i.icon ?? "leaf"} />{i.label}</Link></div>
            );
          })}
        </nav>
        {role === "ADMIN" && (
          <div className="season"><p>
            {simple !== false
              ? <><b>Simple admin mode</b>One admin, the main tools and the business model.</>
              : <><b>Your permissions</b>{user.isSuperAdmin ? "Super Admin: everything, including team, settings, products and lifting bans." : user.permissions.map((p) => p[0] + p.slice(1).toLowerCase()).join(" · ") || "None yet"}</>}
            {user.isSuperAdmin && simple !== null && <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setAdminMode(!simple).then(() => router.push("/admin"))}>{simple ? "Show all admin tools" : "Back to simple mode"}</button>}
          </p></div>
        )}
      </aside>
      <div>
        <header className="top">
          <button className="menu-btn" aria-label="Menu" aria-expanded={navOpen} aria-controls="side-nav" onClick={() => setNavOpen((o) => !o)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          {BRAND_SUB[role] && <span className="proto-note">{BRAND_SUB[role]}</span>}
          <div className="sp" />
          <Bell initialUnread={unread} />
          <button className="btn ghost sm" onClick={logout}><Icon name="logout" size={15} />Sign out</button>
        </header>
        <main>
          <StatusBanner u={user} />
          {children}
        </main>
      </div>
    </div>
  );
}

export function Shell({ role, children }: { role: Role; children: React.ReactNode }) {
  return <SessionProvider><ToastProvider><Frame role={role}>{children}</Frame></ToastProvider></SessionProvider>;
}
