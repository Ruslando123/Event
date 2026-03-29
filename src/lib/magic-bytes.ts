import type { AllowedImageMime } from "./constants";

export function detectImageKindFromMagic(buf: Uint8Array): AllowedImageMime | null {
  if (buf.length < 12) return null;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  // HEIC / HEIF (ISO BMFF: ....ftyp)
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
    if (brand === "heic" || brand === "heix" || brand === "hevc" || brand === "mif1") {
      return "image/heic";
    }
    if (brand === "heif" || brand === "mif1" || brand === "msf1") {
      return "image/heif";
    }
    return "image/heic";
  }
  return null;
}
