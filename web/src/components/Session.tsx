"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, type User } from "@/lib/api";

interface SessionValue { user: User | null; unread: number; loading: boolean; refresh: () => Promise<void>; setUser: (u: User) => void }
const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { const r = await api<{ user: User; unread: number }>("/auth/me"); setUser(r.user); setUnread(r.unread); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return <Ctx.Provider value={{ user, unread, loading, refresh, setUser }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside SessionProvider");
  return v;
}
