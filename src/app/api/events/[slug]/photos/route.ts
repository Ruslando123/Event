import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(0, Number(searchParams.get("page") || 0));
  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") || 24)), 48);

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const skip = page * limit;
  const items = await prisma.photo.findMany({
    where: { eventId: event.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip,
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const slice = hasMore ? items.slice(0, limit) : items;

  return NextResponse.json({
    items: slice.map((p) => ({
      id: p.id,
      url: p.url,
      mimeType: p.mimeType,
      createdAt: p.createdAt.toISOString(),
    })),
    nextPage: hasMore ? page + 1 : null,
  });
}
