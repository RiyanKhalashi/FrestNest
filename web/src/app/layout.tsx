import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "@/styles/base.css";
import "@/styles/transporter.css";
import "@/styles/admin.css";
import "./globals.css";
import "@/styles/theme.css";
import "@/styles/landing.css";

// One family for headings and text (premium design, 2026-11-20); mono for codes and number plates
const sans = Plus_Jakarta_Sans({ variable: "--f-sans", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const mono = IBM_Plex_Mono({ variable: "--f-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "FreshNest",
  description: "Farm-gate marketplace connecting farmers, dealers and transport providers in Bangladesh.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
