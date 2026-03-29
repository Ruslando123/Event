import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "eps_admin";
const TTL_MS = 60 * 60 * 1000; // 1 hour

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "development") {
    return "dev-only-secret-min-16-chars!!";
  }
  throw new Error("ADMIN_SESSION_SECRET must be set (min 16 chars)");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createAdminSessionToken(eventSlug: string): string {
  const exp = Date.now() + TTL_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${eventSlug}|${exp}|${nonce}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}|${sig}`, "utf8").toString("base64url");
}

export function parseAdminSessionToken(
  token: string | undefined,
): { slug: string; exp: number } | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split("|");
    if (parts.length !== 4) return null;
    const [slug, expStr, nonce, sig] = parts;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;
    const payload = `${slug}|${exp}|${nonce}`;
    const expected = sign(payload);
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { slug, exp };
  } catch {
    return null;
  }
}

export const adminSessionCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(TTL_MS / 1000),
};
