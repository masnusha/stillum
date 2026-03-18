"use client";

import { useState, useEffect, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, Music, ChevronLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePlaylistModal } from "@/store/usePlaylistModal";
import { getPlaylists, addTrackToPlaylist } from "@/app/actions/playlist";
import CreatePlaylistForm from "@/components/CreatePlaylistForm";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlaylistRow = {
  id:       string;
  name:     string;
  coverUrl: string | null;
  _count:   { playlistTracks: number };
};

type View = "list" | "create";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trackCountLabel(n: number): string {
  if (n === 1)              return "трек";
  if (n >= 2 && n <= 4)    return "трека";
  return "треков";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddToPlaylistModal() {
  const { isOpen, trackId, closeModal } = usePlaylistModal();
  const router = useRouter();

  const [view,     setView]     = useState<View>("list");
  const [playlists,setPlaylists]= useState<PlaylistRow[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset + fetch on open
  useEffect(() => {
    if (!isOpen) { setView("list"); return; }
    setLoading(true);
    getPlaylists().then((rows) => {
      setPlaylists(rows as PlaylistRow[]);
      setLoading(false);
    });
  }, [isOpen]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleAdd = (playlistId: string) => {
    if (!trackId) return;
    startTransition(async () => {
      const res = await addTrackToPlaylist(playlistId, trackId);
      if (res.error) { toast.error(res.error); return; }
      toast.success("Трек добавлен в плейлист");
      closeModal();
      router.refresh();
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500]"
            onClick={closeModal}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{    opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center z-[501] pointer-events-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-[360px] max-h-[85vh] flex flex-col pointer-events-auto
                         bg-[#0A0F1E]/97 backdrop-blur-2xl
                         border border-white/[0.08] rounded-2xl
                         shadow-[0_24px_60px_rgba(0,0,0,0.6)] overflow-hidden"
            >

              {/* ── Header ─────────────────────────────────────────────────── */}
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.05] shrink-0">
                {view === "create" && (
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="p-1 -ml-1 text-white/40 hover:text-white/80 transition-colors
                               rounded-lg hover:bg-white/[0.05]"
                  >
                    <ChevronLeft size={16} strokeWidth={1.5} />
                  </button>
                )}
                <p className="flex-1 text-[14px] font-semibold text-white/80">
                  {view === "list" ? "Добавить в плейлист" : "Новый плейлист"}
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1 text-white/30 hover:text-white/70 transition-colors
                             rounded-lg hover:bg-white/[0.05]"
                >
                  <X size={15} strokeWidth={1.5} />
                </button>
              </div>

              {/* ── List view ──────────────────────────────────────────────── */}
              {view === "list" && (
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

                  {/* Create new */}
                  <button
                    type="button"
                    onClick={() => setView("create")}
                    className="flex items-center gap-3 w-full px-5 py-3.5
                               hover:bg-white/[0.04] transition-colors
                               border-b border-white/[0.04]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-dashed border-white/[0.10]
                                    flex items-center justify-center shrink-0">
                      <Plus size={15} strokeWidth={1.5} className="text-white/35" />
                    </div>
                    <span className="text-[13px] font-medium text-white/50">
                      Создать новый плейлист
                    </span>
                  </button>

                  {/* Loading skeleton */}
                  {loading && [1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.05] shrink-0" />
                      <div className="h-2.5 bg-white/[0.05] rounded-full w-32" />
                    </div>
                  ))}

                  {/* Empty */}
                  {!loading && playlists.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Music size={22} strokeWidth={1} className="text-white/15" />
                      <p className="text-[12px] text-white/25">Плейлистов ещё нет</p>
                    </div>
                  )}

                  {/* Playlist rows */}
                  {!loading && playlists.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAdd(pl.id)}
                      className="flex items-center gap-3 w-full px-5 py-3
                                 hover:bg-white/[0.04] transition-colors duration-150
                                 border-b border-white/[0.03] last:border-0
                                 disabled:opacity-40 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.05]
                                      overflow-hidden shrink-0 flex items-center justify-center">
                        {pl.coverUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={pl.coverUrl} alt="" className="w-full h-full object-cover" />
                          : <Music size={14} strokeWidth={1} className="text-white/20" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white/70 truncate">{pl.name}</p>
                        <p className="text-[11px] text-white/30 mt-0.5">
                          {pl._count.playlistTracks} {trackCountLabel(pl._count.playlistTracks)}
                        </p>
                      </div>
                      <ArrowRight size={13} strokeWidth={1.5} className="text-white/20 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* ── Create view ────────────────────────────────────────────── */}
              {view === "create" && (
                <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
                  <CreatePlaylistForm
                    trackId={trackId ?? undefined}
                    onClose={() => setView("list")}
                    onSuccess={closeModal}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
