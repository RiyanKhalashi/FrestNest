"use client";
import Link from "next/link";
import { useState } from "react";
import { api, HOME, ApiError, type User } from "@/lib/api";
import { AuthArt } from "@/components/AuthArt";

const DEMO: [string, string][] = [["Farmer", "01712345678"], ["Dealer", "01811000001"], ["Transporter", "01911000001"], ["Admin", "01700000001"]];

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { user } = await api<{ user: User }>("/auth/login", { body: { phone, password } });
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith(HOME[user.role]) ? next : HOME[user.role];
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <AuthArt />
      <div className="auth-form">
        <form className="auth-card" onSubmit={submit}>
          <h1>Sign in</h1>
          <p className="sub">Use the phone number you registered with.</p>
          <div className="field"><label htmlFor="ph">Phone number</label><input id="ph" type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
          <div className="field"><label htmlFor="pw">Password</label><input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {error && <div className="note bad" style={{ marginBottom: 14 }}>{error}</div>}
          <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <p className="alt">New to FreshNest? <Link href="/register">Create an account</Link></p>
          {process.env.NODE_ENV !== "production" && (
            <div className="demo">Demo accounts (password freshnest123):<br />
              {DEMO.map(([l, p]) => <button type="button" key={p} onClick={() => { setPhone(p); setPassword("freshnest123"); }}>{l}</button>)}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
