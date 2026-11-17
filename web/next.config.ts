import type { NextConfig } from "next";

const API = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Same-origin API: the browser calls /api/*, Next forwards it to the Express server (keeps the session cookie first-party)
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
