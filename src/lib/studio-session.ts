import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const STUDIO_SESSION_COOKIE = "eps_studio";
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getSecret(): string {
  const s = process.env.STUDIO_SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "development") {
    return "dev-studio-session-secret-min-16!!";
  }
  throw new Error("STUDIO_SESSION_SECRET must be set (min 16 chars)");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createStudioSessionToken(): string {
  const exp = Date.now() + TTL_MS;
  const nonce = randomBytes(8).toString("hex");
  const subject = "studio";
  const payload = `${subject}|${exp}|${nonce}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}|${sig}`, "utf8").toString("base64url");
}

export function parseStudioSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split("|");
    if (parts.length !== 4) return false;
    const [subject, expStr, nonce, sig] = parts;
    if (subject !== "studio") return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const payload = `${subject}|${exp}|${nonce}`;
    const expected = sign(payload);
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    return true;
  } catch {
    return false;
  }
}

export const studioSessionCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(TTL_MS / 1000),
};
