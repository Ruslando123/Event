import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getStudioPasswordHashForCompare } from "@/lib/studio-password";
import {
  STUDIO_SESSION_COOKIE,
  createStudioSessionToken,
  studioSessionCookieOptions,
  studioSessionEnvMisconfiguredMessage,
} from "@/lib/studio-session";
import { rateLimitStudioLogin } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success } = await rateLimitStudioLogin(ip);
  if (!success) {
    return NextResponse.json(
      { success: false, message: "Слишком много попыток" },
      { status: 429 },
    );
  }

  const sessionErr = studioSessionEnvMisconfiguredMessage();
  if (sessionErr) {
    return NextResponse.json({ success: false, message: sessionErr }, { status: 503 });
  }

  const hash = getStudioPasswordHashForCompare();
  if (!hash) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Панель не настроена: задайте STUDIO_PASSWORD_HASH в переменных окружения",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { password?: string };
  const password = body.password ?? "";

  const ok = await bcrypt.compare(password, hash);
  if (!ok) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Неверный пароль или значение STUDIO_PASSWORD_HASH на Vercel не совпадает с паролем. Сгенерируйте хеш: npm run studio:hash -- ваш_пароль и вставьте первую строку ($2b$10$...) без обратных слэшей.",
      },
      { status: 401 },
    );
  }

  try {
    const token = createStudioSessionToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set(STUDIO_SESSION_COOKIE, token, {
      ...studioSessionCookieOptions,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    console.error("[api/studio/login] session", e);
    return NextResponse.json(
      {
        success: false,
        message: "Ошибка создания сессии. Проверьте STUDIO_SESSION_SECRET на Vercel.",
      },
      { status: 503 },
    );
  }
}
