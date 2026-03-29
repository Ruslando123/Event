/**
 * Bcrypt hash for password "studio-dev" — только для локальной разработки,
 * если STUDIO_PASSWORD_HASH не задан. В production обязателен STUDIO_PASSWORD_HASH.
 */
const DEV_STUDIO_PASSWORD_HASH =
  "$2b$10$r4pYccnNqFfYgcofhG338OWKw4oh/IPLMYd9n24HHpevvR1l1/pGq";

function normalizeHashFromEnv(raw: string | undefined): string | null {
  let h = raw?.trim();
  if (!h) return null;
  // Частая ошибка в .env: внешние кавычки попадают в значение
  if (
    (h.startsWith('"') && h.endsWith('"')) ||
    (h.startsWith("'") && h.endsWith("'"))
  ) {
    h = h.slice(1, -1).trim();
  }
  return h || null;
}

export function getStudioPasswordHashForCompare(): string | null {
  const h = normalizeHashFromEnv(process.env.STUDIO_PASSWORD_HASH);
  if (h) {
    // Next.js подставляет $VAR в .env — bcrypt без ведущего $2 ломается
    if (!h.startsWith("$2") && process.env.NODE_ENV === "development") {
      console.warn(
        "[studio] STUDIO_PASSWORD_HASH выглядит повреждённым. В .env экранируйте $ как \\\$ (см. .env.example).",
      );
    }
    return h;
  }
  if (process.env.NODE_ENV === "development") {
    return DEV_STUDIO_PASSWORD_HASH;
  }
  return null;
}
