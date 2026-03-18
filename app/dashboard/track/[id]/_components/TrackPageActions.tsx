"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play, Pause, Heart, Share2, Pencil,
  MoreHorizontal, ListMusic, Flag,
} from "lucide-react";
import { toast } from "sonner";
import { usePlayerStore, type PlayerTrack } from "@/store/usePlayerStore";
import { usePlaylistModal } from "@/store/usePlaylistModal";
import { toggleSavedTrack } from "@/app/actions/library";
import EditTrackModal from "@/app/dashboard/_components/EditTrackModal";
import ShareModal from "@/components/ShareModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrackActionData = {
  id:            string;
  title:         string;
  artist:        string;
  audioUrl:      string;
  coverUrl:      string | null;
  duration:      number;
  isExplicit:    boolean;
  isPublic:      boolean;
  allowComments: boolean;
  ownerId:       string;
  user?:         { id: string; username: string | null; name: string | null; avatarUrl: string | null; image: string | null };
  genre:         string | null;
  releaseDate:   string | null;
  recordLabel:   string | null;
  buyLink:       string | null;
};

interface Props {
  track:          TrackActionData;
  currentUserId:  string;
  initialIsLiked: boolean;
}

// ─── IconBtn ─────────────────────────────────────────────────────────────────

function IconBtn({
  onClick,
  label,
  children,
  active,
}: {
  onClick: () => void;
  label:   string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-9 h-9 rounded-full flex items-center justify-center
                  transition-all duration-150 active:scale-95
                  ${active
                    ? "text-white bg-white/[0.08]"
                    : "text-white/45 hover:text-white/85 hover:bg-white/[0.06]"
                  }`}
    >
      {children}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrackPageActions({ track, currentUserId, initialIsLiked }: Props) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { openModal: openPlaylistModal } = usePlaylistModal();

  const isOwner       = currentUserId === track.ownerId;
  const isActive      = currentTrack?.id === track.id;
  const isThisPlaying = isActive && isPlaying;

  // ── Local states ─────────────────────────────────────────────────────────────
  const [isLiked,        setIsLiked]        = useState(initialIsLiked || isOwner);
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMoreMenu,   setShowMoreMenu]   = useState(false);

  const moreRef    = useRef<HTMLDivElement>(null);
  const moreBtn    = useRef<HTMLButtonElement>(null);

  // Close more-menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node))
        setShowMoreMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMoreMenu]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handlePlay = () => {
    const playerTrack: PlayerTrack = {
      id:            track.id,
      title:         track.title,
      artist:        track.artist,
      audioUrl:      track.audioUrl,
      coverUrl:      track.coverUrl,
      duration:      track.duration,
      isExplicit:    track.isExplicit,
      isPublic:      track.isPublic,
      allowComments: track.allowComments,
      ownerId:       track.ownerId,
      user:          track.user,
      genre:         track.genre,
      releaseDate:   track.releaseDate,
      recordLabel:   track.recordLabel,
      buyLink:       track.buyLink,
    };
    if (isActive) togglePlay();
    else playTrack(playerTrack, [playerTrack]);
  };

  const handleLike = async () => {
    if (isOwner) {
      toast("Это ваш трек — он всегда находится в вашей библиотеке.", { icon: "🎵" });
      return;
    }
    const prev = isLiked;
    setIsLiked(!prev); // optimistic
    const result = await toggleSavedTrack(track.id);
    if ("error" in result) {
      setIsLiked(prev); // revert
      toast.error("Не удалось обновить библиотеку");
    } else {
      toast.success(result.saved ? "Добавлено в библиотеку" : "Удалено из библиотеки");
    }
  };

  const handleShare = () => setShowShareModal(true);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          track={{
            id:       track.id,
            title:    track.title,
            artist:   track.artist,
            coverUrl: track.coverUrl,
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Edit modal */}
      {showEditModal && (
        <EditTrackModal
          track={{
            id:            track.id,
            title:         track.title,
            genre:         track.genre,
            releaseDate:   track.releaseDate,
            recordLabel:   track.recordLabel,
            buyLink:       track.buyLink,
            isExplicit:    track.isExplicit,
            isPublic:      track.isPublic,
            allowComments: track.allowComments,
            coverUrl:      track.coverUrl,
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <div className="flex items-center gap-3 mt-7">

        {/* ── Play ── */}
        <button
          type="button"
          onClick={handlePlay}
          className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white text-[#030712] text-[13px] font-semibold hover:bg-white/90 active:scale-[0.98] transition-all duration-150"
        >
          {isThisPlaying
            ? <Pause size={13} strokeWidth={2} className="fill-[#030712]" />
            : <Play  size={13} strokeWidth={2} className="fill-[#030712] translate-x-[1px]" />
          }
          {isThisPlaying ? "Пауза" : "Воспроизвести"}
        </button>

        {/* ── Separator ── */}
        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* ── Like ── */}
        <IconBtn onClick={() => { void handleLike(); }} label={isLiked ? "Убрать из библиотеки" : "В библиотеку"}>
          <Heart
            size={17}
            strokeWidth={1.5}
            className={`transition-all duration-150 ${
              isLiked ? "fill-red-500 text-red-500" : ""
            }`}
          />
        </IconBtn>

        {/* ── Share ── */}
        <IconBtn onClick={handleShare} label="Поделиться">
          <Share2 size={17} strokeWidth={1.5} />
        </IconBtn>

        {/* ── Edit (owner only) ── */}
        {isOwner && (
          <IconBtn onClick={() => setShowEditModal(true)} label="Редактировать">
            <Pencil size={15} strokeWidth={1.5} />
          </IconBtn>
        )}

        {/* ── More ── */}
        <div ref={moreRef} className="relative">
          <IconBtn
            onClick={() => setShowMoreMenu((v) => !v)}
            label="Ещё"
            active={showMoreMenu}
          >
            <MoreHorizontal size={17} strokeWidth={1.5} />
          </IconBtn>

          <AnimatePresence>
            {showMoreMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                exit={{    opacity: 0, scale: 0.95, y: 6 }}
                transition={{ duration: 0.13, ease: "easeOut" }}
                style={{ transformOrigin: "top left" }}
                className="absolute top-11 left-0 z-50 w-52 bg-[#1C1C1E]/96 backdrop-blur-2xl
                           border border-white/[0.09] rounded-xl shadow-2xl overflow-hidden p-1"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => { setShowMoreMenu(false); openPlaylistModal(track.id); }}
                  className="flex items-center gap-2.5 w-full text-left px-3 py-[7px] text-[13px] rounded-lg
                             text-white/60 hover:bg-white/[0.07] hover:text-white/90 transition-colors duration-100"
                >
                  <ListMusic size={13} strokeWidth={1.5} className="shrink-0" />
                  Добавить в плейлист
                </button>

                {!isOwner && (
                  <>
                    <div className="h-px bg-white/[0.07] my-0.5 mx-1" />
                    <button
                      type="button"
                      onClick={() => setShowMoreMenu(false)}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-[7px] text-[13px] rounded-lg
                                 text-red-400/80 hover:bg-red-500/[0.12] hover:text-red-400 transition-colors duration-100"
                    >
                      <Flag size={13} strokeWidth={1.5} className="shrink-0" />
                      Пожаловаться
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </>
  );
}
