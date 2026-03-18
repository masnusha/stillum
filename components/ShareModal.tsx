"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Download, Check, Music } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShareTrackData {
  id:       string;
  title:    string;
  artist:   string;
  coverUrl: string | null;
}

interface Props {
  track:   ShareTrackData;
  onClose: () => void;
}

// ─── Social icons ─────────────────────────────────────────────────────────────

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

function VKIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.677-1.253.677-1.845 0-3.896-1.118-5.335-3.202C5.029 10.937 4.47 8.053 4.47 7.443c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.27-1.422 2.168-3.607 2.168-3.607.119-.254.322-.491.762-.491h1.744c.525 0 .643.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.491-.085.745-.576.745z"/>
    </svg>
  );
}

// ─── Stillum logo mark (inline SVG — same as Logo.tsx) ───────────────────────

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      width="1024" height="1024" viewBox="0 0 1024 1024"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#sm_clip)">
        <rect width="1024" height="1024" rx="180" fill="#0E1A2B" />
        <g opacity="0.45" style={{ mixBlendMode: "overlay" }}>
          <rect width="1024" height="1024" rx="200" fill="url(#sm_r0)" />
        </g>
        <g opacity="0.18" filter="url(#sm_f0)" style={{ mixBlendMode: "screen" }}>
          <rect x="692" y="83" width="110" height="950" fill="url(#sm_l1)" />
        </g>
        <g opacity="0.65" filter="url(#sm_f1)" style={{ mixBlendMode: "screen" }}>
          <rect x="729" y="83" width="36" height="950" fill="url(#sm_l2)" />
        </g>
        <rect opacity="0.9" x="743" y="83" width="9" height="950" fill="url(#sm_l3)" />
      </g>
      <defs>
        <filter id="sm_f0" x="522" y="-87" width="450" height="1290"
          filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="85" result="effect1_foregroundBlur_11_21" />
        </filter>
        <filter id="sm_f1" x="674" y="28" width="146" height="1060"
          filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="27.5" result="effect1_foregroundBlur_11_21" />
        </filter>
        <radialGradient id="sm_r0" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(743 342.5) rotate(91.5016) scale(515.177)">
          <stop stopColor="#0F2748" />
          <stop offset="1" stopColor="#071321" />
        </radialGradient>
        <linearGradient id="sm_l1" x1="747" y1="83" x2="747" y2="1033" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F2F1ED" stopOpacity="0" />
          <stop offset="0.5" stopColor="#F2F1ED" />
          <stop offset="1" stopColor="#F2F1ED" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sm_l2" x1="747" y1="83" x2="747" y2="1033" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F2F1ED" stopOpacity="0" />
          <stop offset="0.5" stopColor="#F2F1ED" />
          <stop offset="1" stopColor="#F2F1ED" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sm_l3" x1="747.5" y1="83" x2="747.5" y2="1033" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F2F2F2" stopOpacity="0" />
          <stop offset="0.5" stopColor="#F2F2F2" />
          <stop offset="1" stopColor="#F2F2F2" stopOpacity="0" />
        </linearGradient>
        <clipPath id="sm_clip">
          <rect width="1024" height="1024" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

export default function ShareModal({ track, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [trackUrl, setTrackUrl] = useState("");

  useEffect(() => {
    setTrackUrl(`${window.location.origin}/dashboard/track/${track.id}`);
  }, [track.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        width:  320,
        height: 568,
      });
      const a    = document.createElement("a");
      a.href     = dataUrl;
      a.download = `${track.title.replace(/[^\w\s-]/g, "").trim()}-stillum.png`;
      a.click();
      toast.success("Карточка сохранена");
    } catch {
      toast.error("Не удалось создать изображение");
    } finally {
      setLoading(false);
    }
  };

  const encodedUrl   = encodeURIComponent(trackUrl);
  const encodedText  = encodeURIComponent(`Слушай «${track.title}» на Stillum`);
  const encodedTitle = encodeURIComponent(`${track.title} — ${track.artist}`);
  const telegramHref = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  const vkHref       = `https://vk.com/share.php?url=${encodedUrl}&title=${encodedTitle}`;

  return (
    <AnimatePresence>
      <motion.div
        key="share-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md
                   flex items-center justify-center p-4 overflow-y-auto"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="share-panel"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative w-full max-w-[360px] rounded-3xl
                     bg-[#0C1018]/95 border border-white/[0.07]
                     shadow-[0_40px_80px_rgba(0,0,0,0.8)]
                     flex flex-col items-center pb-7"
          onMouseDown={(e) => e.stopPropagation()}
        >

          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="w-full flex items-center justify-between px-5 pt-5 pb-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
              Поделиться
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12]
                         flex items-center justify-center text-white/40 hover:text-white
                         transition-all duration-150"
            >
              <X size={13} strokeWidth={1.5} />
            </button>
          </div>

          {/* ── Promo card (html-to-image target) ─────────────────────── */}
          <div
            ref={cardRef}
            style={{
              width:      320,
              height:     568,
              flexShrink: 0,
              fontFamily: '"Neue Haas Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif',
            }}
            className="relative overflow-hidden rounded-2xl bg-black mx-5"
          >

            {/* Layer 0 — blurred cover fill */}
            {track.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.coverUrl}
                alt=""
                aria-hidden
                crossOrigin="anonymous"
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{ filter: "blur(100px)", transform: "scale(1.5)", opacity: 0.7 }}
              />
            ) : (
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/[0.05] to-transparent" />
            )}

            {/* Layer 1 — gradient scrim */}
            <div
              className="absolute inset-0 z-10"
              style={{
                background:
                  "linear-gradient(to top, #000000 0%, rgba(0,0,0,0.40) 50%, transparent 100%)",
              }}
            />

            {/* Layer 2 — content */}
            <div className="relative z-20 h-full flex flex-col items-center px-8 pt-12">

              {/* Cover art */}
              <div
                className="w-[210px] h-[210px] rounded-xl overflow-hidden flex-shrink-0
                           flex items-center justify-center"
                style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.8)" }}
              >
                {track.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                    <Music size={48} strokeWidth={0.75} className="text-white/20" />
                  </div>
                )}
              </div>

              {/* Track info */}
              <div className="w-full text-center mt-auto pb-2">
                <h2
                  className="text-white font-bold leading-tight tracking-tight line-clamp-2"
                  style={{ fontSize: 24 }}
                >
                  {track.title}
                </h2>
                <p className="text-white/70 mt-2 truncate" style={{ fontSize: 16 }}>
                  {track.artist}
                </p>
              </div>

              {/* Footer branding */}
              <div
                className="w-full flex items-center justify-center gap-2.5 pb-8 pt-4 mt-auto"
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
              >
                <LogoMark className="w-8 h-8 rounded-[5px] overflow-hidden flex-shrink-0" />
                <span
                  className="text-white font-semibold tracking-tight"
                  style={{ fontSize: 16, paddingTop: 2 }}
                >
                  Stillum
                </span>
              </div>

            </div>
          </div>

          {/* ── Action buttons ────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-4 mt-6 px-6">

            {/* Telegram */}
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group"
              aria-label="Поделиться в Telegram"
            >
              <span className="w-12 h-12 rounded-full bg-white/[0.05] hover:bg-white/[0.10]
                               border border-white/[0.08]
                               flex items-center justify-center
                               transition-all duration-150 group-hover:scale-105">
                <TelegramIcon className="w-5 h-5 text-[#229ED9]" />
              </span>
              <span className="text-[10px] text-white/30 group-hover:text-white/55 transition-colors">
                Telegram
              </span>
            </a>

            {/* VK */}
            <a
              href={vkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group"
              aria-label="Поделиться ВКонтакте"
            >
              <span className="w-12 h-12 rounded-full bg-white/[0.05] hover:bg-white/[0.10]
                               border border-white/[0.08]
                               flex items-center justify-center
                               transition-all duration-150 group-hover:scale-105">
                <VKIcon className="w-5 h-5 text-[#4C75A3]" />
              </span>
              <span className="text-[10px] text-white/30 group-hover:text-white/55 transition-colors">
                ВКонтакте
              </span>
            </a>

            {/* Copy link */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex flex-col items-center gap-2 group"
              aria-label="Копировать ссылку"
            >
              <span className={`w-12 h-12 rounded-full border flex items-center justify-center
                               transition-all duration-150 group-hover:scale-105
                ${copied
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-white/[0.05] border-white/[0.08] text-white/50 hover:bg-white/[0.10] hover:text-white hover:border-white/[0.15]"}`}
              >
                {copied ? <Check size={16} strokeWidth={2} /> : <Link2 size={16} strokeWidth={1.5} />}
              </span>
              <span className="text-[10px] text-white/30 group-hover:text-white/55 transition-colors">
                {copied ? "Скопировано" : "Ссылка"}
              </span>
            </button>

            {/* Download — accent */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading}
              className="flex flex-col items-center gap-2 group disabled:pointer-events-none disabled:opacity-50"
              aria-label="Скачать карточку"
            >
              <span className="w-12 h-12 rounded-full bg-white text-[#030712] font-medium
                               hover:bg-white/90 active:scale-95
                               flex items-center justify-center
                               transition-all duration-150 group-hover:scale-105">
                {loading
                  ? <span className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black/80 animate-spin" />
                  : <Download size={16} strokeWidth={2} />
                }
              </span>
              <span className="text-[10px] text-white/50 group-hover:text-white/70 transition-colors font-medium">
                {loading ? "Создаю…" : "Скачать"}
              </span>
            </button>

          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
