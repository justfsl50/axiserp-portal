import { NextRequest } from "next/server";
import { clientIp, rateLimit, readApiKey } from "@/lib/security";
import { noStoreJson, upstreamError, upstreamFetch } from "@/lib/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/today — the caller's own schedule (auth: X-API-Key). */
export async function GET(req: NextRequest) {
  const apiKey = readApiKey(req);
  if (!apiKey) {
    return noStoreJson({ message: "Missing or malformed X-API-Key" }, 401);
  }

  const limit = await rateLimit(`data:${clientIp(req)}`, 120, 60);
  if (!limit.ok) {
    return noStoreJson({ message: "Too many requests. Slow down." }, 429, {
      "Retry-After": String(limit.retryAfter || 60),
    });
  }

  try {
    const res = await upstreamFetch("/v1/today", {
      headers: { "X-API-Key": apiKey },
    });
    const data = await res.json().catch(() => null);
    return noStoreJson(data ?? {}, res.status);
  } catch (err) {
    return upstreamError(err);
  }
}
