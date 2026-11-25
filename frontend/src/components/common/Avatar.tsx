"use client";
import { useRef, useState } from "react";
import { ApiError, type User } from "@/lib/api";
import { shrink } from "@/lib/image";

/** Profile picture, or the first letter of the name when there is none. */
export function Avatar({ user, size = 38, label, className = "av" }: { user: Pick<User, "name" | "avatarUrl">; size?: number; label?: string; className?: string }) {
  const text = (label ?? user.name).trim().charAt(0).toUpperCase();
  return user.avatarUrl
    ? <img className={className + " has-img"} src={user.avatarUrl} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: "cover" }} />
    : <span className={className} style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>{text}</span>;
}

/** Profile page: big picture with Upload / Change / Remove. */
export function AvatarEditor({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function send(file: File | null) {
    setBusy(true); setErr("");
    try {
      let r: Response;
      if (file) { const fd = new FormData(); fd.append("photo", await shrink(file, 600)); r = await fetch("/api/profile/avatar", { method: "POST", body: fd, credentials: "include" }); }
      else r = await fetch("/api/profile/avatar", { method: "DELETE", credentials: "include" });
      const j = await r.json(); if (!r.ok) throw new ApiError(j.error, r.status);
      onSaved(j.user);
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Upload failed. Try again."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return (
    <div className="av-edit">
      <button type="button" className="av-pic" onClick={() => input.current?.click()} disabled={busy} aria-label="Change profile picture">
        <Avatar user={user} size={84} className="av-big" />
        <span className="cam" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg></span>
      </button>
      <div className="av-act">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Saving…" : user.avatarUrl ? "Change photo" : "Upload photo"}</button>
          {user.avatarUrl && <button type="button" className="btn ghost sm" onClick={() => send(null)} disabled={busy}>Remove</button>}
        </div>
        <small className="muted">JPG, PNG or WebP, up to 5 MB.</small>
        {err && <small style={{ color: "var(--red)" }}>{err}</small>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
    </div>
  );
}
