import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
} from "@/lib/admin-session";
import { rateLimitUploads } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = getClientIp(req);
  const { success } = await rateLimitUploads(`admin-login:${ip}`);
  if (!success) {
    return NextResponse.json(
      { success: false, message: "Слишком много попыток" },
      { status: 429 },
    );
  }

  const body = (await req.json()) as { password?: string };
  const password = body.password ?? "";

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json(
      { success: false, message: "Событие не найдено" },
      { status: 404 },
    );
  }

  const ok = await bcrypt.compare(password, event.adminPasswordHash);
  if (!ok) {
    return NextResponse.json(
      { success: false, message: "Неверный пароль" },
      { status: 401 },
    );
  }

  const token = createAdminSessionToken(slug);
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    ...adminSessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
