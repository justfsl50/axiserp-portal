import { NextRequest } from "next/server";
import { parseErpAuthPayload } from "@/lib/erpPayload";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";
import { noStoreJson, upstreamError, upstreamFetch } from "@/lib/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/auth/signup — first key for a new ERP account.
 *
 * This endpoint verifies college ERP credentials, so it is treated as
 * sensitive: same-origin only, validated payload, and rate limited per IP to
 * stop credential-stuffing through our origin.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return noStoreJson({ message: "Cross-site requests are not allowed." }, 403);
  }

  const limit = await rateLimit(`signup:${clientIp(req)}`, 8, 60);
  if (!limit.ok) {
    return noStoreJson(
      { message: "Too many attempts. Please wait a minute and try again." },
      429,
      { "Retry-After": String(limit.retryAfter || 60) }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = parseErpAuthPayload(body, "web");
  if (!parsed.ok) {
    return noStoreJson({ message: parsed.error }, 400);
  }

  try {
    const res = await upstreamFetch("/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const data = await res.json().catch(() => null);
    return noStoreJson(data ?? {}, res.status);
  } catch (err) {
    return upstreamError(err);
  }
}
