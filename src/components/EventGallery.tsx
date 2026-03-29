"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Lightbox from "yet-another-react-lightbox";
import DownloadPlugin from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";
import { Download, Loader2 } from "lucide-react";
import Link from "next/link";

type PhotoItem = {
  id: string;
  url: string;
  mimeType: string;
  createdAt: string;
};

type PagePayload = {
  items: PhotoItem[];
  nextPage: number | null;
};

export function EventGallery({
  eventSlug,
  eventTitle,
}: {
  eventSlug: string;
  eventTitle: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["photos", eventSlug],
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const r = await fetch(
        `/api/events/${encodeURIComponent(eventSlug)}/photos?page=${pageParam}&limit=24`,
      );
      if (!r.ok) throw new Error("load failed");
      return r.json() as Promise<PagePayload>;
    },
    getNextPageParam: (last) => last.nextPage,
  });

  const flat: PhotoItem[] = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data?.pages],
  );

  const slides = useMemo(
    () =>
      flat.map((p) => ({
        src: p.url,
        alt: "",
        download: `${p.id}.jpg`,
        downloadUrl: p.url,
      })),
    [flat],
  );

  const fetchNext = query.fetchNextPage;
  const hasNext = query.hasNextPage;
  const isFetching = query.isFetchingNextPage;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit && hasNext && !isFetching) void fetchNext();
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNext, hasNext, isFetching]);

  const openAt = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{eventTitle}</h1>
          <Link
            href={`/e/${encodeURIComponent(eventSlug)}/upload`}
            className="mt-1 inline-block text-sm font-medium text-neutral-600 underline-offset-2 hover:underline"
          >
            Загрузить фото
          </Link>
        </div>
        <a
          href={`/api/events/${encodeURIComponent(eventSlug)}/download-zip`}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          Скачать всё (ZIP)
        </a>
      </header>

      {query.isLoading ? (
        <p className="flex items-center justify-center gap-2 py-20 text-neutral-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          Загрузка…
        </p>
      ) : query.isError ? (
        <p className="py-12 text-center text-red-600">Не удалось загрузить галерею</p>
      ) : flat.length === 0 ? (
        <p className="py-12 text-center text-neutral-600">
          Пока нет фото.{" "}
          <Link
            href={`/e/${encodeURIComponent(eventSlug)}/upload`}
            className="font-medium text-neutral-900 underline"
          >
            Загрузить первые
          </Link>
        </p>
      ) : (
        <>
          <div className="columns-2 gap-2 [column-fill:_balance] sm:columns-3 md:columns-4">
            {flat.map((p, i) => (
              <figure
                key={p.id}
                className="group mb-2 break-inside-avoid overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 shadow-sm"
              >
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => openAt(i)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    loading="lazy"
                    className="w-full object-cover transition group-hover:opacity-95"
                  />
                </button>
                <figcaption className="flex items-center justify-center p-2">
                  <a
                    href={p.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-neutral-700 underline-offset-2 hover:underline"
                  >
                    Скачать
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
          <div ref={sentinelRef} className="h-8 w-full" aria-hidden />
          {isFetching ? (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ещё фото…
            </p>
          ) : null}
        </>
      )}

      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={slides}
        plugins={[DownloadPlugin]}
        carousel={{ finite: flat.length <= 1 }}
      />
    </div>
  );
}
