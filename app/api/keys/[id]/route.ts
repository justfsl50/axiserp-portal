import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.handlebid.lol";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiKey = req.headers.get("X-API-Key") ?? req.headers.get("x-api-key") ?? "";
  if (!apiKey) {
    return NextResponse.json({ message: "Missing X-API-Key" }, { status: 401 });
  }
  try {
    const res = await fetch(`${API_BASE}/v1/keys/${params.id}`, {
      method: "DELETE",
      headers: { "X-API-Key": apiKey },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Upstream API unreachable" },
      { status: 502 }
    );
  }
}
