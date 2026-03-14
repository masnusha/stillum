"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CROP_SIZE   = 312; // px — square viewport shown to the user
const OUTPUT_SIZE = 800; // px — canvas output resolution

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  /** Object URL of the original image (created by parent, revoked by parent). */
  imageUrl:  string;
  onConfirm: (blob: Blob) => void;
  onClose:   () => void;
  /** When true: shows a circular preview and outputs a circular PNG. */
  circular?: boolean;
}

// ─── CoverCropModal ───────────────────────────────────────────────────────────

export default function CoverCropModal({ imageUrl, onConfirm, onClose, circular = false }: Props) {
  const imgRef   = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [minZoom, setMinZoom]         = useState(1);
  const [zoom, setZoom]               = useState(1);
  const [offset, setOffset]           = useState({ x: 0, y: 0 });
  const [applying, setApplying]       = useState(false);

  const isDragging    = useRef(false);
  const dragOrigin    = useRef({ x: 0, y: 0 });
  const offsetOnDrag  = useRef({ x: 0, y: 0 });

  // ── Clamp offset so image always covers the full crop viewport ───────────────
  const clamp = useCallback(
    (ox: number, oy: number, z: number): { x: number; y: number } => {
      const { w, h } = naturalSize;
      if (w === 0 || h === 0) return { x: ox, y: oy };
      const maxX = Math.max(0, (w * z - CROP_SIZE) / 2);
      const maxY = Math.max(0, (h * z - CROP_SIZE) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, ox)),
        y: Math.max(-maxY, Math.min(maxY, oy)),
      };
    },
    [naturalSize]
  );

  // ── On image load: compute initial "cover" zoom ──────────────────────────────
  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const mz = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setMinZoom(mz);
    setZoom(mz);
    setOffset({ x: 0, y: 0 });
  };

  // ── Pointer drag ─────────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current   = true;
    dragOrigin.current   = { x: e.clientX, y: e.clientY };
    offsetOnDrag.current = offset;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const raw = {
      x: offsetOnDrag.current.x + (e.clientX - dragOrigin.current.x),
      y: offsetOnDrag.current.y + (e.clientY - dragOrigin.current.y),
    };
    setOffset(clamp(raw.x, raw.y, zoom));
  };

  const onPointerUp = () => { isDragging.current = false; };

  // ── Scroll to zoom ───────────────────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const next = Math.max(minZoom, Math.min(minZoom * 4, zoom * (1 - e.deltaY * 0.001)));
    setZoom(next);
    setOffset(prev => clamp(prev.x, prev.y, next));
  };

  // ── Slider ───────────────────────────────────────────────────────────────────
  const onSliderChange = (v: number) => {
    setZoom(v);
    setOffset(prev => clamp(prev.x, prev.y, v));
  };

  // ── Canvas crop & output ─────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (naturalSize.w === 0 || applying) return;
    setApplying(true);

    try {
      const { w, h } = naturalSize;
      const imgCenterX = CROP_SIZE / 2 + offset.x;
      const imgCenterY = CROP_SIZE / 2 + offset.y;
      const imgLeft    = imgCenterX - (w * zoom) / 2;
      const imgTop     = imgCenterY - (h * zoom) / 2;

      // Source rectangle in the original image's pixel space
      const sx = (0 - imgLeft) / zoom;
      const sy = (0 - imgTop)  / zoom;
      const sw = CROP_SIZE / zoom;
      const sh = CROP_SIZE / zoom;

      // Load image fresh (avoids taint issues with refs)
      const img = new Image();
      img.src   = imageUrl;
      await new Promise<void>(res => { img.onload = () => res(); });

      const canvas = document.createElement("canvas");
      canvas.width  = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setApplying(false); return; }

      // For circular mode: clip canvas to a perfect circle before drawing
      if (circular) {
        ctx.beginPath();
        ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
        ctx.clip();
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      canvas.toBlob(blob => {
        if (blob) onConfirm(blob);
        setApplying(false);
      }, circular ? "image/png" : "image/jpeg", circular ? 1 : 0.92);
    } catch {
      setApplying(false);
    }
  };

  // ── Progress fill for the zoom slider ────────────────────────────────────────
  const zoomPct = minZoom > 0
    ? Math.round(((zoom - minZoom) / (minZoom * 3)) * 100)
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        key="crop-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[220] flex items-center justify-center p-4 backdrop-blur-lg bg-black/70"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="crop-modal"
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1,    y: 0 }}
          exit={{ opacity: 0, scale: 0.97,    y: 8 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm bg-[#050A15] border border-white/[0.07] rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <p className="text-[13px] font-semibold text-white/80 tracking-tight">
              {circular ? "Выбор фото профиля" : "Select thumbnail"}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-white/20 hover:text-white/60 transition-colors"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* ── Crop viewport ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-center bg-black" style={{ height: CROP_SIZE }}>
            <div
              className="relative overflow-hidden select-none"
              style={{ width: CROP_SIZE, height: CROP_SIZE, cursor: isDragging.current ? "grabbing" : "grab" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onWheel={onWheel}
            >
              {/* The image — positioned with translate + scale from center */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt=""
                onLoad={handleImageLoad}
                draggable={false}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                  transformOrigin: "center",
                  maxWidth: "none",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />

              {/* Square mode: corner bracket guides + grid */}
              {!circular && (
                <>
                  {(
                    [
                      "top-0 left-0 border-t-2 border-l-2 rounded-tl-sm",
                      "top-0 right-0 border-t-2 border-r-2 rounded-tr-sm",
                      "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-sm",
                      "bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm",
                    ] as const
                  ).map((cls, i) => (
                    <div
                      key={i}
                      aria-hidden
                      className={`absolute w-4 h-4 border-white/70 pointer-events-none ${cls}`}
                    />
                  ))}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                      backgroundSize: `${CROP_SIZE / 3}px ${CROP_SIZE / 3}px`,
                    }}
                  />
                </>
              )}

              {/* Circle mode: radial dark overlay + circular border ring */}
              {circular && (
                <>
                  {/* Darken the area outside the circle */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle ${CROP_SIZE / 2}px at center, transparent ${CROP_SIZE / 2 - 1}px, rgba(0,0,0,0.65) ${CROP_SIZE / 2}px)`,
                    }}
                  />
                  {/* Circle border ring */}
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-full border-2 border-white/50 pointer-events-none"
                  />
                </>
              )}
            </div>
          </div>

          {/* ── Hint ────────────────────────────────────────────────────────── */}
          <p className="text-center text-[10px] text-white/15 pt-3 tracking-wide">
            Drag to reposition · scroll or slide to zoom
          </p>

          {/* ── Zoom slider ─────────────────────────────────────────────────── */}
          <div className="px-5 pt-2 pb-4 flex items-center gap-3">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => onSliderChange(Math.max(minZoom, zoom - minZoom * 0.15))}
              className="text-white/25 hover:text-white/60 transition-colors shrink-0"
            >
              <ZoomOut size={15} strokeWidth={1.5} />
            </button>

            {/* Custom track */}
            <div className="relative flex-1 h-[3px] rounded-full bg-white/[0.08]">
              {/* Fill */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white/30 pointer-events-none"
                style={{ width: `${zoomPct}%` }}
              />
              <input
                type="range"
                min={minZoom}
                max={minZoom * 4}
                step={0.001}
                value={zoom}
                onChange={e => onSliderChange(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                aria-label="Zoom level"
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none"
                style={{ left: `calc(${zoomPct}% - 7px)` }}
              />
            </div>

            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => onSliderChange(Math.min(minZoom * 4, zoom + minZoom * 0.15))}
              className="text-white/25 hover:text-white/60 transition-colors shrink-0"
            >
              <ZoomIn size={15} strokeWidth={1.5} />
            </button>
          </div>

          {/* ── Actions ─────────────────────────────────────────────────────── */}
          <div className="px-5 pb-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-white/40 hover:text-white/70 text-[13px] font-medium py-2.5 rounded-xl transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={applying || naturalSize.w === 0}
              className="flex-1 bg-white text-[#050A15] text-[13px] font-semibold py-2.5 rounded-xl hover:bg-white/90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              {applying ? "Applying…" : "Apply"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
