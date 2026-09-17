import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelGrid } from "geist/font/pixel";
import "./globals.css";

export const metadata: Metadata = {
  title: "AXISERP — Developer API for College ERP",
  description: "Self-service API portal connecting your college ERP to Claude, Cursor, terminal, and custom apps.",
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
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
