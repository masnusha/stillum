"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Play, Pause,
  SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1,
  ChevronDown,
  Volume2, VolumeX,
} from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import TrackContextMenu from "./TrackContextMenu";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number): string {
  if (!isFinite(s) || s <= 0) return "0:00";
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onClose:        () => void;
  audioRef:       React.RefObject<HTMLAudioElement | null>;
  currentTime:    number;
  duration:       number;
  setCurrentTime: (t: number) => void;
  onPrevious:     () => void;
  userId:         string;
}

// ─── ExpandedPlayer ───────────────────────────────────────────────────────────

export default function ExpandedPlayer({
  onClose, audioRef, currentTime, duration, setCurrentTime, onPrevious,
}: Props) {
  const router = useRouter();

  const {
    currentTrack, isPlaying, volume, isShuffle, repeatMode,
    togglePlay, setVolume, toggleShuffle, toggleRepeatMode, playNext,
  } = usePlayerStore();

  // After deleting the currently playing track: skip + close + refresh library.
  const handleDeleted = () => {
    playNext();
    onClose();
    router.refresh();
  };

  // ── Local scrubbing state ────────────────────────────────────────────────
  const scrubRef                        = useRef<HTMLDivElement>(null);
  const [isScrubbing,   setIsScrubbing] = useState(false);
  const [scrubTime,     setScrubTime]   = useState(0);

  const displayTime     = isScrubbing ? scrubTime : currentTime;
  const displayProgress = duration > 0 ? displayTime / duration : 0;

  const calcScrubTime = (e: React.PointerEvent<HTMLDivElement>): number => {
    const bar = scrubRef.current;
    if (!bar || !duration) return 0;
    const { left, width } = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - left) / width)) * duration;
  };

  const handleScrubDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubTime(calcScrubTime(e));
    setIsScrubbing(true);
  };
  const handleScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    setScrubTime(calcScrubTime(e));
  };
  const handleScrubUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const t = calcScrubTime(e);
    setScrubTime(t);
    setIsScrubbing(false);
    const audio = audioRef.current;
    if (audio) { audio.currentTime = t; setCurrentTime(t); }
  };

  // ── Volume ────────────────────────────────────────────────────────────────
  const premuteVolume  = useRef(volume);
  const volumeScrubRef = useRef<HTMLDivElement>(null);
  const [isVolumeScrubbing, setIsVolumeScrubbing] = useState(false);
  const [scrubVolume,       setScrubVolume]       = useState(volume);

  const calcVol = (e: React.PointerEvent<HTMLDivElement>): number => {
    const bar = volumeScrubRef.current;
    if (!bar) return 0;
    const { left, width } = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - left) / width));
  };

  const handleVolDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubVolume(calcVol(e)); setIsVolumeScrubbing(true);
  };
  const handleVolMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isVolumeScrubbing) return;
    const v = calcVol(e); setScrubVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };
  const handleVolUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isVolumeScrubbing) return;
    const v = calcVol(e);
    setScrubVolume(v); setIsVolumeScrubbing(false);
    if (v > 0) premuteVolume.current = v;
    setVolume(v);
  };

  const displayVol = isVolumeScrubbing ? scrubVolume : volume;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 260 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
    >
      {/* Blurred cover background */}
      <div className="absolute inset-0 bg-[#050A15]">
        {currentTrack?.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentTrack.coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-125 opacity-25 blur-[80px]"
          />
        )}
        <div className="absolute inset-0 bg-[#050A15]/60" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col h-full">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-10 pb-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Collapse player"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-all duration-150"
          >
            <ChevronDown size={20} strokeWidth={1.5} />
          </button>

          <p className="text-[11px] font-medium tracking-widest uppercase text-white/25 select-none">
            Now Playing
          </p>

          <div className="w-9" />
        </div>

        {/* Album art */}
        <div className="flex-1 flex items-center justify-center px-10 py-4 min-h-0">
          <div
            className="w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-2xl"
            style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}
          >
            {currentTrack?.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.coverUrl}
                alt="Album art"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <div className="w-16 h-16 rounded-xl bg-white/[0.06]" />
              </div>
            )}
          </div>
        </div>

        {/* Controls area */}
        <div className="w-full max-w-xl mx-auto px-8 pb-14 shrink-0 flex flex-col gap-5">

          {/* Track info */}
          <div className="flex items-center justify-between w-full gap-4">

            {/* Left — title + artist */}
            <div className="flex flex-col gap-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-2xl font-bold text-white truncate leading-tight tracking-tight">
                  {currentTrack?.title ?? "—"}
                </h1>
                {currentTrack?.isExplicit && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-[4px] bg-white/20 text-[11px] font-bold text-white shrink-0 select-none">
                    E
                  </span>
                )}
              </div>
              {currentTrack?.ownerId ? (
                <Link
                  href={`/dashboard/profile/${currentTrack.ownerId}`}
                  className="text-[15px] text-white/45 hover:text-white/70 truncate transition-colors"
                >
                  {currentTrack.artist}
                </Link>
              ) : (
                <p className="text-[15px] text-white/45 truncate">
                  {currentTrack?.artist ?? ""}
                </p>
              )}
            </div>

            {/* Right — context menu */}
            {currentTrack && (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0">
                <TrackContextMenu
                  alwaysVisible
                  onDeleted={handleDeleted}
                  track={{
                    id:          currentTrack.id,
                    title:       currentTrack.title,
                    artist:      currentTrack.artist,
                    audioUrl:    currentTrack.audioUrl,
                    coverUrl:    currentTrack.coverUrl,
                    isExplicit:    currentTrack.isExplicit    ?? false,
                    isPublic:      currentTrack.isPublic      ?? false,
                    allowComments: currentTrack.allowComments ?? true,
                    genre:       currentTrack.genre ?? null,
                    releaseDate: currentTrack.releaseDate ?? null,
                    recordLabel: currentTrack.recordLabel ?? null,
                    buyLink:     currentTrack.buyLink ?? null,
                  }}
                />
              </div>
            )}
          </div>

          {/* Scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-white/35 tabular-nums w-8 text-right shrink-0 select-none">
              {fmt(displayTime)}
            </span>

            <div
              ref={scrubRef}
              onPointerDown={handleScrubDown}
              onPointerMove={handleScrubMove}
              onPointerUp={handleScrubUp}
              onPointerCancel={handleScrubUp}
              role="slider"
              aria-label="Playback position"
              aria-valuenow={Math.round(displayProgress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className={`relative flex-1 flex items-center group/scrubber select-none
                ${currentTrack ? "cursor-pointer" : "cursor-default"}`}
              style={{ height: "20px" }}
            >
              <div className={`w-full rounded-full bg-white/[0.1] transition-all duration-150 overflow-hidden
                ${isScrubbing ? "h-1.5" : "h-1 group-hover/scrubber:h-1.5"}`}
              >
                <div
                  className={`h-full rounded-full transition-colors duration-150
                    ${isScrubbing ? "bg-white/85" : "bg-white/55 group-hover/scrubber:bg-white/80"}`}
                  style={{ width: `${displayProgress * 100}%` }}
                />
              </div>
              <div
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none transition-opacity duration-150
                  ${isScrubbing ? "opacity-100" : "opacity-0 group-hover/scrubber:opacity-100"}`}
                style={{ left: `${displayProgress * 100}%` }}
              />
            </div>

            <span className="text-[11px] font-mono text-white/35 tabular-nums w-8 shrink-0 select-none">
              {fmt(duration)}
            </span>
          </div>

          {/* Transport buttons */}
          <div className="flex items-center justify-between">

            <button
              aria-label={isShuffle ? "Shuffle on" : "Shuffle off"}
              onClick={toggleShuffle}
              className={`relative transition-all duration-150 active:scale-90 p-2
                ${isShuffle ? "text-white/80" : "text-white/25 hover:text-white/60"}`}
            >
              <Shuffle size={18} strokeWidth={1.5} />
              {isShuffle && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
              )}
            </button>

            <button
              aria-label="Previous"
              onClick={onPrevious}
              disabled={!currentTrack}
              className="text-white/60 hover:text-white/90 transition-all duration-150 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed p-2"
            >
              <SkipBack size={28} strokeWidth={1.5} />
            </button>

            <button
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlay}
              disabled={!currentTrack}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-transform duration-150"
            >
              {isPlaying
                ? <Pause size={22} strokeWidth={1.5} className="text-[#050A15]" />
                : <Play  size={22} strokeWidth={1.5} className="text-[#050A15] translate-x-[2px]" />
              }
            </button>

            <button
              aria-label="Next"
              onClick={playNext}
              disabled={!currentTrack}
              className="text-white/60 hover:text-white/90 transition-all duration-150 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed p-2"
            >
              <SkipForward size={28} strokeWidth={1.5} />
            </button>

            <button
              aria-label="Repeat"
              onClick={toggleRepeatMode}
              className={`relative transition-all duration-150 active:scale-90 p-2
                ${repeatMode === "off" ? "text-white/25 hover:text-white/60" : "text-white/80"}`}
            >
              {repeatMode === "one"
                ? <Repeat1 size={18} strokeWidth={1.5} />
                : <Repeat  size={18} strokeWidth={1.5} />
              }
              {repeatMode !== "off" && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
              )}
            </button>

          </div>

          {/* Volume */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (volume > 0) { premuteVolume.current = volume; setVolume(0); setScrubVolume(0); }
                else { const v = premuteVolume.current > 0 ? premuteVolume.current : 1; setVolume(v); setScrubVolume(v); }
              }}
              className="text-white/25 hover:text-white/60 transition-colors shrink-0"
              aria-label={volume === 0 ? "Unmute" : "Mute"}
            >
              {displayVol === 0
                ? <VolumeX size={15} strokeWidth={1.5} />
                : <Volume2 size={15} strokeWidth={1.5} />
              }
            </button>

            <div
              ref={volumeScrubRef}
              onPointerDown={handleVolDown}
              onPointerMove={handleVolMove}
              onPointerUp={handleVolUp}
              onPointerCancel={handleVolUp}
              role="slider"
              aria-label="Volume"
              aria-valuenow={Math.round(displayVol * 100)}
              className="relative flex-1 flex items-center group/vol cursor-pointer select-none"
              style={{ height: "20px" }}
            >
              <div className={`w-full rounded-full bg-white/[0.1] transition-all duration-150 overflow-hidden
                ${isVolumeScrubbing ? "h-1.5" : "h-1 group-hover/vol:h-1.5"}`}
              >
                <div
                  className={`h-full rounded-full transition-colors duration-150
                    ${isVolumeScrubbing ? "bg-white/75" : "bg-white/40 group-hover/vol:bg-white/65"}`}
                  style={{ width: `${displayVol * 100}%` }}
                />
              </div>
              <div
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none transition-opacity duration-150
                  ${isVolumeScrubbing ? "opacity-100" : "opacity-0 group-hover/vol:opacity-100"}`}
                style={{ left: `${displayVol * 100}%` }}
              />
            </div>

            <Volume2 size={15} strokeWidth={1.5} className="text-white/25 shrink-0" />
          </div>

        </div>
      </div>
    </motion.div>
  );
}
