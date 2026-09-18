import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelGrid } from "geist/font/pixel";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AXISMCP — Developer API for College ERP",
    template: "%s — AXISMCP",
  },
  description:
    "Self-service API portal connecting your college ERP to Claude, Cursor, terminal, and custom apps.",
  applicationName: "AXISMCP",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "AXISMCP",
    title: "AXISMCP — Developer API for College ERP",
    description:
      "Self-service API portal connecting your college ERP to Claude, Cursor, terminal, and custom apps.",
  },
  twitter: {
    card: "summary",
    title: "AXISMCP — Developer API for College ERP",
    description:
      "Self-service API portal connecting your college ERP to Claude, Cursor, terminal, and custom apps.",
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable} ${GeistPixelGrid.variable}`}>
      <body className="bg-[#09090b] text-zinc-100 font-arial antialiased">
        {/* Animated mesh gradient — shared across all pages */}
        <div className="animated-bg" />
        {/* CSS-only starfield — shared across all pages, sits above aurora */}
        <div className="starfield" aria-hidden="true" />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
