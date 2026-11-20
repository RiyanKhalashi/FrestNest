"use client";
import Link from "next/link";
import { useState } from "react";
import { api, HOME, ApiError, type User } from "@/lib/api";
import { AuthFrame } from "@/components/AuthFrame";
import { Icon } from "@/components/Icon";

const DEMO: [string, string][] = [["Farmer", "01712345678"], ["Dealer", "01811000001"], ["Transporter", "01911000001"], ["Admin", "01700000001"]];

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
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
    <AuthFrame>
      <form onSubmit={submit}>
        <h1>Welcome back</h1>
        <p className="au-lead">Log in with your phone number.</p>
        <div className="au-f"><label htmlFor="ph">Phone number</label><input id="ph" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
        <div className="au-f"><label htmlFor="pw">Password</label>
          <div className="au-pw"><input id="pw" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}><Icon name="eye" /></button></div></div>
        {error && <div className="note bad" style={{ marginBottom: 14 }}>{error}</div>}
        <button className="au-btn" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
        <p className="au-alt">New to FreshNest? <Link href="/register">Create an account</Link></p>
      </form>
      {process.env.NODE_ENV !== "production" && (
        <div className="au-demo"><span>Demo (password freshnest123):</span>
          {DEMO.map(([l, p]) => <button type="button" key={p} onClick={() => { setPhone(p); setPassword("freshnest123"); }}>{l}</button>)}
        </div>
      )}
    </AuthFrame>
  );
}
