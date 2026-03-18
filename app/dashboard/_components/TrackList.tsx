"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Pause, Volume2, ArrowUp, ArrowDown } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import TrackContextMenu from "./TrackContextMenu";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackRowData {
  id:          string;
  title:       string;
  artist:      string;
  genre:       string | null;
  releaseDate: string | null;
  recordLabel: string | null;
  buyLink:     string | null;
  isExplicit:  boolean;
  isPublic:      boolean;
  allowComments: boolean;
  duration:    number;
  coverUrl:    string | null;
  audioUrl:    string;
  ownerId?:    string;
  user?: {
    id:        string;
    username:  string | null;
    name:      string | null;
    avatarUrl: string | null;
    image:     string | null;
  };
}

interface Props {
  tracks:      TrackRowData[];
  playlistId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(s: number): string {
  if (s === 0) return "--:--";
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Equalizer animation ──────────────────────────────────────────────────────

function Equalizer() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-3.5">
      {([0, 0.2, 0.4] as const).map((delay, i) => (
        <span
          key={i}
          className="w-[2.5px] h-3.5 rounded-full bg-white/55 origin-bottom animate-equalizer"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortField = "title" | "artist" | "genre" | "duration";
type SortDir   = "asc" | "desc";

// ─── Shared grid definition ───────────────────────────────────────────────────

const GRID =
  "grid grid-cols-[40px_minmax(200px,4fr)_minmax(150px,3fr)_minmax(100px,2fr)_minmax(60px,1fr)_40px] gap-4 items-center w-full px-6";

// ─── TrackList ────────────────────────────────────────────────────────────────

export default function TrackList({ tracks, playlistId }: Props) {
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir,   setSortDir]   = useState<SortDir>("asc");

  const { currentTrack, isPlaying, playTrack, togglePlay, setQueue } =
    usePlayerStore();

  const toPlayerTrack = (t: TrackRowData) => ({
    id:          t.id,
    title:       t.title,
    artist:      t.artist,
    audioUrl:    t.audioUrl,
    coverUrl:    t.coverUrl,
    duration:    t.duration,
    isExplicit:  t.isExplicit,
    isPublic:      t.isPublic,
    allowComments: t.allowComments,
    ownerId:     t.ownerId,
    user:        t.user,
    genre:       t.genre,
    releaseDate: t.releaseDate,
    recordLabel: t.recordLabel,
    buyLink:     t.buyLink,
  });

  // ── Sorting ───────────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => {
      let cmp = 0;

      if (sortField === "duration") {
        // 0 means unknown → sort to the very end regardless of direction
        const aVal = a.duration > 0 ? a.duration : Infinity;
        const bVal = b.duration > 0 ? b.duration : Infinity;
        cmp = aVal - bVal;
      } else if (sortField === "genre") {
        const aVal = a.genre ?? "";
        const bVal = b.genre ?? "";
        if (!aVal && !bVal) cmp = 0;
        else if (!aVal)     cmp = 1;   // nulls always last
        else if (!bVal)     cmp = -1;
        else {
          const aLow = aVal.toLowerCase();
          const bLow = bVal.toLowerCase();
          cmp = aLow < bLow ? -1 : aLow > bLow ? 1 : 0;
        }
      } else {
        const aLow = a[sortField].toLowerCase();
        const bLow = b[sortField].toLowerCase();
        cmp = aLow < bLow ? -1 : aLow > bLow ? 1 : 0;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [tracks, sortField, sortDir]);

  // Keep the store queue in sync with the sorted order.
  const playerTracks = useMemo(
    () => sortedTracks.map(toPlayerTrack),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedTracks]
  );

  useEffect(() => {
    setQueue(playerTracks);
  }, [playerTracks, setQueue]);

  const handleTrackClick = (track: TrackRowData) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(toPlayerTrack(track), playerTracks);
    }
  };

  // ── Sort header helper ────────────────────────────────────────────────────

  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortField) return null;
    return sortDir === "asc"
      ? <ArrowUp  className="w-3 h-3 shrink-0" />
      : <ArrowDown className="w-3 h-3 shrink-0" />;
  };

  const headerBtn = (field: SortField, label: string) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold transition-colors select-none
        ${sortField === field ? "text-white/70" : "text-white/25 hover:text-white/50"}`}
    >
      {label}
      <SortIcon field={field} />
    </button>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div className={`${GRID} py-2.5 border-b border-white/[0.04] shrink-0`}>
        <div /> {/* spacer — cover column */}
        {headerBtn("title",    "Title")}
        {headerBtn("artist",   "Artist")}
        {headerBtn("genre",    "Genre")}
        {headerBtn("duration", "Time")}
        <div /> {/* spacer — context menu column */}
      </div>

      {/* ── Track rows ────────────────────────────────────────────────────── */}
      <ul className="overflow-y-auto flex-1 py-1">
        {sortedTracks.map((track) => {
          const isActive      = currentTrack?.id === track.id;
          const isThisPlaying = isActive && isPlaying;

          return (
            <li key={track.id}>
              <div
                onClick={() => handleTrackClick(track)}
                className={`${GRID} py-2.5 rounded-xl cursor-pointer transition-all duration-150 group border border-transparent
                  ${isActive
                    ? "bg-white/[0.04] border-white/[0.03]"
                    : "hover:bg-white/[0.02] hover:border-white/[0.02]"
                  }`}
              >
                {/* ── Col 1: Cover / play indicator ─────────────────────── */}
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.04] shrink-0 overflow-hidden relative flex items-center justify-center">
                  {/* Cover */}
                  {track.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.coverUrl}
                      alt=""
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150
                        ${isActive
                          ? "opacity-50 group-hover:opacity-25"
                          : "opacity-100 group-hover:opacity-25"
                        }`}
                    />
                  )}

                  {/* Track number — no cover, not active */}
                  {!track.coverUrl && !isActive && (
                    <span className="text-[11px] text-white/15 font-medium tabular-nums select-none group-hover:opacity-0 transition-opacity absolute">
                      {sortedTracks.indexOf(track) + 1}
                    </span>
                  )}

                  {/* Equalizer — active + playing */}
                  {isActive && isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-150">
                      <Equalizer />
                    </div>
                  )}

                  {/* Volume icon — active + paused */}
                  {isActive && !isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-150">
                      <Volume2 size={13} strokeWidth={1.5} className="text-white/40" />
                    </div>
                  )}

                  {/* Play / Pause overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {isThisPlaying
                      ? <Pause size={13} strokeWidth={1.5} className="text-white/80" />
                      : <Play  size={13} strokeWidth={0} fill="rgba(255,255,255,0.8)" className="translate-x-[1px]" />
                    }
                  </div>
                </div>

                {/* ── Col 2: Title + Explicit badge ─────────────────────── */}
                <div className="flex items-center gap-2 min-w-0">
                  <p className={`text-[13px] font-medium truncate leading-snug transition-colors
                    ${isActive ? "text-white" : "text-white/90"}`}
                  >
                    {track.title}
                  </p>
                  {track.isExplicit && (
                    <span
                      aria-label="Explicit"
                      className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-[3px] bg-white/[0.06] border border-white/[0.1] text-[7px] font-bold text-white/30 leading-none shrink-0 select-none"
                    >
                      E
                    </span>
                  )}
                </div>

                {/* ── Col 3: Artist ─────────────────────────────────────── */}
                <p className={`text-[13px] truncate transition-colors
                  ${isActive ? "text-white/50" : "text-white/40"}`}
                >
                  {track.artist}
                </p>

                {/* ── Col 4: Genre ──────────────────────────────────────── */}
                <p className="text-[12px] text-white/25 truncate">
                  {track.genre ?? "—"}
                </p>

                {/* ── Col 5: Duration ───────────────────────────────────── */}
                <p className={`text-[12px] font-mono tabular-nums transition-colors
                  ${isActive ? "text-white/40" : "text-white/20"}`}
                >
                  {formatDuration(track.duration)}
                </p>

                {/* ── Col 6: Context menu ───────────────────────────────── */}
                <div onClick={(e) => e.stopPropagation()}>
                  <TrackContextMenu
                    track={{
                      id:          track.id,
                      title:       track.title,
                      artist:      track.artist,
                      genre:       track.genre,
                      releaseDate: track.releaseDate,
                      recordLabel: track.recordLabel,
                      buyLink:     track.buyLink,
                      isExplicit:    track.isExplicit,
                      isPublic:      track.isPublic,
                      allowComments: track.allowComments,
                      coverUrl:    track.coverUrl,
                      audioUrl:    track.audioUrl,
                    }}
                    playlistId={playlistId}
                  />
                </div>

              </div>
            </li>
          );
        })}
      </ul>

    </div>
  );
}
