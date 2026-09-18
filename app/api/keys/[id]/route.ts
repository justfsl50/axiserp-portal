import { NextRequest } from "next/server";
import { isValidBackendId } from "@/lib/erpPayload";
import { clientIp, isSameOrigin, rateLimit, readApiKey } from "@/lib/security";
import { noStoreJson, upstreamError, upstreamFetch } from "@/lib/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DELETE /api/keys/{id} — revoke one key (auth: X-API-Key).
 *
 * `id` is interpolated into the upstream URL, so it is strictly validated as a
 * numeric backend ID. Without this, an encoded segment such as `1%2F..%2Faccount%2Fforget`
 * would be decoded into the path and could reach an unintended upstream route.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params?.id ?? "";
  if (!isValidBackendId(id)) {
    return noStoreJson({ message: "Invalid key id." }, 400);
  }

  if (!isSameOrigin(req)) {
    return noStoreJson({ message: "Cross-site requests are not allowed." }, 403);
  }

  const apiKey = readApiKey(req);
  if (!apiKey) {
    return noStoreJson({ message: "Missing or malformed X-API-Key" }, 401);
  }

  const limit = await rateLimit(`revoke:${clientIp(req)}`, 20, 60);
  if (!limit.ok) {
    return noStoreJson({ message: "Too many requests. Slow down." }, 429, {
      "Retry-After": String(limit.retryAfter || 60),
    });
  }

  try {
    const res = await upstreamFetch(`/v1/keys/${id}`, {
      method: "DELETE",
      headers: { "X-API-Key": apiKey },
    });
    const data = await res.json().catch(() => ({}));
    return noStoreJson(data, res.status);
  } catch (err) {
    return upstreamError(err);
  }
}
