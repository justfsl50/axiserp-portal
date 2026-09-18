import { NextRequest } from "next/server";
import { clientIp, rateLimit, readApiKey } from "@/lib/security";
import { noStoreJson, upstreamError, upstreamFetch } from "@/lib/upstream";

// Never cache: the response is derived from a caller-supplied secret.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/keys — list the caller's own keys (auth: X-API-Key). */
export async function GET(req: NextRequest) {
  const apiKey = readApiKey(req);
  if (!apiKey) {
    return noStoreJson({ message: "Missing or malformed X-API-Key" }, 401);
  }

  // Throttle per IP+key so the proxy cannot be used as a key-guessing oracle.
  const limit = await rateLimit(`keys:${clientIp(req)}`, 60, 60);
  if (!limit.ok) {
    return noStoreJson({ message: "Too many requests. Slow down." }, 429, {
      "Retry-After": String(limit.retryAfter || 60),
    });
  }

  try {
    const res = await upstreamFetch("/v1/keys", {
      headers: { "X-API-Key": apiKey },
    });
    const data = await res.json().catch(() => null);
    return noStoreJson(data ?? {}, res.status);
  } catch (err) {
    return upstreamError(err);
  }
}
