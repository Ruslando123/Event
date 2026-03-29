import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isStudioAuthenticated } from "@/lib/studio-auth";
import { generateSuggestedSlug, normalizeSlugInput } from "@/lib/slug";

export async function GET() {
  if (!(await isStudioAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      createdAt: true,
      _count: { select: { photos: true } },
    },
  });

  return NextResponse.json({
    items: events.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      createdAt: e.createdAt.toISOString(),
      photoCount: e._count.photos,
    })),
  });
}

function randomAdminPassword(): string {
  return randomBytes(9).toString("base64url").slice(0, 12);
}

export async function POST(request: Request) {
  if (!(await isStudioAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    slug?: string;
    adminPassword?: string;
  };

  const title = (body.title ?? "").trim();
  if (!title || title.length > 200) {
    return NextResponse.json(
      { error: "Укажите название (до 200 символов)" },
      { status: 400 },
    );
  }

  if (body.slug?.trim() && !normalizeSlugInput(body.slug)) {
    return NextResponse.json(
      {
        error:
          "Slug: только латиница, цифры и дефисы, длина 3–64 (например anna-pavel-2026)",
      },
      { status: 400 },
    );
  }

  const userSlug = normalizeSlugInput(body.slug);
  let slug: string;

  if (userSlug) {
    const taken = await prisma.event.findUnique({ where: { slug: userSlug } });
    if (taken) {
      return NextResponse.json(
        { error: "Такой адрес (slug) уже занят — выберите другой" },
        { status: 409 },
      );
    }
    slug = userSlug;
  } else {
    slug = generateSuggestedSlug();
    for (let attempt = 0; attempt < 25; attempt++) {
      const exists = await prisma.event.findUnique({ where: { slug } });
      if (!exists) break;
      slug = generateSuggestedSlug();
    }
    const stillTaken = await prisma.event.findUnique({ where: { slug } });
    if (stillTaken) {
      return NextResponse.json(
        { error: "Не удалось создать уникальный адрес — повторите попытку" },
        { status: 503 },
      );
    }
  }

  const plainPassword = (body.adminPassword ?? "").trim() || randomAdminPassword();
  if (plainPassword.length < 6) {
    return NextResponse.json(
      { error: "Пароль модерации: минимум 6 символов или оставьте пустым для автогенерации" },
      { status: 400 },
    );
  }

  const adminPasswordHash = await bcrypt.hash(plainPassword, 10);

  const event = await prisma.event.create({
    data: {
      slug,
      title,
      adminPasswordHash,
    },
    select: { id: true, slug: true, title: true },
  });

  return NextResponse.json({
    event,
    /** Показать один раз, если был сгенерирован автоматически */
    adminPasswordPlain: body.adminPassword?.trim() ? undefined : plainPassword,
  });
}
