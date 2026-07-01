import { NextRequest, NextResponse } from "next/server";
import { formatProtocolText } from "@/lib/rag/format-protocol";
import { getPageExcerpt } from "@/lib/trials";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const page = req.nextUrl.searchParams.get("page");

  if (!page) {
    return NextResponse.json({ error: "page query parameter is required" }, { status: 400 });
  }

  const raw = getPageExcerpt(id, parseInt(page, 10));
  if (!raw) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({
    page: parseInt(page, 10),
    excerpt: formatProtocolText(raw),
  });
}
