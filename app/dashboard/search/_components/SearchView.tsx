"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Music, Clock } from "lucide-react";
import { searchContent, type SearchResults } from "@/app/actions/search";
import {
  saveToHistory,
  deleteFromHistory,
  type HistoryItem,
} from "@/app/actions/search-history";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Genre {
  name:  string;
  slug:  string;
  color: string;
}

interface Props {
  genres:  Genre[];
  history: HistoryItem[];
}

// ─── HistoryCard ──────────────────────────────────────────────────────────────

function HistoryCard({
  item,
  onDelete,
}: {
  item:     HistoryItem;
  onDelete: () => void;
}) {
  const isUser = item.type === "USER";

  const thumb = (
    <div
      className={`w-9 h-9 shrink-0 overflow-hidden flex items-center justify-center bg-white/[0.06] ${
        isUser ? "rounded-full" : "rounded-lg"
      }`}
    >
      {item.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : isUser ? (
        <span className="text-sm font-semibold text-white/25 select-none">
          {item.name[0]?.toUpperCase() ?? "?"}
        </span>
      ) : (
        <Music size={13} strokeWidth={1} className="text-white/25" />
      )}
    </div>
  );

  const label = (
    <div className="min-w-0">
      <p className="text-[13px] text-white/75 truncate max-w-[110px] leading-tight">
        {item.name}
      </p>
      {item.subtitle && (
        <p className="text-[11px] text-white/35 truncate max-w-[110px] leading-tight mt-0.5">
          {item.subtitle}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.07] rounded-2xl pl-2 pr-2.5 py-2 shrink-0 group">

      {/* Clickable area: thumb + label */}
      {isUser ? (
        <Link
          href={item.href}
          className="flex items-center gap-2.5 min-w-0"
          onClick={() => void saveToHistory(item.id, "USER")}
        >
          {thumb}
          {label}
        </Link>
      ) : (
        <div className="flex items-center gap-2.5 min-w-0 cursor-default">
          {thumb}
          {label}
        </div>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="ml-1 w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-white/25 hover:text-white/70 hover:bg-white/[0.12] transition-all shrink-0"
        aria-label="Удалить из истории"
      >
        <X size={10} strokeWidth={2} />
      </button>
    </div>
  );
}

// ─── UserCard ─────────────────────────────────────────────────────────────────

function UserCard({
  user,
  onSelect,
}: {
  user:     SearchResults["users"][number];
  onSelect: () => void;
}) {
  const displayName = user.username ?? user.name ?? "…";
  const avatar      = user.avatarUrl ?? user.image;
  const initial     = displayName[0]?.toUpperCase() ?? "?";

  return (
    <Link
      href={`/dashboard/profile/${user.id}`}
      onClick={onSelect}
      className="flex flex-col items-center gap-2.5 w-24 shrink-0 group"
    >
      <div className="w-16 h-16 rounded-full bg-white/[0.05] border border-white/[0.07] overflow-hidden relative flex items-center justify-center group-hover:scale-[1.05] transition-transform duration-200">
        {avatar ? (
          <Image src={avatar} alt={displayName} fill sizes="64px" className="object-cover" />
        ) : (
          <span className="text-lg font-semibold text-white/20 select-none">{initial}</span>
        )}
      </div>
      <span className="text-[11px] text-white/50 group-hover:text-white/80 transition-colors text-center truncate w-full">
        {displayName}
      </span>
    </Link>
  );
}

// ─── TrackRow ─────────────────────────────────────────────────────────────────

function TrackRow({
  track,
  onSelect,
}: {
  track:    SearchResults["tracks"][number];
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer group"
    >
      <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.04] overflow-hidden relative flex items-center justify-center shrink-0">
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music size={14} strokeWidth={1} className="text-white/20" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white/80 truncate">{track.title}</p>
        <p className="text-[12px] text-white/40 truncate">{track.artist}</p>
      </div>
      {track.genre && (
        <span className="text-[11px] text-white/25 truncate hidden md:block max-w-[100px]">
          {track.genre}
        </span>
      )}
    </div>
  );
}

// ─── SearchView ───────────────────────────────────────────────────────────────

export default function SearchView({ genres, history: initialHistory }: Props) {
  const [query,        setQuery]       = useState("");
  const [results,      setResults]     = useState<SearchResults | null>(null);
  const [loading,      setLoading]     = useState(false);
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>(initialHistory);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchContent(query);
      setResults(data);
      setLoading(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const isEmpty = results && results.users.length === 0 && results.tracks.length === 0;

  // ── History helpers ──────────────────────────────────────────────────────

  function handleHistoryDelete(historyId: string) {
    setLocalHistory((prev) => prev.filter((h) => h.historyId !== historyId));
    void deleteFromHistory(historyId);
  }

  function handleUserSelect(userId: string, displayName: string, avatarUrl: string | null, href: string) {
    void saveToHistory(userId, "USER");
    // Optimistically prepend if not already in list
    setLocalHistory((prev) => {
      const exists = prev.find((h) => h.id === userId && h.type === "USER");
      if (exists) {
        // Move to front
        return [exists, ...prev.filter((h) => !(h.id === userId && h.type === "USER"))];
      }
      return [
        { historyId: crypto.randomUUID(), type: "USER" as const, id: userId, name: displayName, subtitle: null, avatarUrl, href },
        ...prev,
      ].slice(0, 12);
    });
  }

  function handleTrackSelect(trackId: string, title: string, artist: string, coverUrl: string | null) {
    void saveToHistory(trackId, "TRACK");
    setLocalHistory((prev) => {
      const exists = prev.find((h) => h.id === trackId && h.type === "TRACK");
      if (exists) {
        return [exists, ...prev.filter((h) => !(h.id === trackId && h.type === "TRACK"))];
      }
      return [
        { historyId: crypto.randomUUID(), type: "TRACK" as const, id: trackId, name: title, subtitle: artist, avatarUrl: coverUrl, href: "#" },
        ...prev,
      ].slice(0, 12);
    });
  }

  return (
    <>
      {/* ── Search input ──────────────────────────────────────────────────── */}
      <div className="relative mb-8">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Артисты, треки или плейлисты"
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl py-5 pl-16 pr-12 text-white text-lg focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all placeholder:text-white/25"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
            aria-label="Очистить поиск"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* ── Results / History+Genres ───────────────────────────────────────── */}
      {query.trim() ? (

        loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-center">
            <p className="text-[15px] font-medium text-white/30">Ничего не найдено</p>
            <p className="text-[13px] text-white/20 max-w-xs">
              По запросу &ldquo;{query}&rdquo; ничего не найдено. Попробуйте другой запрос.
            </p>
          </div>
        ) : (
          <div className="space-y-10">

            {/* Profiles */}
            {results && results.users.length > 0 && (
              <div>
                <h2 className="text-[15px] font-bold text-white mb-5">Профили</h2>
                <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-2">
                  {results.users.map((user) => {
                    const displayName = user.username ?? user.name ?? "…";
                    return (
                      <UserCard
                        key={user.id}
                        user={user}
                        onSelect={() =>
                          handleUserSelect(
                            user.id,
                            displayName,
                            user.avatarUrl ?? user.image,
                            `/dashboard/profile/${user.id}`,
                          )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tracks */}
            {results && results.tracks.length > 0 && (
              <div>
                <h2 className="text-[15px] font-bold text-white mb-3">Треки</h2>
                <div className="space-y-0.5">
                  {results.tracks.map((track) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      onSelect={() =>
                        handleTrackSelect(track.id, track.title, track.artist, track.coverUrl)
                      }
                    />
                  ))}
                </div>
              </div>
            )}

          </div>
        )

      ) : (

        /* ── Empty query: history + genre grid ──────────────────────────── */
        <div className="space-y-10">

          {/* Recently searched */}
          {localHistory.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={13} strokeWidth={1.5} className="text-white/35" />
                <h2 className="text-[13px] font-semibold text-white/35 uppercase tracking-widest">
                  Недавно искали
                </h2>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                {localHistory.map((item) => (
                  <HistoryCard
                    key={item.historyId}
                    item={item}
                    onDelete={() => handleHistoryDelete(item.historyId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Genre grid */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Поиск по жанрам</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {genres.map((genre) => (
                <Link
                  key={genre.slug}
                  href={`/dashboard/explore/${genre.slug}`}
                  className={`relative overflow-hidden rounded-xl aspect-[3/2] bg-gradient-to-br ${genre.color} group hover:scale-[1.02] transition-transform duration-300 shadow-lg`}
                >
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/[0.12] rounded-full blur-2xl group-hover:bg-white/[0.22] transition-colors duration-300" />
                  <span className="absolute bottom-3.5 left-4 text-white font-bold text-[15px] md:text-[16px] tracking-tight z-10 drop-shadow-sm">
                    {genre.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>

        </div>

      )}
    </>
  );
}
