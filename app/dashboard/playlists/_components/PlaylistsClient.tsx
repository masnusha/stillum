"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ListMusic, Plus, Globe, Lock, Music } from "lucide-react";
import CreatePlaylistModal from "./CreatePlaylistModal";

interface Playlist {
  id:          string;
  name:        string;
  description: string | null;
  coverUrl:    string | null;
  isPublic:    boolean;
  createdAt:   Date;
  _count:      { playlistTracks: number };
}

interface Props {
  playlists: Playlist[];
}

// ─── PlaylistCard ─────────────────────────────────────────────────────────────

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const trackWord = (() => {
    const n = playlist._count.playlistTracks % 10;
    const n100 = playlist._count.playlistTracks % 100;
    if (n100 >= 11 && n100 <= 19) return "треков";
    if (n === 1) return "трек";
    if (n >= 2 && n <= 4) return "трека";
    return "треков";
  })();

  return (
    <Link
      href={`/dashboard/playlists/${playlist.id}`}
      className="group flex flex-col gap-3 cursor-pointer"
    >
      {/* Cover */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.05] group-hover:border-white/10 transition-colors">
        {playlist.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={32} strokeWidth={1} className="text-white/10" />
          </div>
        )}

        {/* Privacy badge */}
        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
          {playlist.isPublic
            ? <Globe size={11} strokeWidth={1.5} className="text-white/50" />
            : <Lock  size={11} strokeWidth={1.5} className="text-white/40" />
          }
        </div>
      </div>

      {/* Info */}
      <div>
        <p className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors truncate">
          {playlist.name}
        </p>
        <p className="text-[11px] text-white/30 mt-0.5">
          {playlist._count.playlistTracks} {trackWord}
        </p>
      </div>
    </Link>
  );
}

// ─── PlaylistsClient ──────────────────────────────────────────────────────────

export default function PlaylistsClient({ playlists }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <AnimatePresence>
        {showCreate && <CreatePlaylistModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>

      <div className="flex-1 px-8 pt-8 pb-4">

        {/* ── Section header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Ваши плейлисты</h2>
            {playlists.length > 0 && (
              <p className="text-sm text-white/30 mt-1">
                {playlists.length} {playlists.length === 1 ? "плейлист" : playlists.length < 5 ? "плейлиста" : "плейлистов"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/15 transition-all text-[13px] font-medium"
          >
            <Plus size={14} strokeWidth={2} />
            Создать плейлист
          </button>
        </div>

        {/* ── Grid or empty state ────────────────────────────────────────── */}
        {playlists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-32 gap-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <ListMusic size={28} strokeWidth={1} className="text-white/20" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-white/60">У вас пока нет плейлистов</p>
              <p className="text-sm text-white/30 mt-1">Создайте своё первое пространство.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Plus size={14} strokeWidth={2.5} />
              Создать плейлист
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
          >
            {playlists.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
