import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PhotoUploader } from "@/components/PhotoUploader";

export const dynamic = "force-dynamic";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-neutral-100 px-4 py-4">
        <div className="mx-auto flex max-w-lg items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Загрузка
            </p>
            <h1 className="text-xl font-semibold text-neutral-900">
              {event.title}
            </h1>
          </div>
          <Link
            href={`/e/${encodeURIComponent(slug)}/gallery`}
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg px-2 py-2 text-sm font-medium text-neutral-700 underline-offset-4 hover:underline"
          >
            Галерея
          </Link>
        </div>
      </header>
      <PhotoUploader eventSlug={slug} />
    </div>
  );
}
