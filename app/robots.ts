import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private consoles and credential-bearing endpoints are never crawlable.
        disallow: ["/keys", "/settings", "/api/", "/signin"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}