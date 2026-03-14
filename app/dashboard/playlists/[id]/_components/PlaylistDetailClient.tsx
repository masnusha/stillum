"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Music, Globe, Lock, Search, Edit3 } from "lucide-react";
import TrackList, { type TrackRowData } from "@/app/dashboard/_components/TrackList";
import UploadDropzone from "@/app/dashboard/_components/UploadDropzone";
import EditPlaylistModal from "./EditPlaylistModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaylistTrackItem {
  id:    string;
  track: TrackRowData;
}

interface PlaylistData {
  id:          string;
  ownerId:     string;
  name:        string;
  description: string | null;
  coverUrl:    string | null;
  isPublic:    boolean;
  ownerName:   string;
  createdAt:   Date;
  playlistTracks: PlaylistTrackItem[];
}

interface Props {
  playlist: PlaylistData;
  isOwner:  boolean;
}

// ─── PlaylistDetailClient ─────────────────────────────────────────────────────

export default function PlaylistDetailClient({ playlist, isOwner }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showEdit,    setShowEdit]    = useState(false);

  // Local state — updated optimistically after modal save
  const [name,        setName]        = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description);
  const [coverUrl,    setCoverUrl]    = useState(playlist.coverUrl);
  const [isPublic,    setIsPublic]    = useState(playlist.isPublic);

  const tracks = playlist.playlistTracks.map((pt) => pt.track);
  const isEmpty = tracks.length === 0;

  return (
    <>
      <AnimatePresence>
        {showEdit && (
          <EditPlaylistModal
            playlist={{ id: playlist.id, name, description, coverUrl, isPublic }}
            onClose={() => setShowEdit(false)}
            onSaved={(updated) => {
              if (updated.name        !== undefined) setName(updated.name!);
              if (updated.description !== undefined) setDescription(updated.description ?? null);
              if (updated.coverUrl    !== undefined) setCoverUrl(updated.coverUrl ?? null);
              if (updated.isPublic    !== undefined) setIsPublic(updated.isPublic!);
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-y-auto flex-1">
          <div className="px-8 pt-10 pb-6">

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-8 pb-10 border-b border-white/[0.05] mb-8">

              {/* Cover */}
              <div className="w-48 h-48 md:w-56 md:h-56 shrink-0 rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.07] shadow-2xl flex items-center justify-center">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <Music size={48} strokeWidth={0.75} className="text-white/15" />
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col gap-3 min-w-0 w-full text-center md:text-left">
                <p className="text-[11px] uppercase tracking-widest text-white/30 font-bold">
                  Плейлист
                </p>

                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] break-words">
                  {name}
                </h1>

                {description && (
                  <p className="text-white/60 text-sm max-w-2xl line-clamp-3 leading-relaxed">
                    {description}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-[13px] text-white/40 mt-1">
                  <Link
                    href={isOwner ? "/dashboard/profile" : `/dashboard/profile/${playlist.ownerId}`}
                    className="font-medium text-white/60 hover:text-white hover:underline decoration-white/30 underline-offset-4 transition-all"
                  >
                    {playlist.ownerName}
                  </Link>
                  <span className="text-white/15">•</span>
                  <span>
                    {tracks.length}{" "}
                    {tracks.length === 1 ? "трек" : tracks.length < 5 ? "трека" : "треков"}
                  </span>
                  <span className="text-white/15">•</span>
                  <span className="flex items-center gap-1">
                    {isPublic
                      ? <><Globe size={11} strokeWidth={1.5} />Публичный</>
                      : <><Lock  size={11} strokeWidth={1.5} />Приватный</>
                    }
                  </span>
                </div>

                {/* Actions row */}
                {isOwner && (
                  <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowEdit(true)}
                      className="w-10 h-10 rounded-full bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center text-white/50 hover:text-white transition-colors"
                      aria-label="Редактировать плейлист"
                    >
                      <Edit3 size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Tracks or empty state ────────────────────────────────────── */}
            {isEmpty ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-10 text-center"
              >
                <p className="text-xl font-bold text-white mb-2">Наполните это пространство</p>
                <p className="text-sm text-white/40 mb-8">
                  Найдите треки в своей библиотеке или загрузите новые.
                </p>

                <div className="relative max-w-sm mx-auto mb-6">
                  <Search
                    size={14}
                    strokeWidth={1.5}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по библиотеке..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/70 placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-4 max-w-sm mx-auto mb-6">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[11px] text-white/25 font-semibold tracking-widest uppercase">или</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {isOwner && (
                  <div className="flex justify-center">
                    <UploadDropzone variant="button" playlistId={playlist.id} />
                  </div>
                )}
              </motion.div>
            ) : (
              <>
                <TrackList tracks={tracks} playlistId={playlist.id} />

                {isOwner && (
                  <div className="mt-6 flex justify-start pl-2">
                    <UploadDropzone variant="button" playlistId={playlist.id} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
