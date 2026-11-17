"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type District } from "@/lib/api";
import { ago } from "@/lib/format";
import { FieldErr, useToast } from "@/components/ui";

interface Ann { id: string; title: string; body: string; audienceLabel: string; sponsor: string | null; reach: number; createdAt: string }
type Who = "all" | "role" | "district" | "upazila";

export default function Page() {
  const toast = useToast();
  const [list, setList] = useState<Ann[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [who, setWho] = useState<Who>("all");
  const [pick, setPick] = useState("");
  const [sponsored, setSponsored] = useState(false);
  const [sponsor, setSponsor] = useState("");
  const [f, setF] = useState({ title: "", body: "" });
  const [reach, setReach] = useState<{ reach: number; label: string } | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const audience = who === "all" ? "all" : `${who}:${pick}`;

  const load = useCallback(async () => {
    const r = await api<{ list: Ann[]; companies: { id: string; name: string }[] }>("/admin/announcements");
    setList(r.list); setCompanies(r.companies); setSponsor((s) => s || r.companies[0]?.name || "");
  }, []);
  useEffect(() => { load(); api<{ districts: District[] }>("/meta/locations").then((r) => setDistricts(r.districts)); }, [load]);
  useEffect(() => {
    if (who !== "all" && !pick) { setReach(null); return; }
    api<{ reach: number; label: string }>(`/admin/announcements/reach?audience=${encodeURIComponent(audience)}${sponsored ? "&sponsored=1" : ""}`).then(setReach).catch(() => setReach(null));
  }, [audience, who, pick, sponsored]);

  const options: [string, string][] = who === "role" ? [["FARMER", "Farmers"], ["DEALER", "Dealers"], ["TRANSPORTER", "Transporters"]]
    : who === "district" ? districts.map((d) => [String(d.id), d.name])
    : who === "upazila" ? districts.flatMap((d) => d.upazilas.map((u) => [String(u.id), `${u.name}, ${d.name}`] as [string, string])) : [];

  async function send() {
    setFields({});
    try { const r = await api<{ reach: number }>("/admin/announcements", { body: { ...f, audience, sponsor: sponsored ? sponsor : null } }); toast(`Sent to ${r.reach} people's notification bell.`); setF({ title: "", body: "" }); load(); }
    catch (e) { if (e instanceof ApiError) { toast(e.message); setFields(e.fields); } }
  }
  return (
    <>
      <div className="head"><div><h1>Announcements</h1><p>Messages arrive in users&apos; notification bell. Send to everyone, one role, one district or one upazila.</p></div><span className="code">Screen A7</span></div>
      <div className="grid g-main">
        <div className="panel"><h3>New announcement</h3><div className="pb">
          <div className="row">
            <div className="field"><label htmlFor="aw">Who receives it</label><select id="aw" value={who} onChange={(e) => { setWho(e.target.value as Who); setPick(""); }}><option value="all">Everyone</option><option value="role" disabled={sponsored}>One role</option><option value="district">One district</option><option value="upazila">One upazila</option></select></div>
            {who !== "all" && <div className="field"><label htmlFor="ap">{who === "role" ? "Role" : who === "district" ? "District" : "Upazila"}</label><select id="ap" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Choose…</option>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>}
          </div>
          <label className="spon"><input type="checkbox" checked={sponsored} onChange={(e) => { setSponsored(e.target.checked); if (e.target.checked && who === "role") { setWho("all"); setPick(""); } }} /> <b>Sponsored by an agri company</b> <span className="muted small">(paid, farmers only)</span></label>
          {sponsored && <div className="field"><label htmlFor="ac">Company</label><select id="ac" value={sponsor} onChange={(e) => setSponsor(e.target.value)}>{companies.map((c) => <option key={c.id}>{c.name}</option>)}</select><small>Sent only to farmers who turned on &quot;Agri partner offers&quot;. Always shown with a <b>Sponsored</b> label.</small></div>}
          <div className="field"><label htmlFor="at">Title</label><input id="at" placeholder="e.g. Dense fog on the highway" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /><FieldErr e={fields.title} /></div>
          <div className="field"><label htmlFor="am">Message</label><textarea id="am" rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /><FieldErr e={fields.body} /></div>
          <p className="small muted" style={{ marginBottom: 10 }}>{reach ? <>Reaches <b>{reach.reach.toLocaleString("en-IN")}</b> {sponsored ? "opted-in farmers" : "users"} ({reach.label}).</> : "Choose who receives it."}</p>
          <button className="btn slate" disabled={!reach || !reach.reach || f.title.length < 3 || f.body.length < 5} onClick={send}>Send announcement</button>
        </div></div>
        <div className="panel"><h3>Sent</h3>
          {list.length ? <table className="ledger"><tbody>{list.map((a) => <tr key={a.id}><td>{a.sponsor && <span className="tag gold">Sponsored</span>} <b>{a.title}</b><br /><span className="muted small">{a.sponsor ? a.sponsor + " · " : ""}{a.audienceLabel} · {a.reach} users · {ago(a.createdAt)}</span></td></tr>)}</tbody></table> : <p className="pb muted">Nothing sent yet.</p>}
        </div>
      </div>
    </>
  );
}
