import { NextRequest } from "next/server";
import { clientIp, isSameOrigin, rateLimit, readApiKey } from "@/lib/security";
import { noStoreJson, upstreamError, upstreamFetch } from "@/lib/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/account/forget — irreversible: invalidates every live key.
 * Same-origin only, throttled, and requires a well-formed key.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return noStoreJson({ message: "Cross-site requests are not allowed." }, 403);
  }

  const apiKey = readApiKey(req);
  if (!apiKey) {
    return noStoreJson({ message: "Missing or malformed X-API-Key" }, 401);
  }

  const limit = await rateLimit(`forget:${clientIp(req)}`, 5, 300);
  if (!limit.ok) {
    return noStoreJson({ message: "Too many requests. Slow down." }, 429, {
      "Retry-After": String(limit.retryAfter || 300),
    });
  }

  try {
    const res = await upstreamFetch("/v1/account/forget", {
      method: "POST",
      headers: { "X-API-Key": apiKey },
    });
    const data = await res.json().catch(() => ({}));
    return noStoreJson(data, res.status);
  } catch (err) {
    return upstreamError(err);
  }
}
