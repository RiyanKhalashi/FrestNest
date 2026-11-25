"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

/* ---------- toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(""), 3600); }, []);
  return <ToastCtx.Provider value={show}>{children}{msg && <div className="toast" role="status">{msg}</div>}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

/* ---------- modal ---------- */
export function Modal({ title, children, onClose, actions }: { title: string; children: React.ReactNode; onClose: () => void; actions?: React.ReactNode }) {
  return (
    <div className="veil" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        <div className="pb">{children}</div>
        <div className="foot"><button className="btn ghost" onClick={onClose}>Close</button>{actions}</div>
      </div>
    </div>
  );
}

/* ---------- field error ---------- */
export function FieldErr({ e }: { e?: string[] | string }) {
  const m = Array.isArray(e) ? e[0] : e;
  return m ? <span className="err">{m}</span> : null;
}

/* ---------- product icon (line art from the prototype) ---------- */
const ICON_FILL: Record<string, string> = { Tomato: "#f6d9cf", Potato: "#efe4c8", Cauliflower: "#d9e8cd", Brinjal: "#e3d6ef", "Green chili": "#dcebc9", "Lal shak": "#f3d3d8", Strawberry: "#f6d0d0", Mango: "#f6e3b4" };
export function ProductIcon({ name, size = 26 }: { name: string; size?: number }) {
  const fill = ICON_FILL[name] ?? "#e3ecd8";
  const s = { width: size, height: size, flex: "none" as const };
  const common = { fill: "none", stroke: "#24452f", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "Potato": return <svg viewBox="0 0 24 24" style={s} {...common}><ellipse cx="12" cy="12.5" rx="8.2" ry="6" transform="rotate(-18 12 12.5)" fill={fill} /><path d="M9 11h.01M13.5 10h.01M14.5 14.5h.01" /></svg>;
    case "Cauliflower": return <svg viewBox="0 0 24 24" style={s} {...common}><path d="M4.5 12.5c.6 5 3.8 7.5 7.5 7.5s6.9-2.5 7.5-7.5z" fill="#d9e8cd" /><path d="M6.5 12.5a3 3 0 0 1 2.5-4.5 3 3 0 0 1 6 0 3 3 0 0 1 2.5 4.5" fill="#fbf7ea" /></svg>;
    case "Brinjal": return <svg viewBox="0 0 24 24" style={s} {...common}><path d="M15 6c-4 0-9 4-9 9a4 4 0 0 0 7 2.5c2.5-3 4-6 4-9.5" fill={fill} /><path d="M15 6c1-1 2-1.5 3-1.5M15 6l2 2.5" /></svg>;
    case "Green chili": return <svg viewBox="0 0 24 24" style={s} {...common}><path d="M16 6c-1 7-5 12-11 13 5-3 7-7 8-13z" fill={fill} /><path d="M16 6c.5-1.5 1.5-2.5 3-2.5" /></svg>;
    case "Lal shak": return <svg viewBox="0 0 24 24" style={s} {...common}><path d="M12 20v-8" /><path d="M12 13c-4 0-7-3-7-7 4 0 7 3 7 7zM12 12c0-4 3-7 7-7 0 4-3 7-7 7z" fill={fill} /></svg>;
    default: return <svg viewBox="0 0 24 24" style={s} {...common}><circle cx="12" cy="13.5" r="7" fill={fill} /><path d="M12 7.5V4.5M12 7.5l-3-1.6M12 7.5l3-1.6" /></svg>;
  }
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="soon" style={{ padding: 22 }}><b>{title}</b>{children}</div>;
}
