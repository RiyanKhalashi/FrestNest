import type { Role, Permission } from "./api";

export interface NavItem { href: string; label: string; code: string; icon?: string; perm?: Permission | "SUPER"; group?: string; mode?: "simple" | "full" } // mode: shown only in simple / full admin mode

// Screen codes match the agreed prototype (F1…, D1…, T1…, A1…)
export const NAV: Record<Role, NavItem[]> = {
  FARMER: [
    { href: "/farmer", label: "Home", code: "F1", icon: "home" },
    { href: "/farmer/create", label: "Create listing", code: "F2", icon: "plus" },
    { href: "/farmer/sales", label: "My Sales", code: "F3", icon: "box" },
    { href: "/farmer/profile", label: "Profile & reviews", code: "F4", icon: "user" },
  ],
  DEALER: [
    { href: "/dealer", label: "Home", code: "D1", icon: "home" },
    { href: "/dealer/market", label: "Marketplace", code: "D2", icon: "cart" },
    { href: "/dealer/purchases", label: "My Purchases", code: "D3", icon: "box" },
    { href: "/dealer/profile", label: "Profile & reviews", code: "D4", icon: "user" },
  ],
  TRANSPORTER: [
    { href: "/transporter", label: "Home", code: "T1", icon: "home" },
    { href: "/transporter/deals", label: "Find deals", code: "T2", icon: "route" },
    { href: "/transporter/trips", label: "My trips", code: "T3", icon: "truck" },
    { href: "/transporter/vehicles", label: "My vehicles", code: "T4", icon: "box" },
    { href: "/transporter/profile", label: "Profile & reviews", code: "T5", icon: "user" },
  ],
  ADMIN: [
    { href: "/admin", label: "Overview", code: "A1", icon: "home" },
    { href: "/admin/verification", label: "Verification", code: "A2", icon: "shield", perm: "VERIFY", group: "Queues" },
    { href: "/admin/failures", label: "Delivery failures", code: "A3", icon: "alert", perm: "DEALS", group: "Queues" },
    { href: "/admin/cases", label: "Cases", code: "A4", icon: "gavel", group: "Queues" },
    { href: "/admin/users", label: "Users", code: "A5", icon: "users", group: "Queues" },
    { href: "/admin/business", label: "Business", code: "A10", icon: "brief", perm: "ANALYTICS", group: "Business model", mode: "simple" },
    { href: "/admin/products", label: "Products & seasons", code: "A6", icon: "list", perm: "SUPER", group: "Platform", mode: "full" },
    { href: "/admin/announcements", label: "Announcements", code: "A7", icon: "megaphone", perm: "ANNOUNCE", group: "Platform", mode: "full" },
    { href: "/admin/analytics", label: "Analytics", code: "A8", icon: "chart", perm: "ANALYTICS", group: "Platform", mode: "full" },
    { href: "/admin/team", label: "Admin team & settings", code: "A9", icon: "settings", perm: "SUPER", group: "Platform", mode: "full" },
  ],
};

export const BRAND_SUB: Record<Role, string> = { FARMER: "", DEALER: "", TRANSPORTER: "Transport desk", ADMIN: "Admin office" };
export const BODY_CLASS: Record<Role, string> = { FARMER: "fm", DEALER: "dl", TRANSPORTER: "tp", ADMIN: "ad" };
