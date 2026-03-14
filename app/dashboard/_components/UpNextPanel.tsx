"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AudioLines } from "lucide-react";
import type { PlayerTrack } from "@/store/usePlayerStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number): string {
  if (!isFinite(s) || s <= 0) return "";
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Equalizer (same animation as TrackList) ──────────────────────────────────

function Equalizer() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-3">
      {([0, 0.2, 0.4] as const).map((delay, i) => (
        <span
          key={i}
          className="w-[2.5px] h-3 rounded-full bg-white/55 origin-bottom animate-equalizer"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen:        boolean;
  queue:         PlayerTrack[];
  currentTrack:  PlayerTrack | null;
  isPlaying:     boolean;
  onPlayFromQueue: (index: number) => void;
  onClose:       () => void;
}

// ─── UpNextPanel ──────────────────────────────────────────────────────────────

export default function UpNextPanel({
  isOpen, queue, currentTrack, isPlaying, onPlayFromQueue, onClose,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible backdrop — click outside to close */}
          <div
            className="fixed inset-0 z-[55]"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-[84px] right-4 md:right-6 w-80 md:w-[340px] max-h-[62vh] z-[60] flex flex-col rounded-2xl overflow-hidden border border-white/[0.08] bg-[#111318]/85 backdrop-blur-3xl shadow-2xl"
          >

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
              <p className="text-[13px] font-semibold text-white/80 tracking-tight">
                Up Next
              </p>
              <span className="text-[11px] text-white/25 tabular-nums">
                {queue.length} {queue.length === 1 ? "track" : "tracks"}
              </span>
            </div>

            {/* ── Track list ──────────────────────────────────────────────── */}
            {queue.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <p className="text-[12px] text-white/20">Queue is empty</p>
              </div>
            ) : (
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5"
              >
                {queue.map((track, i) => {
                  const isActive = track.id === currentTrack?.id;

                  return (
                    <button
                      key={`${track.id}-${i}`}
                      type="button"
                      onClick={() => onPlayFromQueue(i)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors duration-100 text-left group
                        ${isActive
                          ? "bg-white/[0.07]"
                          : "hover:bg-white/[0.05]"
                        }`}
                    >
                      {/* Cover / playing indicator */}
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.05] shrink-0 overflow-hidden flex items-center justify-center relative">
                        {track.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={track.coverUrl}
                            alt=""
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150
                              ${isActive ? "opacity-50" : "opacity-100 group-hover:opacity-60"}`}
                          />
                        ) : null}

                        {/* Equalizer — active + playing */}
                        {isActive && isPlaying && (
                          <div className="relative z-10">
                            <Equalizer />
                          </div>
                        )}

                        {/* AudioLines icon — active + paused */}
                        {isActive && !isPlaying && (
                          <AudioLines
                            size={13}
                            strokeWidth={1.5}
                            className="relative z-10 text-white/50"
                          />
                        )}

                        {/* Track number — not active */}
                        {!isActive && !track.coverUrl && (
                          <span className="text-[10px] text-white/20 tabular-nums select-none">
                            {i + 1}
                          </span>
                        )}
                      </div>

                      {/* Title + Artist */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-medium truncate leading-snug transition-colors
                          ${isActive ? "text-white" : "text-white/70 group-hover:text-white/90"}`}
                        >
                          {track.title}
                        </p>
                        <p className="text-[11px] text-white/30 truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>

                      {/* Duration */}
                      {track.duration > 0 && (
                        <span className="text-[10px] font-mono text-white/20 shrink-0 tabular-nums">
                          {fmt(track.duration)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
