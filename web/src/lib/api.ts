// Small fetch wrapper for the FreshNest API (proxied to Express via next.config rewrites).
export type Role = "FARMER" | "DEALER" | "TRANSPORTER" | "ADMIN";
export type Status = "ACTIVE" | "PENDING" | "REUPLOAD" | "REJECTED" | "SUSPENDED" | "BANNED";
export type Permission = "VERIFY" | "DEALS" | "REPORTS" | "ANNOUNCE" | "ANALYTICS";

export interface User {
  id: string;
  role: Role;
  phone: string;
  name: string;
  status: Status;
  businessName: string | null;
  village: string | null;
  partnerOffers: boolean;
  isSuperAdmin: boolean;
  permissions: Permission[];
  suspendedUntil: string | null;
  statusReason: string | null;
  district: { id: number; name: string } | null;
  upazila: { id: number; name: string } | null;
  createdAt: string;
}

export interface District { id: number; name: string; nameBn: string | null; upazilas: { id: number; name: string }[] }

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields: Record<string, string[] | undefined> = {}) { super(message); }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch("/api" + path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "content-type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong.", res.status, data.fields);
  return data as T;
}

export const HOME: Record<Role, string> = { FARMER: "/farmer", DEALER: "/dealer", TRANSPORTER: "/transporter", ADMIN: "/admin" };
export const ROLE_LABEL: Record<Role, string> = { FARMER: "Farmer", DEALER: "Dealer", TRANSPORTER: "Transport provider", ADMIN: "Admin" };
