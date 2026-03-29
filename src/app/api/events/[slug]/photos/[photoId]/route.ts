import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { deleteBlob, requireBlobToken } from "@/lib/blob-storage";
import {
  ADMIN_SESSION_COOKIE,
  parseAdminSessionToken,
} from "@/lib/admin-session";

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ slug: string; photoId: string }> },
) {
  try {
    requireBlobToken();
  } catch {
    return NextResponse.json({ error: "Storage missing" }, { status: 503 });
  }

  const { slug, photoId } = await params;
  const jar = await cookies();
  const session = parseAdminSessionToken(jar.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session || session.slug !== slug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, eventId: event.id },
  });
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteBlob(photo.url).catch((e) => {
    console.error("Blob delete failed", e);
  });
  await prisma.photo.delete({ where: { id: photo.id } });

  return NextResponse.json({ ok: true });
}
