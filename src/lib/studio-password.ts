/**
 * Bcrypt hash for password "studio-dev" — только для локальной разработки,
 * если STUDIO_PASSWORD_HASH не задан. В production обязателен STUDIO_PASSWORD_HASH.
 */
const DEV_STUDIO_PASSWORD_HASH =
  "$2b$10$r4pYccnNqFfYgcofhG338OWKw4oh/IPLMYd9n24HHpevvR1l1/pGq";

/** Починка копипаста (\$ из подсказки, кавычки, обрезанный $). */
function repairBcryptHashFormat(h: string): string {
  let x = h.trim();
  x = x.replace(/\\\$/g, "$");
  if (
    (x.startsWith('"') && x.endsWith('"')) ||
    (x.startsWith("'") && x.endsWith("'"))
  ) {
    x = x.slice(1, -1).trim();
    x = x.replace(/\\\$/g, "$");
  }
  if (!x.startsWith("$") && /^2[aby]\$\d{1,2}\$/.test(x)) {
    x = `$${x}`;
  }
  return x;
}

function normalizeHashFromEnv(raw: string | undefined): string | null {
  let h = raw?.trim();
  if (!h) return null;
  if (
    (h.startsWith('"') && h.endsWith('"')) ||
    (h.startsWith("'") && h.endsWith("'"))
  ) {
    h = h.slice(1, -1).trim();
  }
  h = repairBcryptHashFormat(h);
  return h || null;
}

export function getStudioPasswordHashForCompare(): string | null {
  const h = normalizeHashFromEnv(process.env.STUDIO_PASSWORD_HASH);
  if (h) {
    if (!/^\$2[aby]\$\d{1,2}\$/.test(h)) {
      const msg =
        "[studio] STUDIO_PASSWORD_HASH не похож на bcrypt. В Vercel вставьте хеш одной строкой $2b$10$... без лишнего текста.";
      if (process.env.NODE_ENV === "development") console.warn(msg);
      else console.error(msg);
    }
    return h;
  }
  if (process.env.NODE_ENV === "development") {
    return DEV_STUDIO_PASSWORD_HASH;
  }
  return null;
}
