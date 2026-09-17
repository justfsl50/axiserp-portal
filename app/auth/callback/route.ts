import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/keys";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/keys";
  const link = searchParams.get("link");
  const dest = link ? `${next}${next.includes("?") ? "&" : "?"}link=1` : next;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth_failed`);
}
