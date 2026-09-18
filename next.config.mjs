/** @type {import('next').NextConfig} */

/**
 * Fail the build loudly when a required environment variable is missing,
 * instead of shipping a broken deploy. Override with SKIP_ENV_VALIDATION=1.
 */
const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
if (!process.env.SKIP_ENV_VALIDATION) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Copy .env.example to .env.local (local) or set them in your host's dashboard (production).`
    );
  }
}

const isDev = process.env.NODE_ENV !== "production";

function toOrigin(value, fallback) {
  try {
    return new URL(value || "").origin;
  } catch {
    return fallback;
  }
}

const supabaseOrigin = toOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://*.supabase.co");
const apiOrigin = toOrigin(
  process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE,
  "https://api.handlebid.lol"
);

const csp = [
  "default-src 'self'",
  // Next.js hydrates through inline scripts; a nonce pipeline is out of scope
  // for a static-first portal, so inline is allowed but external scripts are not.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${apiOrigin} wss://*.supabase.co`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // Never let a CDN or browser cache credential-bearing API responses.
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
