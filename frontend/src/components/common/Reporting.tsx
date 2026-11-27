"use client";
// User side of Phase 5: verification documents, reporting a person, reporting a review.
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ago } from "@/lib/format";
import { FieldErr, Modal, useToast } from "./UI";
import { useSession } from "../layout/Session";
import { shrink } from "@/lib/image";

const DOC: Record<string, [string, string]> = { NID: ["National ID (NID)", "Front side, all four corners visible"], TRADE_LICENSE: ["Trade licence", "The current year's licence with your shop name"], DRIVING_LICENSE: ["Driving licence", "The licence of the main driver"] };

/** Dealers and transporters upload their documents; an admin checks them. */
export function DocsPanel() {
  const { user, refresh } = useSession();
  const toast = useToast();
  const [docs, setDocs] = useState<{ kind: string; file: string | null; at: string | null }[]>([]);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => setDocs((await api<{ docs: { kind: string; file: string | null; at: string | null }[] }>("/profile/docs")).docs), []);
  useEffect(() => { load(); }, [load]);
  async function upload(kind: string, file: File) {
    setBusy(kind);
    const fd = new FormData(); fd.append("kind", kind); fd.append("file", await shrink(file));
    try {
      const r = await fetch("/api/profile/docs", { method: "POST", body: fd, credentials: "include" });
      const j = await r.json(); if (!r.ok) throw new ApiError(j.error, r.status);
      toast(j.complete ? "Uploaded. An admin will check your documents, usually within a day." : "Uploaded."); load(); refresh();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Upload failed."); } finally { setBusy(""); }
  }
  if (!user) return null;
  return (
    <div className="panel">
      <h3>Verification documents <small>{user.status === "ACTIVE" ? "verified" : "needed before you can " + (user.role === "DEALER" ? "bid or make offers" : "send transport offers")}</small></h3>
      <div className="pb">
        {user.status === "REUPLOAD" && <div className="note warn" style={{ marginBottom: 12 }}>An admin asked for a clearer document{user.statusReason ? `: ${user.statusReason}` : ""}. Upload it again below.</div>}
        {user.status === "ACTIVE" && <div className="note good" style={{ marginBottom: 12 }}>Your account is verified. Uploading a new document does not change that.</div>}
        {docs.map((d) => (
          <div key={d.kind} className="offer" style={{ gridTemplateColumns: "1fr auto" }}>
            <div><h5>{DOC[d.kind][0]}</h5><div className="small muted">{d.file ? `Uploaded ${ago(d.at!)} · only you and FreshNest admins can see it` : DOC[d.kind][1]}</div></div>
            <label className="btn ghost sm" style={{ cursor: "pointer" }}>{busy === d.kind ? "Uploading…" : d.file ? "Replace" : "Upload photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(d.kind, f); e.target.value = ""; }} /></label>
          </div>
        ))}
      </div>
    </div>
  );
}

const KINDS: [string, string][] = [["PRICE_CHANGED", "Asked for a lower price after the deal"], ["NO_SHOW", "Did not come / did not hand over"], ["WRONG_QUALITY", "Quality not as described"], ["RUDE", "Rude behaviour"], ["OTHER", "Other"]];

/** Report someone you traded with in this deal. */
export function ReportButton({ dealId, people }: { dealId: string; people: { id: string; name: string; role: string }[] }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ againstId: people[0]?.id ?? "", kind: "PRICE_CHANGED", details: "" });
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  if (!people.length) return null;
  async function send() {
    try { await api("/reports", { body: { dealId, ...f } }); toast("Report sent. An admin will look at it; you will be told the outcome."); setOpen(false); }
    catch (e) { if (e instanceof ApiError) { toast(e.message); setFields(e.fields); } }
  }
  return (
    <>
      <button className="btn ghost sm" onClick={() => setOpen(true)}>Report a problem</button>
      {open && (
        <Modal title="Report a problem" onClose={() => setOpen(false)} actions={<button className="btn warn" disabled={f.details.trim().length < 10} onClick={send}>Send report</button>}>
          <div className="field"><label htmlFor="ra">Who</label><select id="ra" value={f.againstId} onChange={(e) => setF({ ...f, againstId: e.target.value })}>{people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}</select></div>
          <div className="field"><label htmlFor="rk">What happened</label><select id="rk" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="rd">Details</label><textarea id="rd" rows={3} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} placeholder="What happened, when, and anything that helps the admin check it. Bangla or English." /><FieldErr e={fields.details} /></div>
          <p className="small muted">Reports are private. The other person is not told who reported them.</p>
        </Modal>
      )}
    </>
  );
}

/** The person a review is about can report it as fake or abusive. */
export function ReportReview({ reviewId }: { reviewId: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  async function send() {
    try { await api("/reports", { body: { reviewId, kind: "FAKE_REVIEW", details } }); toast("Thank you. An admin will check this review."); setOpen(false); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed."); }
  }
  return (
    <>
      <a href="#" className="small" onClick={(e) => { e.preventDefault(); setOpen(true); }}>Report this review</a>
      {open && (
        <Modal title="Report this review" onClose={() => setOpen(false)} actions={<button className="btn warn" disabled={details.trim().length < 10} onClick={send}>Send</button>}>
          <div className="field"><label htmlFor="rr">Why is it fake or abusive?</label><textarea id="rr" rows={3} placeholder="You can write in Bangla or English" value={details} onChange={(e) => setDetails(e.target.value)} /></div>
          <p className="small muted">An admin can hide the review. Honest negative reviews stay.</p>
        </Modal>
      )}
    </>
  );
}
