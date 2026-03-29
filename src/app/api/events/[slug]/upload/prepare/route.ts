import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildBlobPathname, requireBlobToken } from "@/lib/blob-storage";
import { rateLimitUploads } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { isAllowedMime } from "@/lib/constants";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    requireBlobToken();
  } catch {
    return NextResponse.json(
      { success: false, message: "Хранилище не настроено (BLOB_READ_WRITE_TOKEN)" },
      { status: 503 },
    );
  }

  const { slug } = await params;
  const ip = getClientIp(req);
  const { success } = await rateLimitUploads(`prepare:${ip}`);
  if (!success) {
    return NextResponse.json(
      { success: false, message: "Слишком много запросов" },
      { status: 429 },
    );
  }

  const body = (await req.json()) as {
    contentType?: string;
    turnstileToken?: string;
  };
  if (process.env.TURNSTILE_SECRET_KEY) {
    const ok = await verifyTurnstileToken(body.turnstileToken);
    if (!ok) {
      return NextResponse.json(
        { success: false, message: "Проверка CAPTCHA не пройдена" },
        { status: 400 },
      );
    }
  }

  const contentType = body.contentType ?? "";
  if (!isAllowedMime(contentType)) {
    return NextResponse.json(
      { success: false, message: "Недопустимый тип файла" },
      { status: 400 },
    );
  }

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json(
      { success: false, message: "Событие не найдено" },
      { status: 404 },
    );
  }

  const ext =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/png"
        ? "png"
        : contentType === "image/heif"
          ? "heif"
          : "heic";

  const pathname = buildBlobPathname(event.id, ext);

  return NextResponse.json({
    success: true,
    pathname,
  });
}
