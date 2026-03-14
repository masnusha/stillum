"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, Check, Loader2 } from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";

// ─── getCroppedImg ────────────────────────────────────────────────────────────

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: string = "image/jpeg",
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
        resolve(new File([blob], "cropped.jpg", { type: mimeType }));
      },
      mimeType,
      0.92,
    );
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ImageCropperModalProps {
  src:       string;
  aspect:    number;
  cropShape: "round" | "rect";
  onApply:   (file: File) => void;
  onCancel:  () => void;
}

// ─── ImageCropperModal ────────────────────────────────────────────────────────

export default function ImageCropperModal({
  src,
  aspect,
  cropShape,
  onApply,
  onCancel,
}: ImageCropperModalProps) {
  const [crop,              setCrop]              = useState({ x: 0, y: 0 });
  const [zoom,              setZoom]              = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying,          setApplying]          = useState(false);

  const isAvatar = cropShape === "round";

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleApply() {
    if (!croppedAreaPixels) return;
    setApplying(true);
    try {
      const file = await getCroppedImg(src, croppedAreaPixels);
      onApply(file);
    } catch {
      // silently fail — user can retry
    } finally {
      setApplying(false);
    }
  }

  const zoomPct = ((zoom - 1) / 2) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0, y: 12 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{    scale: 0.97, opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        className="w-[90vw] max-w-4xl flex flex-col bg-[#0a0a0c] border border-white/[0.07] rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-7 pt-6 pb-5">
          <div>
            <h3 className="text-[16px] font-semibold text-white/90 leading-none">
              {isAvatar ? "Кадрирование аватарки" : "Кадрирование фона профиля"}
            </h3>
            <p className="text-[12px] text-white/30 mt-1.5">
              {isAvatar
                ? "Выровняй и обрежь по кругу"
                : "Выбери лучший горизонтальный кадр"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.07] flex items-center justify-center transition-colors"
          >
            <X size={15} className="text-white/40" />
          </button>
        </div>

        {/* ── Cropper — edge-to-edge ── */}
        <div
          className="relative w-full bg-black"
          style={{ height: isAvatar ? "min(60vh, 520px)" : "min(55vh, 400px)" }}
        >
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#000" },
              mediaStyle:     {},
              cropAreaStyle:  {
                border: "1.5px solid rgba(255,255,255,0.55)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
                ...(cropShape === "round"
                  ? { borderRadius: "50%" }
                  : { borderRadius: "12px" }),
              },
            }}
          />
        </div>

        {/* ── Footer: zoom slider + actions ── */}
        <div className="flex items-center justify-between gap-8 px-7 py-5">

          {/* Zoom slider */}
          <div className="flex items-center gap-3 flex-1 max-w-xs">
            <ZoomIn size={13} className="text-white/25 shrink-0" />
            <div className="relative flex-1 h-[2px] bg-white/[0.08] rounded-full">
              {/* Fill */}
              <div
                className="absolute left-0 top-0 h-full bg-white/30 rounded-full pointer-events-none"
                style={{ width: `${zoomPct}%` }}
              />
              {/* Invisible range input for interaction */}
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-5 -top-1.5"
              />
              {/* Custom thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.25)] pointer-events-none"
                style={{ left: `calc(${zoomPct}% - 7px)` }}
              />
            </div>
            <span className="text-[11px] text-white/20 w-7 text-right tabular-nums">
              {zoom.toFixed(1)}×
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-white/[0.10] text-white/45 hover:text-white/70 hover:border-white/20 transition-all text-[13px]"
            >
              <X size={13} strokeWidth={2} />
              Отмена
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-white text-black text-[13px] font-semibold hover:bg-white/90 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {applying
                ? <Loader2 size={13} className="animate-spin" />
                : <Check size={13} strokeWidth={2.5} />
              }
              {applying ? "Применение…" : "Применить"}
            </button>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
