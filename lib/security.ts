/**
 * Server-only security primitives for route handlers.
 *
 * Rate limiting is in-memory per instance by default (best effort on
 * serverless). Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to get
 * a shared, cluster-wide counter — recommended in production.
 */

type LimitResult = { ok: boolean; remaining: number; retryAfter: number };

const memory = new Map<string, { count: number; reset: number }>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  // Use forEach instead of for-of to avoid downlevelIteration requirement
  memory.forEach((v, k) => {
    if (v.reset <= now) memory.delete(k);
  });
}

function memoryLimit(key: string, max: number, windowMs: number): LimitResult {
  const now = Date.now();
  sweep(now);
  const entry = memory.get(key);
  if (!entry || entry.reset <= now) {
    memory.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > max) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  return { ok: true, remaining: max - entry.count, retryAfter: 0 };
}

async function upstashLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<LimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec), "NX"],
        ["TTL", key],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: number | string | null }[];
    const count = Number(data?.[0]?.result ?? 0);
    const ttl = Number(data?.[2]?.result ?? windowSec);
    if (!Number.isFinite(count) || count <= 0) return null;
    if (count > max) {
      return { ok: false, remaining: 0, retryAfter: ttl > 0 ? ttl : windowSec };
    }
    return { ok: true, remaining: Math.max(0, max - count), retryAfter: 0 };
  } catch {
    return null; // network hiccup → fall back to memory, never fail open silently
  }
}

/** Throttle by an opaque key (usually `ip:bucket`). */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<LimitResult> {
  const shared = await upstashLimit(`ratelimit:${key}`, max, windowSec);
  if (shared) return shared;
  return memoryLimit(key, max, windowSec * 1000);
}

/** Best-effort caller identity behind a proxy/CDN. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 64) || "unknown";
  return (req.headers.get("x-real-ip") || "unknown").slice(0, 64);
}

/**
 * CSRF / cross-site guard for state-changing routes.
 * Browsers always send Origin on cross-origin POSTs, and `Sec-Fetch-Site`
 * when they support it — either check failing means the request is foreign.
 */
export function isSameOrigin(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin form/non-browser client

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = req.headers.get("host");
  if (host && originHost === host) return true;

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      if (new URL(site).host === originHost) return true;
    } catch {
      /* misconfigured site url — fall through to deny */
    }
  }
  return false;
}

/**
 * API keys are opaque tokens we forward into an outbound header.
 * Rejecting anything outside this charset blocks header/URL injection and
 * turns obvious garbage away before it reaches the backend.
 */
export function isValidApiKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_.-]{8,200}$/.test(value);
}

export function readApiKey(req: Request): string {
  const raw = req.headers.get("X-API-Key") ?? req.headers.get("x-api-key") ?? "";
  return isValidApiKey(raw) ? raw : "";
}