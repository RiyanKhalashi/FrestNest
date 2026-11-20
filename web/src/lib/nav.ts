import type { Role, Permission } from "./api";

export interface NavItem { href: string; label: string; code: string; perm?: Permission | "SUPER"; group?: string; mode?: "simple" | "full" } // mode: shown only in simple / full admin mode

// Screen codes match the agreed prototype (F1…, D1…, T1…, A1…)
export const NAV: Record<Role, NavItem[]> = {
  FARMER: [
    { href: "/farmer", label: "Home", code: "F1" },
    { href: "/farmer/create", label: "Create listing", code: "F2" },
    { href: "/farmer/sales", label: "My Sales", code: "F3" },
    { href: "/farmer/profile", label: "Profile & reviews", code: "F4" },
  ],
  DEALER: [
    { href: "/dealer", label: "Home", code: "D1" },
    { href: "/dealer/market", label: "Marketplace", code: "D2" },
    { href: "/dealer/purchases", label: "My Purchases", code: "D3" },
    { href: "/dealer/profile", label: "Profile & reviews", code: "D4" },
  ],
  TRANSPORTER: [
    { href: "/transporter", label: "Home", code: "T1" },
    { href: "/transporter/deals", label: "Find deals", code: "T2" },
    { href: "/transporter/trips", label: "My trips", code: "T3" },
    { href: "/transporter/vehicles", label: "My vehicles", code: "T4" },
    { href: "/transporter/profile", label: "Profile & reviews", code: "T5" },
  ],
  ADMIN: [
    { href: "/admin", label: "Overview", code: "A1" },
    { href: "/admin/verification", label: "Verification", code: "A2", perm: "VERIFY", group: "Queues" },
    { href: "/admin/failures", label: "Delivery failures", code: "A3", perm: "DEALS", group: "Queues" },
    { href: "/admin/cases", label: "Cases", code: "A4", group: "Queues" },
    { href: "/admin/users", label: "Users", code: "A5", group: "Queues" },
    { href: "/admin/business", label: "Business", code: "A10", perm: "ANALYTICS", group: "Business model", mode: "simple" },
    { href: "/admin/products", label: "Products & seasons", code: "A6", perm: "SUPER", group: "Platform", mode: "full" },
    { href: "/admin/announcements", label: "Announcements", code: "A7", perm: "ANNOUNCE", group: "Platform", mode: "full" },
    { href: "/admin/analytics", label: "Analytics", code: "A8", perm: "ANALYTICS", group: "Platform", mode: "full" },
    { href: "/admin/team", label: "Admin team & settings", code: "A9", perm: "SUPER", group: "Platform", mode: "full" },
  ],
};

export const BRAND_SUB: Record<Role, string> = { FARMER: "Farm-gate market", DEALER: "Farm-gate market", TRANSPORTER: "Transport desk", ADMIN: "Admin office" };
export const BODY_CLASS: Record<Role, string> = { FARMER: "", DEALER: "", TRANSPORTER: "tp", ADMIN: "ad" };
