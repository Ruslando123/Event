import { randomBytes } from "crypto";

/** Safe URL segment: latin, digits, hyphen, 3–64 chars. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidEventSlug(s: string): boolean {
  return SLUG_RE.test(s) && s.length >= 3 && s.length <= 64;
}

export function normalizeSlugInput(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!isValidEventSlug(s)) return null;
  return s;
}

export function generateSuggestedSlug(): string {
  return `wedding-${randomBytes(4).toString("hex")}`;
}
