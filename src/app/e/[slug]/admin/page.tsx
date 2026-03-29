import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  parseAdminSessionToken,
} from "@/lib/admin-session";
import { AdminPanel } from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const jar = await cookies();
  const session = parseAdminSessionToken(jar.get(ADMIN_SESSION_COOKIE)?.value);
  const authed = session?.slug === slug;

  return <AdminPanel slug={slug} title={event.title} initialAuthed={authed} />;
}
