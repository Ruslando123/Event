"use client";

import { useCallback, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Turnstile } from "@marsidev/react-turnstile";
import { ImagePlus, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { MAX_FILES_PER_SESSION, MAX_FILE_BYTES } from "@/lib/constants";
import {
  prepareImageForUpload,
  tryHeicPreviewUrl,
  validateFileBeforePrep,
} from "@/lib/client-image";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Item = {
  id: string;
  file: File;
  previewUrl: string | null;
  error: string | null;
};

export function PhotoUploader({ eventSlug }: { eventSlug: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [progressById, setProgressById] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [finishedOk, setFinishedOk] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileMountKey, setTurnstileMountKey] = useState(0);

  const canAddMore = items.length < MAX_FILES_PER_SESSION;

  const onPick = useCallback((fileList: FileList | null) => {
    if (!fileList?.length) return;
    const arr = Array.from(fileList);
    setGlobalError(null);
    setFinishedOk(false);
    setItems((prev) => {
      const next = [...prev];
      for (let i = 0; i < arr.length; i++) {
        if (next.length >= MAX_FILES_PER_SESSION) {
          setGlobalError(
            `Можно выбрать не более ${MAX_FILES_PER_SESSION} фото`,
          );
          break;
        }
        const file = arr[i];
        const err = validateFileBeforePrep(file);
        if (err) {
          setGlobalError(err);
          continue;
        }
        const id = `${Date.now()}-${i}-${file.name}`;
        const isHeic =
          file.type === "image/heic" ||
          file.type === "image/heif" ||
          /\.(heic|heif)$/i.test(file.name);
        const previewUrl =
          !isHeic && file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : null;
        next.push({ id, file, previewUrl, error: null });
        if (isHeic) {
          void tryHeicPreviewUrl(file).then((url) => {
            if (!url) return;
            setItems((prev) =>
              prev.map((x) => (x.id === id ? { ...x, previewUrl: url } : x)),
            );
          });
        }
      }
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
    setProgressById((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    setFinishedOk(false);
  }, []);

  const startUpload = useCallback(async () => {
    if (!items.length || busy) return;
    if (turnstileSiteKey && !turnstileToken) {
      setGlobalError("Подтвердите, что вы не робот");
      return;
    }
    setGlobalError(null);
    setFinishedOk(false);
    setBusy(true);
    let anyOk = false;
    const succeededIds = new Set<string>();
    try {
      for (const item of items) {
        setItems((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, error: null } : x)),
        );
        setProgressById((p) => ({ ...p, [item.id]: 0 }));
        try {
          const prepared = await prepareImageForUpload(item.file);
          if (prepared.blob.size > MAX_FILE_BYTES) {
            throw new Error("После обработки файл всё ещё больше 10 МБ");
          }
          const prepareRes = await fetch(
            `/api/events/${encodeURIComponent(eventSlug)}/upload/prepare`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contentType: prepared.mimeType,
                turnstileToken: turnstileSiteKey ? turnstileToken : undefined,
              }),
            },
          );
          const prepareJson = (await prepareRes.json()) as {
            success?: boolean;
            pathname?: string;
            message?: string;
          };
          if (!prepareRes.ok || !prepareJson.pathname) {
            throw new Error(
              prepareJson.message ?? "Не удалось подготовить загрузку",
            );
          }

          const blobResult = await upload(
            prepareJson.pathname,
            prepared.blob,
            {
              access: "public",
              handleUploadUrl: "/api/blob/handle-upload",
              clientPayload: JSON.stringify({ slug: eventSlug }),
              contentType: prepared.mimeType,
              onUploadProgress: ({ percentage }) => {
                setProgressById((p) => ({
                  ...p,
                  [item.id]: Math.max(0, Math.min(99, Math.round(percentage))),
                }));
              },
            },
          );

          const complete = await fetch(
            `/api/events/${encodeURIComponent(eventSlug)}/photos/complete`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: blobResult.url,
                pathname: blobResult.pathname,
                originalName: prepared.originalName,
              }),
            },
          );
          if (!complete.ok) {
            const j = (await complete.json().catch(() => ({}))) as {
              message?: string;
            };
            throw new Error(j.message ?? "Не удалось сохранить");
          }
          setProgressById((p) => ({ ...p, [item.id]: 100 }));
          succeededIds.add(item.id);
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          anyOk = true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Ошибка загрузки";
          setItems((prev) =>
            prev.map((x) =>
              x.id === item.id ? { ...x, error: msg } : x,
            ),
          );
        }
      }
      if (succeededIds.size > 0) {
        // Убираем успешно отправленные фото из списка, чтобы их не отправили повторно
        setItems((prev) => prev.filter((x) => !succeededIds.has(x.id)));
        setProgressById((p) => {
          const n = { ...p };
          for (const id of Array.from(succeededIds)) delete n[id];
          return n;
        });
      }
      if (anyOk) {
        setFinishedOk(true);
        if (turnstileSiteKey) {
          setTurnstileToken(null);
          setTurnstileMountKey((k) => k + 1);
        }
      }
    } finally {
      setBusy(false);
    }
  }, [eventSlug, items, busy, turnstileToken]);

  const resetAll = useCallback(() => {
    items.forEach((it) => {
      if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
    });
    setItems([]);
    setProgressById({});
    setFinishedOk(false);
    setGlobalError(null);
    setTurnstileToken(null);
    setTurnstileMountKey((k) => k + 1);
  }, [items]);

  const successBlock = useMemo(() => {
    if (!finishedOk) return null;
    return (
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
        <p className="text-base leading-snug">
          Спасибо! Ваши фото добавлены в общую галерею
        </p>
      </div>
    );
  }, [finishedOk]);

  const hasErrors = items.some((x) => x.error);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-10 pt-6">
      <label className="block">
        <input
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
          multiple
          className="sr-only"
          disabled={busy || !canAddMore}
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-lg font-semibold text-neutral-900 shadow-sm transition hover:bg-accent-hover active:scale-[0.99]">
          <ImagePlus className="h-6 w-6" aria-hidden />
          Выбрать фото
        </span>
      </label>
      <p className="mt-2 text-center text-sm text-neutral-500">
        До {MAX_FILES_PER_SESSION} файлов, JPG / PNG / HEIC, до 10 МБ каждый
      </p>

      {turnstileSiteKey ? (
        <div className="mt-4 flex justify-center">
          <Turnstile
            key={turnstileMountKey}
            siteKey={turnstileSiteKey}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
          />
        </div>
      ) : null}

      {globalError ? (
        <p className="mt-4 text-center text-sm text-red-600" role="alert">
          {globalError}
        </p>
      ) : null}

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <li
            key={it.id}
            className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
          >
            <div className="aspect-square w-full bg-neutral-200">
              {it.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                  HEIC
                </div>
              )}
            </div>
            {busy ? (
              <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-2 text-white">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${progressById[it.id] ?? 0}%` }}
                  />
                </div>
              </div>
            ) : null}
            {it.error ? (
              <p className="p-2 text-xs text-red-600">{it.error}</p>
            ) : null}
            {!busy ? (
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-black/50 p-1.5 text-white"
                onClick={() => remove(it.id)}
                aria-label="Удалить из списка"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {items.length > 0 && !busy ? (
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={startUpload}
            className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white text-base font-semibold text-neutral-900 transition hover:bg-neutral-50"
          >
            Отправить в галерею
          </button>
          {finishedOk || hasErrors ? (
            <button
              type="button"
              onClick={resetAll}
              className="text-center text-sm text-neutral-600 underline underline-offset-2"
            >
              Очистить и выбрать заново
            </button>
          ) : null}
        </div>
      ) : null}

      {busy ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-neutral-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Загрузка…
        </p>
      ) : null}

      {successBlock}

      {finishedOk && hasErrors ? (
        <p className="mt-4 text-center text-sm text-amber-800">
          Часть файлов не загрузилась — исправьте список и отправьте снова.
        </p>
      ) : null}
    </div>
  );
}
