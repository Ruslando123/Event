"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";

type Photo = {
  id: string;
  url: string;
  createdAt: string;
};

export function AdminPanel({
  slug,
  title,
  initialAuthed,
}: {
  slug: string;
  title: string;
  initialAuthed: boolean;
}) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await fetch(
        `/api/events/${encodeURIComponent(slug)}/photos?page=0&limit=200`,
      );
      if (!r.ok) throw new Error("Не удалось загрузить список");
      const j = (await r.json()) as { items: Photo[] };
      setPhotos(j.items);
    } catch {
      setLoadError("Ошибка загрузки фото");
    }
  }, [slug]);

  useEffect(() => {
    if (authed) void loadPhotos();
  }, [authed, loadPhotos]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setBusy(true);
    try {
      const r = await fetch(
        `/api/events/${encodeURIComponent(slug)}/admin/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        },
      );
      const j = (await r.json()) as { success?: boolean; message?: string };
      if (!r.ok || !j.success) {
        setLoginError(j.message ?? "Ошибка входа");
        return;
      }
      setAuthed(true);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch(`/api/events/${encodeURIComponent(slug)}/admin/logout`, {
      method: "POST",
    });
    setAuthed(false);
    setPhotos([]);
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить это фото из галереи?")) return;
    setBusy(true);
    try {
      const r = await fetch(
        `/api/events/${encodeURIComponent(slug)}/photos/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!r.ok) {
        alert("Не удалось удалить");
        return;
      }
      setPhotos((p) => p.filter((x) => x.id !== id));
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="text-sm text-neutral-500">Админ · {title}</p>
        <h1 className="mt-1 text-2xl font-semibold">Вход</h1>
        <form onSubmit={login} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-base outline-none ring-accent focus:border-accent focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {loginError ? (
            <p className="text-sm text-red-600">{loginError}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full min-h-[52px] items-center justify-center rounded-xl bg-neutral-900 px-4 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Войти"}
          </button>
        </form>
        <Link
          href={`/e/${encodeURIComponent(slug)}/gallery`}
          className="mt-8 inline-block text-sm text-neutral-600 underline"
        >
          ← В галерею
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-neutral-500">Админ-панель</p>
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadPhotos()}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Обновить
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Выйти
          </button>
          <Link
            href={`/e/${encodeURIComponent(slug)}/gallery`}
            className="inline-flex items-center rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Галерея
          </Link>
        </div>
      </div>

      {loadError ? (
        <p className="mt-6 text-red-600">{loadError}</p>
      ) : null}

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p) => (
          <li
            key={p.id}
            className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt=""
              className="aspect-square w-full object-cover"
            />
            <div className="p-2">
              <button
                type="button"
                onClick={() => void remove(p.id)}
                disabled={busy}
                className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg bg-red-50 text-sm font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>

      {photos.length === 0 && !loadError ? (
        <p className="mt-10 text-center text-neutral-600">Нет фотографий</p>
      ) : null}
    </main>
  );
}
