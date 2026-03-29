const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;

export type PreparedUpload = {
  blob: Blob;
  mimeType: string;
  originalName: string;
};

function isHeic(file: File): boolean {
  const n = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    n.endsWith(".heic") ||
    n.endsWith(".heif")
  );
}

/** JPEG object URL for HEIC/HEIF preview in the browser; null on failure. */
export async function tryHeicPreviewUrl(file: File): Promise<string | null> {
  if (!isHeic(file)) return null;
  try {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: JPEG_QUALITY,
    });
    const blob = Array.isArray(out) ? out[0] : out;
    if (!(blob instanceof Blob)) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function prepareImageForUpload(file: File): Promise<PreparedUpload> {
  const originalName = file.name || "photo";

  if (isHeic(file)) {
    return {
      blob: file,
      mimeType: "image/heic",
      originalName,
    };
  }

  const bitmap = await createImageBitmap(file);
  let w = bitmap.width;
  let h = bitmap.height;
  const maxEdge = Math.max(w, h);
  if (maxEdge > MAX_EDGE) {
    const scale = MAX_EDGE / maxEdge;
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas не поддерживается");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Не удалось сжать изображение"));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

  return {
    blob,
    mimeType: "image/jpeg",
    originalName,
  };
}

export function validateFileBeforePrep(file: File): string | null {
  const max = 10 * 1024 * 1024;
  if (file.size > max) {
    return `Файл «${file.name}» больше 10 МБ`;
  }
  const okType =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(jpe?g|png|heic|heif)$/i.test(file.name);
  if (!okType) {
    return `Недопустимый формат: ${file.name}`;
  }
  return null;
}
