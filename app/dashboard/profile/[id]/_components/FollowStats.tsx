"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getFollowers, getFollowing, type FollowUser } from "@/app/actions/follow-list";
import { followUser, unfollowUser } from "@/app/actions/follow";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  targetId:      string;
  currentUserId: string;
  followerCount: number;
  followingCount: number;
  trackCount:    number;
  playlistCount: number;
}

// ─── MiniFollowButton ─────────────────────────────────────────────────────────

function MiniFollowButton({
  targetId,
  initial,
}: {
  targetId: string;
  initial:  boolean;
}) {
  const [following, setFollowing] = useState(initial);
  const [pending,   start]        = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !following;
    setFollowing(next);
    start(async () => {
      try {
        if (next) await followUser(targetId);
        else      await unfollowUser(targetId);
      } catch {
        setFollowing(!next);
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={[
        "shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        following
          ? "border-white/15 bg-white/[0.06] text-white/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
          : "border-white/20 bg-white/[0.05] text-white/80 hover:bg-white/10",
      ].join(" ")}
    >
      {following ? "Подписан" : "Подписаться"}
    </button>
  );
}

// ─── ModalUserRow ─────────────────────────────────────────────────────────────

function ModalUserRow({
  user,
  currentUserId,
  onClose,
}: {
  user:          FollowUser;
  currentUserId: string;
  onClose:       () => void;
}) {
  const initial = user.name[0]?.toUpperCase() ?? "?";
  const isSelf  = user.id === currentUserId;

  return (
    <Link
      href={`/dashboard/profile/${user.id}`}
      onClick={onClose}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-white/[0.06] border border-white/[0.07] flex items-center justify-center">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-white/25 select-none">{initial}</span>
        )}
      </div>

      {/* Name */}
      <span className="text-[13px] font-medium text-white/70 group-hover:text-white transition-colors flex-1 truncate">
        {user.name}
      </span>

      {/* Follow button (not shown for self) */}
      {!isSelf && (
        <MiniFollowButton targetId={user.id} initial={user.isFollowedByMe} />
      )}
    </Link>
  );
}

// ─── FollowStats ──────────────────────────────────────────────────────────────

type ModalType = "followers" | "following";

export default function FollowStats({
  targetId,
  currentUserId,
  followerCount,
  followingCount,
  trackCount,
  playlistCount,
}: Props) {
  const [modal,   setModal]   = useState<ModalType | null>(null);
  const [users,   setUsers]   = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);

  async function openModal(type: ModalType) {
    setModal(type);
    setUsers([]);
    setLoading(true);
    const data = type === "followers"
      ? await getFollowers(targetId)
      : await getFollowing(targetId);
    setUsers(data);
    setLoading(false);
  }

  function closeModal() {
    setModal(null);
  }

  const title = modal === "followers" ? "Подписчики" : "Подписки";

  return (
    <>
      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div className="flex items-center flex-wrap gap-y-2 text-sm justify-center md:justify-start">

        {/* Followers — clickable */}
        <button
          type="button"
          onClick={() => openModal("followers")}
          className="flex items-center gap-1.5 group"
        >
          <span className="font-bold text-white group-hover:text-white/80 transition-colors">
            {followerCount.toLocaleString("ru-RU")}
          </span>
          <span className="text-white/50 font-normal group-hover:text-white/70 transition-colors underline-offset-4 group-hover:underline decoration-white/20">
            подписчиков
          </span>
        </button>

        <span className="text-white/20 px-2">&middot;</span>

        {/* Following — clickable */}
        <button
          type="button"
          onClick={() => openModal("following")}
          className="flex items-center gap-1.5 group"
        >
          <span className="font-bold text-white group-hover:text-white/80 transition-colors">
            {followingCount.toLocaleString("ru-RU")}
          </span>
          <span className="text-white/50 font-normal group-hover:text-white/70 transition-colors underline-offset-4 group-hover:underline decoration-white/20">
            подписок
          </span>
        </button>

        <span className="text-white/20 px-2">&middot;</span>

        {/* Tracks */}
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-white">{trackCount}</span>
          <span className="text-white/50 font-normal">треков</span>
        </span>

        <span className="text-white/20 px-2">&middot;</span>

        {/* Playlists */}
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-white">{playlistCount}</span>
          <span className="text-white/50 font-normal">плейлистов</span>
        </span>

      </div>

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            key="modal-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />

            {/* Panel */}
            <motion.div
              key="modal-panel"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-[#0d1117] border border-white/[0.09] rounded-3xl shadow-2xl flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
                <h2 className="text-[14px] font-bold text-white tracking-tight">{title}</h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center text-white/40 hover:text-white transition-all"
                  aria-label="Закрыть"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 py-1">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-[13px] text-white/30">Здесь пока никого нет</p>
                  </div>
                ) : (
                  users.map((u) => (
                    <ModalUserRow
                      key={u.id}
                      user={u}
                      currentUserId={currentUserId}
                      onClose={closeModal}
                    />
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
