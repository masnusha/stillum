"use client";

import Link from "next/link";
import { Play, Pause, Music } from "lucide-react";
import { usePlayerStore, type PlayerTrack } from "@/store/usePlayerStore";
import type { TrackRowData } from "@/app/dashboard/_components/TrackList";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(s: number): string {
  if (s === 0) return "--:--";
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function toPlayerTrack(t: TrackRowData): PlayerTrack {
  return {
    id:          t.id,
    title:       t.title,
    artist:      t.artist,
    audioUrl:    t.audioUrl,
    coverUrl:    t.coverUrl,
    duration:    t.duration,
    isExplicit:    t.isExplicit,
    isPublic:      t.isPublic,
    allowComments: t.allowComments,
    ownerId:     t.ownerId,
    user:        t.user,
    genre:       t.genre,
    releaseDate: t.releaseDate,
    recordLabel: t.recordLabel,
    buyLink:     t.buyLink,
  };
}

// ─── TrackRow ─────────────────────────────────────────────────────────────────

function TrackRow({
  track,
  allTracks,
}: {
  track:     TrackRowData;
  allTracks: TrackRowData[];
}) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  const isActive      = currentTrack?.id === track.id;
  const isThisPlaying = isActive && isPlaying;

  function handleClick() {
    if (isActive) {
      togglePlay();
    } else {
      playTrack(toPlayerTrack(track), allTracks.map(toPlayerTrack));
    }
  }

  return (
    <div
      className={`flex items-center gap-3 px-2 py-2 -mx-2 rounded-lg group cursor-pointer transition-colors ${
        isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.05]"
      }`}
      onClick={handleClick}
    >
      {/* Cover + play overlay */}
      <div className="relative w-[50px] h-[50px] shrink-0 rounded-md overflow-hidden bg-white/[0.04]">
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={16} strokeWidth={1} className="text-white/20" />
          </div>
        )}
        {/* Play/pause overlay */}
        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}>
          {isThisPlaying
            ? <Pause size={16} strokeWidth={2} className="text-white" />
            : <Play  size={16} strokeWidth={2} className="text-white fill-white" />
          }
        </div>
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/dashboard/track/${track.id}`}
          onClick={(e) => e.stopPropagation()}
          className={`block text-[13px] font-medium truncate transition-colors hover:underline underline-offset-2 ${
            isActive ? "text-white" : "text-white/80 group-hover:text-white"
          }`}
        >
          {track.title}
          {track.isExplicit && (
            <span className="ml-1.5 text-[9px] font-semibold bg-white/10 text-white/40 px-1 py-0.5 rounded uppercase tracking-wide align-middle">
              E
            </span>
          )}
        </Link>
        <p className="text-[12px] text-white/40 truncate mt-0.5">{track.artist}</p>
      </div>

      {/* Duration */}
      <span className="text-[12px] text-white/25 tabular-nums shrink-0 pr-1">
        {formatDuration(track.duration)}
      </span>
    </div>
  );
}

// ─── NewTracksGrid ────────────────────────────────────────────────────────────

export default function NewTracksGrid({ tracks }: { tracks: TrackRowData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0.5">
      {tracks.map((t) => (
        <TrackRow key={t.id} track={t} allTracks={tracks} />
      ))}
    </div>
  );
}
