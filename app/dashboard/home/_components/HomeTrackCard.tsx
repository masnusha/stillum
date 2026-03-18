"use client";

import Link from "next/link";
import { Music, Play, Pause } from "lucide-react";
import { usePlayerStore, type PlayerTrack } from "@/store/usePlayerStore";

interface Props {
  track: {
    id:            string;
    title:         string;
    artist:        string;
    coverUrl:      string | null;
    audioUrl:      string;
    duration:      number;
    ownerId:       string;
    isExplicit:    boolean;
    isPublic:      boolean;
    allowComments: boolean;
    owner: {
      id:        string;
      username:  string | null;
      name:      string | null;
      avatarUrl: string | null;
      image:     string | null;
    };
  };
}

export default function HomeTrackCard({ track }: Props) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  const artistName    = track.owner.username ?? track.owner.name ?? track.artist;
  const isCurrentTrack = currentTrack?.id === track.id;
  const isThisPlaying  = isCurrentTrack && isPlaying;

  function handlePlayClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isCurrentTrack) {
      togglePlay();
      return;
    }

    const playerTrack: PlayerTrack = {
      id:            track.id,
      title:         track.title,
      artist:        track.artist,
      audioUrl:      track.audioUrl,
      coverUrl:      track.coverUrl,
      duration:      track.duration,
      ownerId:       track.ownerId,
      isExplicit:    track.isExplicit,
      isPublic:      track.isPublic,
      allowComments: track.allowComments,
      user:          track.owner,
    };
    playTrack(playerTrack, [playerTrack]);
  }

  return (
    <div className="w-40 md:w-44 shrink-0 group/card">

      {/* Cover → track page */}
      <Link href={`/dashboard/track/${track.id}`}>
        <div className="w-full aspect-square rounded-xl bg-white/[0.04] border border-white/[0.05]
                        overflow-hidden relative flex items-center justify-center mb-2.5
                        group-hover/card:border-white/[0.12] transition-colors">
          {track.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-full h-full object-cover group-hover/card:scale-[1.03] transition-transform duration-300"
            />
          ) : (
            <Music size={28} strokeWidth={1} className="text-white/15" />
          )}

          {/* Play / Pause overlay button */}
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label={isThisPlaying ? "Пауза" : "Воспроизвести"}
            className={`absolute bottom-2 right-2 w-9 h-9 flex items-center justify-center
                        rounded-full bg-black/70 backdrop-blur-md text-white z-10 shadow-lg
                        transition-all duration-200 hover:bg-black/90 hover:scale-105 active:scale-95
                        ${isCurrentTrack
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-1 group-hover/card:opacity-100 group-hover/card:translate-y-0"
                        }`}
          >
            {isThisPlaying
              ? <Pause size={14} strokeWidth={0} className="fill-white" />
              : <Play  size={14} strokeWidth={0} className="fill-white translate-x-[1px]" />
            }
          </button>
        </div>

        <p className="text-[13px] font-medium text-white/80 truncate group-hover/card:text-white transition-colors">
          {track.title}
        </p>
      </Link>

      {/* Artist → profile */}
      <Link
        href={`/dashboard/profile/${track.owner.id}`}
        className="text-[12px] text-white/40 hover:text-white/75 hover:underline underline-offset-2
                   transition-colors truncate mt-0.5 inline-block max-w-full"
      >
        {artistName}
      </Link>
    </div>
  );
}
