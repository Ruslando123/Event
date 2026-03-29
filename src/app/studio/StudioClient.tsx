"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  Plus,
  QrCode,
  Trash2,
} from "lucide-react";
import { QrLinkDialog } from "@/components/QrLinkDialog";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  photoCount: number;
};

function baseUrl(): string {
  if (typeof window === "undefined") return "";
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  return window.location.origin;
}

function eventUrls(slug: string) {
  const b = baseUrl();
  return {
    upload: `${b}/e/${encodeURIComponent(slug)}/upload`,
    gallery: `${b}/e/${encodeURIComponent(slug)}/gallery`,
    admin: `${b}/e/${encodeURIComponent(slug)}/admin`,
  };
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt("Скопируйте вручную:", text);
  }
}

export function StudioClient({ initialAuthed }: { initialAuthed: boolean }) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [items, setItems] = useState<EventRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [shownPassword, setShownPassword] = useState<string | null>(null);

  const [qrDialog, setQrDialog] = useState<{
    title: string;
    url: string;
    fileBaseName: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/studio/events");
      if (r.status === 401) {
        setAuthed(false);
        setItems([]);
        return;
      }
      if (!r.ok) throw new Error("Ошибка загрузки");
      const j = (await r.json()) as { items: EventRow[] };
      setItems(j.items);
      setAuthed(true);
    } catch {
      setLoadError("Не удалось загрузить список");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialAuthed) void load();
  }, [initialAuthed, load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginBusy(true);
    try {
      const r = await fetch("/api/studio/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = (await r.json()) as { success?: boolean; message?: string };
      if (!r.ok || !j.success) {
        setLoginError(j.message ?? "Неверный пароль");
        return;
      }
      setPassword("");
      setAuthed(true);
      await load();
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/studio/logout", { method: "POST" });
    setAuthed(false);
    setItems([]);
    setShownPassword(null);
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    setShownPassword(null);
    setCreateBusy(true);
    try {
      const r = await fetch("/api/studio/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug.trim() || undefined,
          adminPassword: adminPass.trim() || undefined,
        }),
      });
      const j = (await r.json()) as {
        error?: string;
        event?: { id: string; slug: string; title: string };
        adminPasswordPlain?: string;
      };
      if (!r.ok) {
        setCreateMsg(j.error ?? "Ошибка создания");
        return;
      }
      if (j.event) {
        setTitle("");
        setSlug("");
        setAdminPass("");
        setCreateMsg(`Создано: «${j.event.title}»`);
        if (j.adminPasswordPlain) {
          setShownPassword(j.adminPasswordPlain);
        }
        await load();
      }
    } finally {
      setCreateBusy(false);
    }
  };

  const remove = async (id: string, titleEv: string) => {
    if (!confirm(`Удалить мероприятие «${titleEv}» и все фото? Это необратимо.`)) {
      return;
    }
    const r = await fetch(`/api/studio/events/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      alert("Не удалось удалить");
      return;
    }
    await load();
  };

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="text-sm text-neutral-500">Организатор</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Панель Studio</h1>
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
            disabled={loginBusy}
            className="flex w-full min-h-[52px] items-center justify-center rounded-xl bg-neutral-900 px-4 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {loginBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Войти"}
          </button>
        </form>
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-neutral-600 underline"
        >
          На главную
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-neutral-500">Панель организатора</p>
          <h1 className="text-2xl font-semibold text-neutral-900">Studio</h1>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-medium hover:bg-neutral-50"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>

      <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Plus className="h-5 w-5 text-accent-hover" />
          Новое мероприятие
        </h2>
        <form onSubmit={createEvent} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Название</span>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-base"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Свадьба Анны и Павла"
              required
            />
          </label>
          <label>
            <span className="text-sm font-medium text-neutral-700">
              Slug (необязательно)
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-base"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="anna-pavel-2026"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-neutral-700">
              Пароль модерации /e/.../admin
            </span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-base"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              placeholder="Пусто = сгенерировать"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={createBusy}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-accent px-6 text-base font-semibold text-neutral-900 hover:bg-accent-hover disabled:opacity-60"
            >
              {createBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Создать"}
            </button>
          </div>
        </form>
        {createMsg ? (
          <p className="mt-3 text-sm text-emerald-800">{createMsg}</p>
        ) : null}
        {shownPassword ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <strong>Сохраните пароль модерации</strong> (больше не покажем):{" "}
            <code className="rounded bg-white px-1 py-0.5">{shownPassword}</code>
          </div>
        ) : null}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Мероприятия</h2>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm font-medium text-neutral-600 underline"
          >
            Обновить
          </button>
        </div>
        {loading ? (
          <p className="flex items-center gap-2 text-neutral-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Загрузка…
          </p>
        ) : null}
        {loadError ? <p className="text-red-600">{loadError}</p> : null}

        <ul className="space-y-4">
          {items.map((ev) => {
            const urls = eventUrls(ev.slug);
            return (
              <li
                key={ev.id}
                className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">{ev.title}</p>
                    <p className="text-sm text-neutral-500">
                      {ev.slug} · {ev.photoCount} фото ·{" "}
                      {new Date(ev.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(ev.id, ev.title)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      ["Загрузка", urls.upload],
                      ["Галерея", urls.gallery],
                      ["Модерация фото", urls.admin],
                    ] as const
                  ).map(([label, url]) => {
                    const fileKey =
                      label === "Загрузка"
                        ? "upload"
                        : label === "Галерея"
                          ? "gallery"
                          : "admin";
                    return (
                    <div key={label} className="flex flex-wrap items-center gap-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                      >
                        {label}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => void copyText(url)}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                        title="Копировать ссылку"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setQrDialog({
                            title: `QR: ${label}`,
                            url,
                            fileBaseName: `qr-${ev.slug}-${fileKey}`,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                        title="Показать QR-код"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                    </div>
                  );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        {!loading && items.length === 0 ? (
          <p className="mt-6 text-center text-neutral-600">
            Пока нет мероприятий — создайте первое выше.
          </p>
        ) : null}
      </section>

      <p className="mt-10 text-center text-sm text-neutral-500">
        Иконка QR открывает код; можно скачать PNG. Для гостей чаще всего QR ведёт на
        «Загрузку». На проде задайте{" "}
        <code className="rounded bg-neutral-100 px-1 text-xs">NEXT_PUBLIC_APP_URL</code>
        — иначе в коде будет localhost.
      </p>

      <QrLinkDialog
        open={qrDialog !== null}
        title={qrDialog?.title ?? ""}
        url={qrDialog?.url ?? ""}
        fileBaseName={qrDialog?.fileBaseName ?? "qr"}
        onClose={() => setQrDialog(null)}
      />
    </main>
  );
}
