import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.handlebid.lol";

function passthroughKey(req: NextRequest) {
  return req.headers.get("X-API-Key") ?? req.headers.get("x-api-key") ?? "";
}

export async function GET(req: NextRequest) {
  const apiKey = passthroughKey(req);
  if (!apiKey) {
    return NextResponse.json({ message: "Missing X-API-Key" }, { status: 401 });
  }
  try {
    const res = await fetch(`${API_BASE}/v1/keys`, {
      headers: { "X-API-Key": apiKey },
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
