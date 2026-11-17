import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "@/styles/base.css";
import "@/styles/transporter.css";
import "@/styles/admin.css";
import "./globals.css";

const display = Fraunces({ variable: "--f-display", subsets: ["latin"], weight: ["500", "600"] });
const sans = IBM_Plex_Sans({ variable: "--f-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = IBM_Plex_Mono({ variable: "--f-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "FreshNest",
  description: "Farm-gate marketplace connecting farmers, dealers and transport providers in Bangladesh.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
