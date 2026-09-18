import { NextResponse } from "next/server";

/**
 * Server-only base URL for the AXISMCP backend.
 * Prefer API_BASE (server-only) in production; NEXT_PUBLIC_API_BASE is kept as
 * a fallback so local/dev environments keep working unchanged.
 */
export const API_BASE = (
  process.env.API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://api.handlebid.lol"
).replace(/\/+$/, "");

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Call the upstream API with a hard timeout so a hung backend can never pin a
 * serverless invocation. Callers must handle the thrown Error.
 */
export async function upstreamFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/** JSON response that is never cached by browsers, CDNs, or Next.js. */
export function noStoreJson(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body ?? {}, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", ...headers },
  });
}

export function upstreamError(err: unknown) {
  const message =
    err instanceof Error && err.message
      ? err.name === "TimeoutError"
        ? "Upstream API timed out"
        : err.message
      : "Upstream API unreachable";
  return noStoreJson({ message }, 502);
}