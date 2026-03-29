import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStudioAuthenticated } from "@/lib/studio-auth";
import { deleteBlob, requireBlobToken } from "@/lib/blob-storage";

const BATCH = 8;

async function deleteBlobsForPhotos(urls: string[]): Promise<void> {
  try {
    requireBlobToken();
  } catch {
    return;
  }
  for (let i = 0; i < urls.length; i += BATCH) {
    const chunk = urls.slice(i, i + BATCH);
    await Promise.allSettled(chunk.map((u) => deleteBlob(u)));
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isStudioAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: { photos: { select: { id: true, url: true } } },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const urls = event.photos.map((p) => p.url);
  await deleteBlobsForPhotos(urls);

  await prisma.event.delete({ where: { id: event.id } });

  return NextResponse.json({ ok: true });
}
