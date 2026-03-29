import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  deleteBlob,
  fetchPublicByteRange,
  headBlob,
  requireBlobToken,
} from "@/lib/blob-storage";
import { rateLimitUploads } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { MAX_FILE_BYTES } from "@/lib/constants";
import { detectImageKindFromMagic } from "@/lib/magic-bytes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    requireBlobToken();
  } catch {
    return NextResponse.json(
      { success: false, message: "Хранилище не настроено" },
      { status: 503 },
    );
  }

  try {
    const { slug } = await params;
    const ip = getClientIp(req);
    const { success } = await rateLimitUploads(`complete:${ip}`);
    if (!success) {
      return NextResponse.json(
        { success: false, message: "Слишком много запросов" },
        { status: 429 },
      );
    }

    const body = (await req.json()) as {
      url?: string;
      pathname?: string;
      originalName?: string | null;
    };
    const url = (body.url ?? "").trim();
    const pathname = (body.pathname ?? "").trim();
    const originalName = body.originalName;

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return NextResponse.json(
        { success: false, message: "Событие не найдено" },
        { status: 404 },
      );
    }

    const prefix = `events/${event.id}/`;
    if (
      !url ||
      !pathname ||
      !pathname.startsWith(prefix) ||
      pathname.includes("..")
    ) {
      return NextResponse.json(
        { success: false, message: "Некорректные данные файла" },
        { status: 400 },
      );
    }

    let meta;
    try {
      meta = await headBlob(url);
    } catch {
      return NextResponse.json(
        { success: false, message: "Файл не найден в хранилище" },
        { status: 400 },
      );
    }

    if (meta.size > MAX_FILE_BYTES) {
      await deleteBlob(url).catch(() => undefined);
      return NextResponse.json(
        { success: false, message: "Файл больше 10 МБ" },
        { status: 400 },
      );
    }
    if (meta.size === 0) {
      await deleteBlob(url).catch(() => undefined);
      return NextResponse.json(
        { success: false, message: "Пустой файл" },
        { status: 400 },
      );
    }

    let magic: Uint8Array;
    try {
      magic = await fetchPublicByteRange(url, 0, 31);
    } catch {
      await deleteBlob(url).catch(() => undefined);
      return NextResponse.json(
        { success: false, message: "Не удалось проверить файл" },
        { status: 400 },
      );
    }

    const kind = detectImageKindFromMagic(magic);
    if (!kind) {
      await deleteBlob(url).catch(() => undefined);
      return NextResponse.json(
        { success: false, message: "Файл не является допустимым изображением" },
        { status: 400 },
      );
    }

    const name =
      typeof originalName === "string" ? originalName.slice(0, 240) : null;

    await prisma.photo.create({
      data: {
        eventId: event.id,
        url,
        storageKey: pathname,
        mimeType: kind,
        originalName: name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, message: "Не удалось сохранить фото" },
      { status: 503 },
    );
  }
}
