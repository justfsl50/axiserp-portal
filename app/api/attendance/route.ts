import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE =
  process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "https://api.handlebid.lol";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("X-API-Key") ?? req.headers.get("x-api-key") ?? "";
  if (!apiKey) {
    return NextResponse.json({ message: "Missing X-API-Key" }, { status: 401 });
  }
  try {
    const res = await fetch(`${API_BASE}/v1/attendance`, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Upstream API unreachable" },
      { status: 502 }
    );
  }
}
