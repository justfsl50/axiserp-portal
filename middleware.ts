import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Fast path: getSession reads cookies only (no network round-trip).
  // getUser() validates over the network and adds ~100-500ms to EVERY
  // navigation under matcher — that was the main nav slowness.
  await supabase.auth.getSession();

  return response;
}

export const config = {
  // Only refresh where session cookies actually matter.
  // Marketing pages (/, /docs) skip middleware entirely → instant nav.
  matcher: ["/keys", "/auth/:path*"],
};
