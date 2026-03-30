import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Images } from "lucide-react";

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
    <div className="min-h-dvh pb-[max(11rem,calc(9rem+env(safe-area-inset-bottom)))]">
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
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
          >
            <Images className="h-4 w-4" aria-hidden />
            Галерея
          </Link>
        </div>
      </header>
      <PhotoUploader eventSlug={slug} />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg px-4">
          <div className="pointer-events-auto rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <Link
              href={`/e/${encodeURIComponent(slug)}/gallery`}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 text-base font-semibold text-white transition hover:bg-neutral-800"
            >
              <Images className="h-5 w-5" aria-hidden />
              Перейти в галерею
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
