"use client";
import { useEffect } from "react";
import { api, HOME, type User } from "@/lib/api";

// Entry: signed-in users go to their dashboard, everyone else to sign in.
export default function Index() {
  useEffect(() => {
    api<{ user: User }>("/auth/me").then((r) => window.location.replace(HOME[r.user.role])).catch(() => window.location.replace("/login"));
  }, []);
  return <div className="boot">Loading FreshNest…</div>;
}
