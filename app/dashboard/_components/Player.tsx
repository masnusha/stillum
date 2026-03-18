"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play, Pause,
  SkipBack, SkipForward,
  Volume2, VolumeX,
  Shuffle, Repeat, Repeat1,
  Check, ListMusic, Maximize2, PanelRight, Lock,
} from "lucide-react";
import { toast } from "sonner";
import UpNextPanel from "./UpNextPanel";
import ExpandedPlayer from "./ExpandedPlayer";
import { usePlayerStore } from "@/store/usePlayerStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number): string {
  if (!isFinite(s) || s <= 0) return "0:00";
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Audio quality ────────────────────────────────────────────────────────────

type AudioQuality = "Original" | "High" | "Standard";

const QUALITY_OPTIONS: { value: AudioQuality; label: string; sub: string }[] = [
  { value: "Original", label: "Original",  sub: "Lossless"  },
  { value: "High",     label: "High",      sub: "320 kbps"  },
  { value: "Standard", label: "Standard",  sub: "128 kbps"  },
];

const QUALITY_BADGE: Record<AudioQuality, string> = {
  Original: "LOSSLESS",
  High:     "HQ",
  Standard: "SQ",
};

// ─── Player ───────────────────────────────────────────────────────────────────

interface PlayerProps {
  userId: string;
}

export default function Player({ userId }: PlayerProps) {
  const audioRef   = useRef<HTMLAudioElement>(null);
  const scrubRef   = useRef<HTMLDivElement>(null);
  const volumeRef  = useRef<HTMLDivElement>(null);

  const { currentTrack, isPlaying, volume, queue, repeatMode, isShuffle,
          isSidebarOpen, togglePlay, setVolume, stop, playNext, playPrevious,
          toggleRepeatMode, toggleShuffle, toggleSidebar, playFromQueue } =
    usePlayerStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);

  // ── Playback scrubbing state ────────────────────────────────────────────────
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime,   setScrubTime]   = useState(0);

  // ── Volume scrubbing state ──────────────────────────────────────────────────
  const [isVolumeScrubbing, setIsVolumeScrubbing] = useState(false);
  const [scrubVolume,       setScrubVolume]       = useState(volume);

  // What to display: live audio time OR scrub preview time
  const displayTime     = isScrubbing ? scrubTime : currentTime;
  const displayProgress = duration > 0 ? displayTime / duration : 0;

  // ── Mute memory ─────────────────────────────────────────────────────────────
  const premuteVolume = useRef(volume);

  // ── Queue panel ─────────────────────────────────────────────────────────────
  const [isQueueOpen,  setIsQueueOpen]  = useState(false);

  // ── Expanded player ──────────────────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Audio quality ────────────────────────────────────────────────────────────
  const { data: session } = useSession();
  const isPlus = session?.user?.plan === "PLUS";

  const [audioQuality,    setAudioQuality]    = useState<AudioQuality>("Standard");
  const [isQualityOpen,   setIsQualityOpen]   = useState(false);
  const [toastMsg,        setToastMsg]        = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qualityMenuRef = useRef<HTMLDivElement>(null);

  // Once session loads: default Plus users to Original, lock Free users to Standard.
  useEffect(() => {
    if (session) {
      setAudioQuality(isPlus ? "Original" : "Standard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.plan]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3500);
  };

  const PLUS_ONLY: AudioQuality[] = ["Original", "High"];

  const handleSelectQuality = (q: AudioQuality) => {
    if (!isPlus && PLUS_ONLY.includes(q)) {
      toast("Доступно только с подпиской Stillum PLUS", { icon: "🔒" });
      setIsQualityOpen(false);
      return;
    }
    setAudioQuality(q);
    setIsQualityOpen(false);
    if (q !== "Original") {
      showToast("Transcoding engine for lower bitrates is coming soon.");
    }
  };

  // Close quality menu on outside click.
  useEffect(() => {
    if (!isQualityOpen) return;
    const onDown = (e: MouseEvent) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target as Node)) {
        setIsQualityOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isQualityOpen]);

  // ── Skip-back debounce: 1 click = restart, 2+ clicks = previous ─────────────
  const prevClickCount = useRef(0);
  const prevClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePrevious = () => {
    prevClickCount.current += 1;
    if (prevClickTimer.current) clearTimeout(prevClickTimer.current);
    prevClickTimer.current = setTimeout(() => {
      if (prevClickCount.current >= 2) {
        playPrevious();
      } else {
        const audio = audioRef.current;
        if (audio) { audio.currentTime = 0; setCurrentTime(0); }
      }
      prevClickCount.current = 0;
    }, 300);
  };

  // ── Track change ────────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentTrack) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    audio.src = currentTrack.audioUrl;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play().catch((e) => console.error("[Player] autoplay:", e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // ── isPlaying sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.play().catch((e) => console.error("[Player] play:", e));
    } else {
      audio.pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // ── Volume sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    // Keep scrubVolume in sync when volume changes from outside (e.g. mute button).
    if (!isVolumeScrubbing) setScrubVolume(volume);
  }, [volume]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio events ────────────────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    // Block live updates while the user is dragging the scrubber.
    if (isScrubbing) return;
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration);
  };

  const handleEnded = () => {
    const { repeatMode } = usePlayerStore.getState();

    if (repeatMode === "one") {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      setCurrentTime(0);
      audio.play().catch((e) => console.error("[Player] repeat-one:", e));
      return;
    }

    // "all" wraps to queue[0]; "off" stops at end — both handled inside playNext().
    playNext();
    // If playNext stopped playback (end of queue, repeat off), reset progress.
    if (!usePlayerStore.getState().isPlaying) setCurrentTime(0);
  };

  // ── Scrubber pointer events ─────────────────────────────────────────────────

  const calcScrubTime = (e: React.PointerEvent<HTMLDivElement>): number => {
    const bar = scrubRef.current;
    if (!bar || !duration) return 0;
    const { left, width } = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - left) / width)) * duration;
  };

  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = calcScrubTime(e);
    setScrubTime(t);
    setIsScrubbing(true);
  };

  const handleScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    setScrubTime(calcScrubTime(e));
  };

  const handleScrubPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const t = calcScrubTime(e);
    setScrubTime(t);
    setIsScrubbing(false);
    const audio = audioRef.current;
    if (audio) { audio.currentTime = t; setCurrentTime(t); }
  };

  // ── Volume scrubber pointer events ─────────────────────────────────────────

  const calcVolume = (e: React.PointerEvent<HTMLDivElement>): number => {
    const bar = volumeRef.current;
    if (!bar) return 0;
    const { left, width } = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - left) / width));
  };

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = calcVolume(e);
    setScrubVolume(v);
    setIsVolumeScrubbing(true);
  };

  const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isVolumeScrubbing) return;
    const v = calcVolume(e);
    setScrubVolume(v);
    // Apply directly to the audio element for zero-latency real-time feedback.
    if (audioRef.current) audioRef.current.volume = v;
  };

  const handleVolumePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isVolumeScrubbing) return;
    const v = calcVolume(e);
    setScrubVolume(v);
    setIsVolumeScrubbing(false);
    if (v > 0) premuteVolume.current = v;
    setVolume(v);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="fixed bottom-0 left-0 w-full h-[72px] z-50 backdrop-blur-2xl bg-[#030712]/85 border-t border-white/[0.04]">
        <div className="flex items-center h-full px-5 gap-4">

          {/* ── LEFT: now-playing ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3 w-56 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.04] shrink-0 overflow-hidden flex items-center justify-center">
              {currentTrack?.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : currentTrack ? (
                <div className="w-3.5 h-3.5 rounded-sm bg-white/[0.08]" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              {currentTrack ? (
                <>
                  <p className="text-[12px] font-medium text-white/80 truncate leading-tight">{currentTrack.title}</p>
                  {currentTrack.ownerId ? (
                    <Link
                      href={`/dashboard/profile/${currentTrack.ownerId}`}
                      className="text-[11px] text-white/30 hover:text-white/60 truncate mt-0.5 transition-colors block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {currentTrack.artist}
                    </Link>
                  ) : (
                    <p className="text-[11px] text-white/30 truncate mt-0.5">{currentTrack.artist}</p>
                  )}
                </>
              ) : (
                <>
                  <div className="w-24 h-[7px] rounded-full bg-white/[0.07]" />
                  <div className="w-14 h-[5px] rounded-full bg-white/[0.04] mt-1.5" />
                </>
              )}
            </div>
          </div>

          {/* ── CENTER: transport + scrubber ──────────────────────────────── */}
          <div className="flex-1 flex flex-col items-center gap-1.5">

            {/* Transport buttons */}
            <div className="flex items-center gap-4">
              <button
                aria-label={isShuffle ? "Shuffle on" : "Shuffle off"}
                onClick={toggleShuffle}
                className={`relative transition-all duration-150 active:scale-95
                  ${isShuffle
                    ? "text-white/80 hover:text-white"
                    : "text-white/20 hover:text-white/55"
                  }`}
              >
                <Shuffle size={13} strokeWidth={1.5} />
                {isShuffle && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-white/60" />
                )}
              </button>

              <button
                aria-label="Previous"
                onClick={handlePrevious}
                disabled={!currentTrack}
                className="text-white/25 hover:text-white/70 transition-all duration-150 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <SkipBack size={15} strokeWidth={1.5} />
              </button>

              <button
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={togglePlay}
                disabled={!currentTrack}
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.07] flex items-center justify-center transition-all duration-150 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isPlaying
                  ? <Pause size={12} strokeWidth={1.5} className="text-white/80" />
                  : <Play  size={12} strokeWidth={1.5} className="text-white/80 translate-x-[1px]" />
                }
              </button>

              <button
                aria-label="Next"
                onClick={playNext}
                disabled={(() => {
                  if (!currentTrack) return true;
                  if (repeatMode === "all") return false;
                  const idx = queue.findIndex((t) => t.id === currentTrack.id);
                  return idx >= queue.length - 1;
                })()}
                className="text-white/25 hover:text-white/70 transition-all duration-150 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <SkipForward size={15} strokeWidth={1.5} />
              </button>

              <button
                aria-label={repeatMode === "off" ? "Repeat off" : repeatMode === "all" ? "Repeat all" : "Repeat one"}
                onClick={toggleRepeatMode}
                className={`relative transition-all duration-150 active:scale-95
                  ${repeatMode === "off"
                    ? "text-white/20 hover:text-white/55"
                    : "text-white/80 hover:text-white"
                  }`}
              >
                {repeatMode === "one"
                  ? <Repeat1 size={13} strokeWidth={1.5} />
                  : <Repeat  size={13} strokeWidth={1.5} />
                }
                {/* Active dot indicator */}
                {repeatMode !== "off" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-white/60" />
                )}
              </button>
            </div>

            {/* Scrubber row */}
            <div className="w-full max-w-sm flex items-center gap-2.5">

              {/* Current time */}
              <span className="w-10 text-[10px] font-mono font-medium tracking-wider text-white/40 tabular-nums text-right shrink-0 select-none">
                {fmt(displayTime)}
              </span>

              {/* Track — pointer events for smooth scrubbing */}
              <div
                ref={scrubRef}
                onPointerDown={handleScrubPointerDown}
                onPointerMove={handleScrubPointerMove}
                onPointerUp={handleScrubPointerUp}
                onPointerCancel={handleScrubPointerUp}
                role="slider"
                aria-label="Playback position"
                aria-valuenow={Math.round(displayProgress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className={`relative flex-1 flex items-center group/scrubber select-none
                  ${currentTrack ? "cursor-pointer" : "cursor-default"}`}
                style={{ height: "16px" }}   /* tall hit area, invisible */
              >
                {/* Visual track — grows on hover/scrub */}
                <div
                  className={`w-full rounded-full bg-white/[0.08] transition-all duration-150 overflow-hidden
                    ${isScrubbing
                      ? "h-1.5"
                      : "h-[3px] group-hover/scrubber:h-1.5"
                    }`}
                >
                  {/* Fill */}
                  <div
                    className={`h-full rounded-full transition-colors duration-150
                      ${isScrubbing
                        ? "bg-white/75"
                        : "bg-white/40 group-hover/scrubber:bg-white/65"
                      }`}
                    style={{ width: `${displayProgress * 100}%` }}
                  />
                </div>

                {/* Thumb — hidden at rest, visible on hover and while scrubbing */}
                <div
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md pointer-events-none transition-opacity duration-150
                    ${isScrubbing
                      ? "opacity-100"
                      : "opacity-0 group-hover/scrubber:opacity-100"
                    }`}
                  style={{ left: `${displayProgress * 100}%` }}
                />
              </div>

              {/* Total duration */}
              <span className="w-10 text-[10px] font-mono font-medium tracking-wider text-white/40 tabular-nums text-left shrink-0 select-none">
                {fmt(duration)}
              </span>

            </div>
          </div>

          {/* ── RIGHT: quality badge + volume ────────────────────────────── */}
          <div className="flex items-center gap-3 w-56 justify-end shrink-0">
            {/* Queue toggle */}
            <button
              type="button"
              onClick={() => setIsQueueOpen((v) => !v)}
              aria-label="Up Next"
              className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150
                ${isQueueOpen
                  ? "bg-white/[0.1] text-white/90"
                  : "text-white/35 hover:text-white/70"
                }`}
            >
              <ListMusic size={13} strokeWidth={1.5} />
            </button>

            {/* Now Playing sidebar toggle */}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Now Playing details"
              disabled={!currentTrack}
              className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed
                ${isSidebarOpen
                  ? "bg-white/[0.1] text-white/90"
                  : "text-white/35 hover:text-white/70"
                }`}
            >
              <PanelRight size={13} strokeWidth={1.5} />
            </button>

            {/* Quality selector */}
            <div ref={qualityMenuRef} className="relative flex items-center">

              {/* Badge trigger */}
              <button
                type="button"
                onClick={() => setIsQualityOpen((v) => !v)}
                className={`px-1.5 py-0.5 border rounded-[3px] text-[9px] font-bold tracking-widest uppercase transition-all duration-150 select-none
                  ${isQualityOpen
                    ? "border-white/25 text-white/75"
                    : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                  }`}
              >
                {QUALITY_BADGE[audioQuality]}
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {isQualityOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1,    y: 0 }}
                    exit={{    opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{ transformOrigin: "bottom right" }}
                    className="absolute bottom-full mb-2 right-0 w-44 bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/[0.09] rounded-xl shadow-2xl overflow-hidden z-[60]"
                  >
                    {/* Header */}
                    <div className="px-3 pt-2.5 pb-1.5 border-b border-white/[0.06]">
                      <p className="text-[9px] font-semibold tracking-widest uppercase text-white/25">
                        Audio Quality
                      </p>
                    </div>

                    {/* Options */}
                    <div className="py-1">
                      {QUALITY_OPTIONS.map(({ value, label, sub }) => {
                        const locked = !isPlus && PLUS_ONLY.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleSelectQuality(value)}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors duration-100
                              ${locked
                                ? "opacity-50 hover:bg-white/[0.04]"
                                : "hover:bg-white/[0.07]"
                              }`}
                          >
                            <span>
                              <span className="block text-[12px] text-white/75 leading-tight">
                                {label}
                              </span>
                              <span className="block text-[10px] text-white/30 mt-0.5">
                                {sub}
                              </span>
                            </span>
                            {locked
                              ? <Lock size={11} strokeWidth={1.5} className="text-white/35 shrink-0" />
                              : audioQuality === value
                                ? <Check size={12} strokeWidth={2} className="text-white/60 shrink-0" />
                                : null
                            }
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => {
                if (volume > 0) {
                  premuteVolume.current = volume;
                  setVolume(0);
                  setScrubVolume(0);
                } else {
                  const restored = premuteVolume.current > 0 ? premuteVolume.current : 1;
                  setVolume(restored);
                  setScrubVolume(restored);
                }
              }}
              aria-label={volume === 0 ? "Unmute" : "Mute"}
              className="text-white/20 hover:text-white/50 transition-colors shrink-0"
            >
              {(isVolumeScrubbing ? scrubVolume : volume) === 0
                ? <VolumeX size={13} strokeWidth={1.5} />
                : <Volume2 size={13} strokeWidth={1.5} />
              }
            </button>

            {/* Volume scrubber */}
            <div
              ref={volumeRef}
              onPointerDown={handleVolumePointerDown}
              onPointerMove={handleVolumePointerMove}
              onPointerUp={handleVolumePointerUp}
              onPointerCancel={handleVolumePointerUp}
              role="slider"
              aria-label="Volume"
              aria-valuenow={Math.round((isVolumeScrubbing ? scrubVolume : volume) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="relative flex items-center group/vol cursor-pointer select-none"
              style={{ width: "80px", height: "16px" }}
            >
              {/* Visual track */}
              <div
                className={`w-full rounded-full bg-white/[0.08] transition-all duration-150 overflow-hidden
                  ${isVolumeScrubbing
                    ? "h-1.5"
                    : "h-[3px] group-hover/vol:h-1.5"
                  }`}
              >
                {/* Fill */}
                <div
                  className={`h-full rounded-full transition-colors duration-150
                    ${isVolumeScrubbing
                      ? "bg-white/75"
                      : "bg-white/[0.2] group-hover/vol:bg-white/40"
                    }`}
                  style={{ width: `${(isVolumeScrubbing ? scrubVolume : volume) * 100}%` }}
                />
              </div>

              {/* Thumb */}
              <div
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md pointer-events-none transition-opacity duration-150
                  ${isVolumeScrubbing
                    ? "opacity-100"
                    : "opacity-0 group-hover/vol:opacity-100"
                  }`}
                style={{ left: `${(isVolumeScrubbing ? scrubVolume : volume) * 100}%` }}
              />
            </div>

            {/* Expand to full-screen player */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              aria-label="Expand player"
              disabled={!currentTrack}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-white/35 hover:text-white/70 transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <Maximize2 size={13} strokeWidth={1.5} />
            </button>
          </div>

        </div>
      </div>
      {/* ── Up Next panel ───────────────────────────────────────────────── */}
      <UpNextPanel
        isOpen={isQueueOpen}
        queue={queue}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayFromQueue={(i) => { playFromQueue(i); setIsQueueOpen(false); }}
        onClose={() => setIsQueueOpen(false)}
      />

      {/* ── Expanded full-screen player ─────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <ExpandedPlayer
            onClose={() => setIsExpanded(false)}
            audioRef={audioRef}
            currentTime={currentTime}
            duration={duration}
            setCurrentTime={setCurrentTime}
            onPrevious={handlePrevious}
            userId={userId}
          />
        )}
      </AnimatePresence>

      {/* ── Toast notification ──────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{    opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed bottom-[84px] left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/[0.09] rounded-xl shadow-2xl text-[12px] text-white/60 whitespace-nowrap pointer-events-none"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
