import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough, Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { rateLimitZip } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { MAX_ZIP_PHOTOS } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

function extForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "heic";
}

async function streamFromPublicUrl(url: string): Promise<Readable> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  if (!res.body) throw new Error("empty body");
  return Readable.fromWeb(res.body as import("stream/web").ReadableStream);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = getClientIp(_req);
  const { success } = await rateLimitZip(`zip:${ip}`);
  if (!success) {
    return NextResponse.json({ message: "Слишком много запросов" }, { status: 429 });
  }

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  }

  const photos = await prisma.photo.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "asc" },
    take: MAX_ZIP_PHOTOS,
  });

  if (photos.length === 0) {
    return NextResponse.json({ message: "Нет фотографий" }, { status: 404 });
  }

  const archive = archiver("zip", { zlib: { level: 6 } });
  const pass = new PassThrough();
  archive.on("error", (err: Error) => {
    pass.destroy(err);
  });
  archive.pipe(pass);

  void (async () => {
    try {
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const stream = await streamFromPublicUrl(p.url);
        const ext = extForMime(p.mimeType);
        const name = `photo-${String(i + 1).padStart(3, "0")}-${p.id.slice(0, 6)}.${ext}`;
        archive.append(stream, { name });
      }
      await archive.finalize();
    } catch (e) {
      archive.abort();
      pass.destroy(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  const filename = `event-${slug}-photos.zip`;
  const webStream = Readable.toWeb(pass);

  return new NextResponse(webStream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
