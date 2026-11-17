"use client";
import Link from "next/link";
import { useState } from "react";
import { api, HOME, ApiError, type User, type Role } from "@/lib/api";
import { AuthArt } from "@/components/AuthArt";
import { PlacePicker } from "@/components/PlacePicker";

const ROLES: [Role, string, string][] = [
  ["FARMER", "Farmer", "Start selling right away"],
  ["DEALER", "Dealer", "Admin verifies you first"],
  ["TRANSPORTER", "Transporter", "Admin verifies you first"],
];

export default function RegisterPage() {
  const [role, setRole] = useState<Role>("FARMER");
  const [f, setF] = useState({ name: "", phone: "", password: "", village: "", businessName: "" });
  const [upazilaId, setUpazilaId] = useState(0);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const fe = (k: string) => fields[k]?.[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setFields({});
    try {
      const { user } = await api<{ user: User }>("/auth/register", { body: { role, ...f, upazilaId, village: f.village || undefined, businessName: f.businessName || undefined } });
      window.location.href = HOME[user.role];
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFields(err.fields); } else setError("Could not reach the server.");
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <AuthArt />
      <div className="auth-form">
        <form className="auth-card" onSubmit={submit}>
          <h1>Create your account</h1>
          <p className="sub">Choose how you will use FreshNest.</p>
          <div className="rolepick">
            {ROLES.map(([r, label, hint]) => (
              <label key={r}><input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} /><span><b>{label}</b><small>{hint}</small></span></label>
            ))}
          </div>
          <div className="field"><label htmlFor="nm">Full name</label><input id="nm" value={f.name} onChange={set("name")} className={fe("name") ? "bad" : ""} />{fe("name") && <span className="err">{fe("name")}</span>}</div>
          {role !== "FARMER" && (
            <div className="field"><label htmlFor="bn">{role === "DEALER" ? "Shop or business name" : "Transport company name"}</label><input id="bn" value={f.businessName} onChange={set("businessName")} className={fe("businessName") ? "bad" : ""} />{fe("businessName") && <span className="err">{fe("businessName")}</span>}</div>
          )}
          <div className="row">
            <div className="field"><label htmlFor="ph">Phone number</label><input id="ph" type="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={set("phone")} className={fe("phone") ? "bad" : ""} />{fe("phone") && <span className="err">{fe("phone")}</span>}</div>
            <div className="field"><label htmlFor="pw">Password</label><input id="pw" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} className={fe("password") ? "bad" : ""} />{fe("password") ? <span className="err">{fe("password")}</span> : <small>At least 8 characters</small>}</div>
          </div>
          <PlacePicker value={upazilaId} onChange={setUpazilaId} bad={!!fe("upazilaId")} />
          {role === "FARMER" && <div className="field"><label htmlFor="vl">Village <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input id="vl" value={f.village} onChange={set("village")} /></div>}
          {role !== "FARMER" && <div className="note" style={{ marginBottom: 14 }}>After you sign up, upload your documents from your profile. {role === "DEALER" ? "Dealers need NID and trade licence." : "Transporters need NID, driving licence and each vehicle's registration."} An admin checks them, usually within a day.</div>}
          {error && <div className="note bad" style={{ marginBottom: 14 }}>{error}</div>}
          <button className="btn" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
          <p className="alt">Already registered? <Link href="/login">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
