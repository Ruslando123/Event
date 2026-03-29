import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Event Photo Share
      </h1>
      <p className="mt-3 text-neutral-600">
        Откройте ссылку с QR-кода мероприятия или перейдите к демо-событию после
        запуска с seed.
      </p>
      <Link
        href="/e/demo-wedding/gallery"
        className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-accent px-6 text-base font-medium text-neutral-900 transition hover:bg-accent-hover"
      >
        Демо-галерея
      </Link>
      <Link
        href="/e/demo-wedding/upload"
        className="mt-3 inline-flex min-h-[48px] items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 text-base font-medium text-neutral-800 transition hover:bg-neutral-50"
      >
        Загрузка фото (демо)
      </Link>
      <Link
        href="/e/demo-wedding/admin"
        className="mt-3 block text-center text-sm text-neutral-500 underline-offset-2 hover:underline"
      >
        Админ (демо)
      </Link>
      <Link
        href="/studio"
        className="mt-6 block text-center text-sm font-medium text-neutral-800 underline-offset-2 hover:underline"
      >
        Панель организатора (Studio)
      </Link>
    </main>
  );
}
