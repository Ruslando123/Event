import { del, head } from "@vercel/blob";
import { randomUUID } from "crypto";

export function requireBlobToken(): string {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN не задан");
  }
  return t.trim();
}

const blobOpts = () => ({ token: requireBlobToken() });

export function buildBlobPathname(eventId: string, ext: string): string {
  const safeExt = ext.replace(/^\./, "").toLowerCase();
  return `events/${eventId}/${randomUUID()}.${safeExt}`;
}

export async function headBlob(urlOrPathname: string) {
  return head(urlOrPathname, blobOpts());
}

export async function deleteBlob(urlOrPathname: string) {
  await del(urlOrPathname, blobOpts());
}

export async function fetchPublicByteRange(
  url: string,
  start: number,
  end: number,
): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
  });
  if (!res.ok) throw new Error(`Range fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
