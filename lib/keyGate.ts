import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Key-generation gate: a Supabase session (Google / GitHub / email) is
 * required before any ERP key can be minted.
 * @returns null when signed in (caller proceeds), else the sign-in URL to push.
 */
export async function keyGenGate(
  supabase: SupabaseClient,
  pathname: string
): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return null;
  const safePath = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/keys";
  return `/signin?next=${encodeURIComponent(safePath)}&link=1`;
}

/** Validate a `next` return path (open-redirect hardening for sign-in flows). */
export function safeNextPath(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/keys";
}
