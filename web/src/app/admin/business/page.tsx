"use client";
// Business (simple admin mode): the business model in one place — upazila market report, company subscriptions, sponsored offers.
import { useState } from "react";
import { MarketTab, CompaniesPanel } from "@/components/adminAnalytics";
import { AnnouncementBoard } from "@/components/AnnouncementBoard";

type Tab = "report" | "companies" | "sponsored";
const TABS: [Tab, string][] = [["report", "Upazila market report"], ["companies", "Company subscriptions"], ["sponsored", "Sponsored offers"]];

export default function Page() {
  const [tab, setTab] = useState<Tab>("report");
  return (
    <div className="viz-root">
      <div className="head"><div><h1>Business</h1><p>How FreshNest earns: agri companies pay for upazila market reports, and can send sponsored offers to farmers who agreed to receive them.</p></div><span className="code">Screen A10</span></div>
      <div className="tabbar" role="tablist">
        {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>)}
      </div>
      {tab === "report" && <MarketTab showCompanies={false} />}
      {tab === "companies" && (
        <div className="grid">
          <div className="note">Revenue 1: a company picks the upazilas it sells in and pays monthly for that upazila&apos;s report (what sells, where, at what price). Companies see upazila totals only; farmer names only for farmers who allowed it.</div>
          <CompaniesPanel />
        </div>
      )}
      {tab === "sponsored" && (
        <div className="grid">
          <div className="note">Revenue 2: a company&apos;s offer is sent with a <b>Sponsored</b> label, only to farmers who switched on &ldquo;Agri partner offers&rdquo; in their profile.</div>
          <AnnouncementBoard sponsoredFirst />
        </div>
      )}
    </div>
  );
}
