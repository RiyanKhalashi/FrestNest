import type { Metadata, Viewport } from "next";
import WakeNotice from "@/components/layout/WakeNotice";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "@/styles/base.css";
import "@/styles/transporter.css";
import "@/styles/admin.css";
import "./globals.css";
import "@/styles/theme.css";
import "@/styles/landing.css";
import "@/styles/home.css";

// One family for headings and text (premium design, 2026-11-20); mono for codes and number plates
const sans = Plus_Jakarta_Sans({ variable: "--f-sans", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const mono = IBM_Plex_Mono({ variable: "--f-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "FreshNest",
  description: "Agricultural marketplace connecting farmers, dealers and transport providers in Bangladesh.",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0B3B24" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}<WakeNotice /></body>
    </html>
  );
}
