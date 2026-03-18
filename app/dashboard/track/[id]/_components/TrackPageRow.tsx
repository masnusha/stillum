"use client";

import { Play, Pause, Music } from "lucide-react";
import { usePlayerStore, type PlayerTrack } from "@/store/usePlayerStore";

// ─── Equalizer animation ──────────────────────────────────────────────────────

function Equalizer() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-3">
      {([0, 0.2, 0.4] as const).map((delay, i) => (
        <span
          key={i}
          className="w-[2.5px] h-3 rounded-full bg-white/60 origin-bottom animate-equalizer"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  track: PlayerTrack;
}

// ─── TrackPageRow ─────────────────────────────────────────────────────────────

export default function TrackPageRow({ track }: Props) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  const isActive      = currentTrack?.id === track.id;
  const isThisPlaying = isActive && isPlaying;

  const handleClick = () => {
    if (isActive) togglePlay();
    else playTrack(track, [track]);
  };

  function formatDuration(s: number): string {
    if (!s) return "--:--";
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-4 px-3 py-3 rounded-xl cursor-pointer transition-colors group
        ${isActive ? "bg-white/[0.05]" : "hover:bg-white/[0.04]"}`}
    >
      {/* ── Col 1: track number / equalizer ── */}
      <span className="w-5 shrink-0 flex items-center justify-center">
        {isActive ? (
          isThisPlaying ? <Equalizer /> : (
            <span className="text-[13px] text-white/50 tabular-nums select-none">1</span>
          )
        ) : (
          <span className="text-[13px] text-white/20 tabular-nums select-none group-hover:opacity-0 transition-opacity">
            1
          </span>
        )}
      </span>

      {/* ── Col 2: thumbnail with play/pause overlay ── */}
      <div
        className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.04] shrink-0 flex items-center justify-center"
        onClick={(e) => { e.stopPropagation(); handleClick(); }}
      >
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music size={14} strokeWidth={1} className="text-white/15" />
        )}

        {/* Hover / active overlay */}
        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity
          ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          {isThisPlaying
            ? <Pause size={13} strokeWidth={2} className="text-white" />
            : <Play  size={13} strokeWidth={0} fill="white" className="translate-x-[1px]" />
          }
        </div>
      </div>

      {/* ── Col 3: title + artist ── */}
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-medium truncate transition-colors
          ${isActive ? "text-white" : "text-white/85 group-hover:text-white"}`}
        >
          {track.title}
        </p>
        <p className="text-[12px] text-white/35 truncate mt-0.5">
          {track.user?.username ?? track.user?.name ?? track.artist}
        </p>
      </div>

      {/* ── Col 4: duration ── */}
      <span className={`text-[12px] tabular-nums font-mono shrink-0 transition-colors
        ${isActive ? "text-white/40" : "text-white/25"}`}
      >
        {formatDuration(track.duration)}
      </span>
    </div>
  );
}
