import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import { SITE } from "@/config/site";
import "./globals.css";

// Fonts are downloaded once at build time and served from this origin (next/font).
// No request ever goes to Google from a visitor's browser - required for GDPR (LG München I, 3 O 17493/20).
const sans = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${SITE.name} - ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
