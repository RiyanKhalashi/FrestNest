"use client";
import Link from "next/link";
import { useState } from "react";
import { api, HOME, ApiError, type User, type Role } from "@/lib/api";
import { AuthFrame } from "@/components/landing/AuthFrame";
import { PlacePicker } from "@/components/common/PlacePicker";
import { Icon } from "@/components/common/Icon";

const ROLES: [Role, string, string, string][] = [
  ["FARMER", "Farmer", "I grow and sell", "#157347"],
  ["DEALER", "Dealer", "I buy produce", "#2B5C8C"],
  ["TRANSPORTER", "Transporter", "I carry loads", "#BF5B0E"],
];

export default function RegisterPage() {
  const [role, setRole] = useState<Role>("FARMER");
  const [f, setF] = useState({ name: "", phone: "", password: "", village: "", businessName: "" });
  const [upazilaId, setUpazilaId] = useState(0);
  const [show, setShow] = useState(false);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const fe = (k: string) => fields[k]?.[0];
  const acc = ROLES.find((r) => r[0] === role)![3];

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
    <AuthFrame wide>
      <form onSubmit={submit} className="field-host">
        <h1>Create your account</h1>
        <p className="au-lead">Choose how you&apos;ll use FreshNest.</p>
        <div className="au-seg" role="group" aria-label="Your role">
          {ROLES.map(([r, label, hint, c]) => (
            <button type="button" key={r} aria-pressed={role === r} style={{ ["--acc" as string]: c }} onClick={() => setRole(r)}>{label}<small>{hint}</small></button>
          ))}
        </div>
        <div className="field"><label htmlFor="nm">Full name</label><input id="nm" placeholder="e.g. Karim Uddin" autoComplete="name" value={f.name} onChange={set("name")} className={fe("name") ? "bad" : ""} />{fe("name") && <span className="err">{fe("name")}</span>}</div>
        {role !== "FARMER" && (
          <div className="field"><label htmlFor="bn">{role === "DEALER" ? "Shop or business name" : "Transport company name"}</label><input id="bn" placeholder={role === "DEALER" ? "e.g. Hasan Traders" : "e.g. Bogura Logistics"} autoComplete="organization" value={f.businessName} onChange={set("businessName")} className={fe("businessName") ? "bad" : ""} />{fe("businessName") && <span className="err">{fe("businessName")}</span>}</div>
        )}
        <div className="row">
          <div className="field"><label htmlFor="ph">Phone number</label><input id="ph" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" autoComplete="tel" value={f.phone} onChange={set("phone")} className={fe("phone") ? "bad" : ""} />{fe("phone") && <span className="err">{fe("phone")}</span>}</div>
          <div className="field"><label htmlFor="pw">Password</label>
            <div className="au-pw"><input id="pw" type={show ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" value={f.password} onChange={set("password")} className={fe("password") ? "bad" : ""} />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}><Icon name="eye" /></button></div>
            {fe("password") && <span className="err">{fe("password")}</span>}</div>
        </div>
        <PlacePicker value={upazilaId} onChange={setUpazilaId} bad={!!fe("upazilaId")} />
        {role === "FARMER" && <div className="field"><label htmlFor="vl">Village <span className="muted" style={{ fontWeight: 500 }}>(optional)</span></label><input id="vl" placeholder="e.g. Mokamtola" value={f.village} onChange={set("village")} /></div>}
        {role !== "FARMER" && <div className="note" style={{ marginBottom: 16, display: "flex", gap: 10 }}><Icon name="info" /><span>After you sign up, upload your documents from your profile. {role === "DEALER" ? "Dealers need NID and trade licence." : "Transporters need NID, driving licence and each vehicle's registration."} An admin checks them, usually within a day.</span></div>}
        {error && <div className="note bad" style={{ marginBottom: 14 }}>{error}</div>}
        <button className="au-btn" disabled={busy} style={{ background: acc }}>{busy ? "Creating account…" : `Create ${role === "TRANSPORTER" ? "transporter" : role.toLowerCase()} account`}</button>
        <p className="au-alt">Already have an account? <Link href="/login">Log in</Link></p>
      </form>
    </AuthFrame>
  );
}
