"use client";
import { useEffect, useState } from "react";
import { dateShort, kg } from "@/lib/format";
import { Stars } from "./transport";
import { DocsPanel, ReportReview } from "./Reporting";
import { api, ApiError, ROLE_LABEL, type User } from "@/lib/api";
import { useSession } from "./Session";
import { PlacePicker } from "./PlacePicker";

export function ProfilePage({ code }: { code: string }) {
  const { user, setUser } = useSession();
  const u = user!;
  const [f, setF] = useState({ name: u.name, village: u.village ?? "", businessName: u.businessName ?? "" });
  const [upazilaId, setUpazilaId] = useState(u.upazila?.id ?? 0);
  const [msg, setMsg] = useState<[string, string] | null>(null);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<[string, string] | null>(null);
  const [rv, setRv] = useState<{ avg: number | null; count: number; dist: number[]; reviews: { id: string; stars: number; comment: string; at: string; from: string; fromRole: string; deal: string; product: string; quantityKg: number }[] } | null>(null);
  useEffect(() => { if (u.role !== "ADMIN") api<NonNullable<typeof rv>>("/profile/reviews").then(setRv).catch(() => {}); }, [u.role]);

  async function save() {
    setMsg(null);
    try {
      const r = await api<{ user: User }>("/profile", { method: "PATCH", body: { name: f.name, village: f.village, businessName: u.role === "FARMER" ? undefined : f.businessName, upazilaId: upazilaId || undefined } });
      setUser(r.user); setMsg(["good", "Saved."]);
    } catch (e) { setMsg(["bad", e instanceof ApiError ? e.message : "Could not save."]); }
  }
  async function togglePartner(on: boolean) {
    const r = await api<{ user: User }>("/profile", { method: "PATCH", body: { partnerOffers: on } });
    setUser(r.user);
  }
  async function changePw() {
    setPwMsg(null);
    try { await api("/profile/password", { body: pw }); setPw({ current: "", next: "" }); setPwMsg(["good", "Password updated."]); }
    catch (e) { setPwMsg(["bad", e instanceof ApiError ? e.message : "Could not update."]); }
  }

  return (
    <>
      <div className="head"><div><h1>Profile &amp; reviews</h1><p>What others see about you.</p></div><span className="code">Screen {code}</span></div>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="grid">
          <div className="panel">
            <h3>Your details</h3>
            <div className="pb">
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <div className="avatar" style={{ width: 64, height: 64, fontSize: 28 }}>{u.name[0]}</div>
                <p className="small muted">{ROLE_LABEL[u.role]} · member since {new Date(u.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}{u.role === "FARMER" ? " · farmers do not need verification" : ""}</p>
              </div>
              <div className="row">
                <div className="field"><label htmlFor="pn">Full name</label><input id="pn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
                <div className="field"><label>Phone</label><input value={u.phone} disabled /><small>Your sign-in number</small></div>
              </div>
              {u.role !== "FARMER" && u.role !== "ADMIN" && <div className="field"><label htmlFor="pbn">Business name</label><input id="pbn" value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} /></div>}
              <PlacePicker value={upazilaId} onChange={setUpazilaId} />
              {u.role === "FARMER" && <div className="field"><label htmlFor="pv">Village</label><input id="pv" value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })} /></div>}
              <button className="btn" onClick={save}>Save changes</button>
              {msg && <span className={"small " + (msg[0] === "bad" ? "err" : "muted")} style={{ marginLeft: 10 }}>{msg[1]}</span>}
            </div>
          </div>

          {u.role === "FARMER" && (
            <div className="panel">
              <h3>Agri partner offers <small>optional · off by default</small></h3>
              <div className="pb">
                <label className="optin">
                  <input type="checkbox" checked={u.partnerOffers} onChange={(e) => togglePartner(e.target.checked)} />
                  <span className="sw" aria-hidden="true" />
                  <span><b>Receive offers from verified agri companies</b><small>Seed, fertiliser, crop-care and equipment companies can send you offers that suit the crops you grow, such as early-season seed prices or crop advice for your upazila.</small></span>
                </label>
                <div className="safe">
                  <div className="lbl">You stay in control</div>
                  <ul>
                    <li><b>Your phone number is never shared.</b> Offers arrive only as messages in your FreshNest notifications.</li>
                    <li><b>Only companies checked by FreshNest.</b> Our admin team verifies every company before it can send anything.</li>
                    <li><b>Your sales stay private.</b> Companies never see your prices, buyers or deal amounts.</li>
                    <li><b>No obligation.</b> You decide whether to reply. Turn this off any time and it stops at once.</li>
                  </ul>
                </div>
                <div className="seen">
                  <div className="lbl">What a company would see</div>
                  <div className="card-mini"><b>{u.name}</b><span>{[u.upazila?.name, u.district?.name].filter(Boolean).join(", ")}</span></div>
                  <p className="small muted" style={{ marginTop: 6 }}>Never shown: phone, village, prices, buyers, ratings.</p>
                </div>
                <p className="small muted" style={{ marginTop: 10 }}>{u.partnerOffers ? "On. Verified companies can send you offers in your notifications. Your phone number stays hidden." : "Off. Companies see your area only inside upazila totals, without your name."}</p>
              </div>
            </div>
          )}

          {(u.role === "DEALER" || u.role === "TRANSPORTER") && <DocsPanel />}

          <div className="panel">
            <h3>Password</h3>
            <div className="pb">
              <div className="row">
                <div className="field"><label htmlFor="cp">Current password</label><input id="cp" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
                <div className="field"><label htmlFor="np">New password</label><input id="np" type="password" placeholder="At least 8 characters" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
              </div>
              <button className="btn ghost" onClick={changePw}>Update password</button>
              {pwMsg && <span className={"small " + (pwMsg[0] === "bad" ? "err" : "muted")} style={{ marginLeft: 10 }}>{pwMsg[1]}</span>}
            </div>
          </div>
        </div>

        {u.role !== "ADMIN" && (
          <div className="panel">
            <h3>Reviews <small>from {u.role === "FARMER" ? "dealers" : u.role === "DEALER" ? "farmers" : "farmers and dealers"} after completed deals</small></h3>
            {!rv ? <p className="pb muted">Loading…</p> : rv.count === 0 ? <div className="pb muted">No reviews yet. Reviews appear here after completed deals.</div> : (
              <>
                <div className="pb" style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 20, borderBottom: "1px solid var(--line)" }}>
                  <div><div className="num" style={{ font: "600 46px/1 var(--display)" }}>{rv.avg}</div><Stars value={Math.round(rv.avg ?? 0)} size={16} /><div className="small muted">{rv.count} review{rv.count > 1 ? "s" : ""}</div></div>
                  <div className="small" style={{ display: "grid", gap: 5, alignContent: "center" }}>
                    {rv.dist.map((n, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr 24px", gap: 8, alignItems: "center" }}><span className="num">{5 - i}</span><div className="bar"><i style={{ width: (100 * n) / rv.count + "%" }} /></div><span className="num muted">{n}</span></div>)}
                  </div>
                </div>
                <table className="ledger"><tbody>{rv.reviews.map((r) => (
                  <tr key={r.id}><td><Stars value={r.stars} size={15} /> <b>{r.from}</b> <span className="muted small">· {r.product}, {kg(r.quantityKg)} · {r.deal} · {dateShort(r.at)}</span><br />{r.comment}{r.stars <= 3 && <> · <ReportReview reviewId={r.id} /></>}</td></tr>
                ))}</tbody></table>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
