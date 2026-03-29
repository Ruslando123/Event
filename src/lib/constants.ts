/** Max files per upload session (client + server should enforce). */
export const MAX_FILES_PER_SESSION = 5;

/** Max bytes per file after upload (10 MB). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Max photos included in one ZIP (serverless timeout safety). */
export const MAX_ZIP_PHOTOS = 300;

export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

export function isAllowedMime(m: string): m is AllowedImageMime {
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(m);
}
