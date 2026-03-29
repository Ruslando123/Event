# Деплой и эксплуатация (Event Photo Share)

Кодовый MVP готов; дальше — хостинг, переменные окружения и база. Этот файл закрывает операционные шаги из плана релиза.

## 0. Git — сначала репозиторий, потом Vercel

Vercel удобнее всего подключает **уже лежащий в облаке** репозиторий (GitHub, GitLab, Bitbucket). Локальный `.env` в коммит **не попадает** (см. `.gitignore`); секреты задаются только в Vercel.

1. Включите **git** в папке проекта (если ещё нет):
   ```bash
   git init
   git add -A
   git status   # убедитесь, что нет .env и node_modules
   git commit -m "Initial commit: Event Photo Share"
   ```
2. Создайте **пустой** репозиторий на GitHub (без README, чтобы не конфликтовал с локальным первым коммитом, либо затем `git pull` с `--allow-unrelated-histories` по инструкции GitHub).
3. Привяжите remote и отправьте код:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<ваш-юзер>/<ваш-репо>.git
   git push -u origin main
   ```
4. После этого переходите к **разделу 1 (Vercel)** и импортируйте этот репозиторий.

## 1. Vercel

1. Подключите репозиторий в [Vercel](https://vercel.com): **Add New → Project**, выберите ветку (обычно `main`).
2. **Framework Preset**: Next.js (репозиторий уже содержит `vercel.json` с `"framework": "nextjs"`).
3. В **Settings → Environment Variables** добавьте переменные для **Production** (и при необходимости Preview), см. таблицу ниже.
4. После первого успешного деплоя задайте **`NEXT_PUBLIC_APP_URL`** на точный URL продакшена (`https://<проект>.vercel.app` или кастомный домен), чтобы ссылки и QR в Studio были верными. Пересоберите проект после изменения.

### Обязательные переменные

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | PostgreSQL (Neon, Vercel Postgres, Supabase и т.д.) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — Read/Write token из панели Storage |
| `ADMIN_SESSION_SECRET` | Сессии модерации `/e/[slug]/admin` (длинная случайная строка, ≥16 символов) |
| `STUDIO_PASSWORD_HASH` | Bcrypt-хеш пароля Studio: локально `npm run studio:hash -- ваш_пароль` |
| `STUDIO_SESSION_SECRET` | Сессии `/studio` (отдельная длинная случайная строка) |

### `STUDIO_PASSWORD_HASH` и символ `$`

Next.js подставляет `$...` в значениях `.env` как ссылки на другие переменные. В хеше bcrypt каждый `$` нужно экранировать обратным слэшем:

```env
STUDIO_PASSWORD_HASH="\$2b\$10\$......................................"
```

Скрипт `studio:hash` выводит подсказку с уже экранированной строкой для вставки в Vercel.

### Рекомендуемые для продакшена

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_APP_URL` | Публичный URL сайта (ссылки, QR) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token — общий rate limit на всех инстансах serverless |

Без Upstash используется in-memory fallback (подходит для одного инстанса / низкой нагрузки).

### Опционально (ботам на загрузке)

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Виджет Cloudflare Turnstile на странице загрузки |
| `TURNSTILE_SECRET_KEY` | Серверная проверка токена в `upload/prepare` |

Задавайте оба ключа вместе; иначе проверка не включается.

## 2. База данных (прод)

Если база уже заполнялась через старый `prisma db push`, для `migrate deploy` может понадобиться [baselining](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/baselining) или чистая БД. Для новой пустой базы:

```bash
npx prisma migrate deploy
```

Для локальной разработки с той же схемой:

```bash
npx prisma migrate dev
```

Раньше использовался только `db push`; теперь в репозитории есть версионируемая миграция `20260329120000_init`. Новые изменения схемы добавляйте через `prisma migrate dev` и коммитьте папку `prisma/migrations/`.

Опционально один раз для демо: `npm run db:seed` (только с осознанным `SEED_ADMIN_PASSWORD`).

## 3. Ротация секретов (если что-то утекло)

Если токены или пароли попадали в чат, скриншоты или публичный репозиторий:

1. **Vercel Blob** — перевыпустить Read/Write token в панели, обновить `BLOB_READ_WRITE_TOKEN` в Vercel.
2. **PostgreSQL** — сменить пароль пользователя БД, обновить `DATABASE_URL`.
3. **`ADMIN_SESSION_SECRET` / `STUDIO_SESSION_SECRET`** — сгенерировать новые длинные случайные строки; активные сессии админки/Studio станут невалидны (ожидаемо).
4. **Пароль Studio** — задать новый: `npm run studio:hash -- новый_пароль`, вставить хеш в `STUDIO_PASSWORD_HASH` с экранированием `\$`.
5. **Turnstile** — при компрометации секрета перевыпустить ключ в Cloudflare.

## 4. Vercel Blob и CORS

Если браузер блокирует загрузку/скачивание с другого origin, в настройках Blob/CDN при необходимости разрешите **CORS** для GET (и при необходимости загрузки) с вашего домена.

## 5. Smoke-тест после выкладки

1. Открыть `/studio`, войти, создать событие.
2. Проверить QR/ссылку на загрузку.
3. Загрузить фото как гость, открыть `/gallery`.
4. Войти в `/e/<slug>/admin`, убедиться что модерация открывается.

## 6. Диагностика

- Ошибка вида `Cannot find module './NNN.js'` при dev: удалить кэш сборки `rm -rf .next` и снова `npm run dev`.
- «Неверный пароль» в Studio при верном пароле: проверить экранирование `$` в `STUDIO_PASSWORD_HASH` на хостинге.
