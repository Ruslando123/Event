import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip";
import { rateLimitUploads } from "@/lib/rate-limit";
import { requireBlobToken } from "@/lib/blob-storage";

export async function POST(request: Request) {
  let blobToken: string;
  try {
    blobToken = requireBlobToken();
  } catch {
    return NextResponse.json(
      {
        message:
          "Сервер: в .env не задан BLOB_READ_WRITE_TOKEN (токен Read/Write из Vercel → Storage → Blob).",
      },
      { status: 503 },
    );
  }

  const ip = getClientIp(request);
  const { success } = await rateLimitUploads(`blob-token:${ip}`);
  if (!success) {
    return NextResponse.json(
      { message: "Слишком много запросов" },
      { status: 429 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ message: "Некорректное тело" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: blobToken,
      onBeforeGenerateToken: async (pathname, clientPayload, _multipart) => {
        const parsed = JSON.parse(clientPayload ?? "{}") as { slug?: string };
        const slug = parsed.slug?.trim();
        if (!slug) throw new Error("Не указано событие");

        const event = await prisma.event.findUnique({ where: { slug } });
        if (!event) throw new Error("Событие не найдено");

        const prefix = `events/${event.id}/`;
        if (!pathname.startsWith(prefix) || pathname.includes("..")) {
          throw new Error("Некорректный путь файла");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/heic",
            "image/heif",
          ],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка загрузки";
    return NextResponse.json({ message }, { status: 400 });
  }
}
