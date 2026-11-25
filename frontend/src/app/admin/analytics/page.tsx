"use client";
import { useState } from "react";
import { MarketTab, PlatformTab } from "@/components/admin/AdminAnalytics";

export default function Page() {
  const [tab, setTab] = useState<"market" | "ops">("market");
  return (
    <div className="viz-root">
      <div className="head"><div><h1>Analytics</h1><p>What sells where, down to the upazila, and how the platform runs. Built so agricultural companies can target seeds, fertiliser and services.</p></div><span className="code">Screen A8</span></div>
      <div className="tabbar" role="tablist"><button role="tab" aria-selected={tab === "market"} className={tab === "market" ? "on" : ""} onClick={() => setTab("market")}>Market by upazila</button><button role="tab" aria-selected={tab === "ops"} className={tab === "ops" ? "on" : ""} onClick={() => setTab("ops")}>Platform &amp; operations</button></div>
      {tab === "market" ? <MarketTab /> : <PlatformTab />}
    </div>
  );
}
