import { NextRequest } from "next/server";
import { parseErpAuthPayload } from "@/lib/erpPayload";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";
import { noStoreJson, upstreamError, upstreamFetch } from "@/lib/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/auth/login — additional key for an existing ERP account.
 * Same hardening as /api/auth/signup (validated payload, same-origin, throttled).
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return noStoreJson({ message: "Cross-site requests are not allowed." }, 403);
  }

  const limit = await rateLimit(`login:${clientIp(req)}`, 10, 60);
  if (!limit.ok) {
    return noStoreJson(
      { message: "Too many attempts. Please wait a minute and try again." },
      429,
      { "Retry-After": String(limit.retryAfter || 60) }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = parseErpAuthPayload(body, "mcp");
  if (!parsed.ok) {
    return noStoreJson({ message: parsed.error }, 400);
  }

  try {
    const res = await upstreamFetch("/v1/auth/login", {
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
