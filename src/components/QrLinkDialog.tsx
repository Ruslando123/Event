"use client";

import { useCallback, useRef } from "react";
import QRCode from "react-qr-code";
import { Download, X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  url: string;
  fileBaseName: string;
  onClose: () => void;
};

function svgToPngBlob(svg: SVGElement, scale: number): Promise<Blob> {
  const xml = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        reject(new Error("canvas"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("toBlob"));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error("img"));
    };
    img.src = svgUrl;
  });
}

export function QrLinkDialog({
  open,
  title,
  url,
  fileBaseName,
  onClose,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const downloadPng = useCallback(async () => {
    const svg = wrapRef.current?.querySelector("svg");
    if (!svg) return;
    try {
      const blob = await svgToPngBlob(svg, 4);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${fileBaseName}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.alert("Не удалось сохранить PNG");
    }
  }, [fileBaseName]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-dialog-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-sm overflow-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <h2 id="qr-dialog-title" className="text-lg font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 break-all text-xs text-neutral-500">{url}</p>
        <div
          ref={wrapRef}
          className="mt-4 flex justify-center rounded-xl bg-white p-4 ring-1 ring-neutral-100"
        >
          <QRCode value={url} size={220} level="M" />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void downloadPng()}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-neutral-900 hover:bg-accent-hover"
          >
            <Download className="h-4 w-4" />
            Скачать PNG
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-neutral-200 px-4 text-sm font-medium hover:bg-neutral-50"
          >
            Закрыть
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-neutral-500">
          Для печати на столбиках: скачайте PNG и вставьте в макет A6/A7.
        </p>
      </div>
    </div>
  );
}
