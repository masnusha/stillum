"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, Share2, Pencil, MoreHorizontal,
  Trash2, ListMusic, Flag, UserPlus, UserCheck,
  Send, MessageCircle, Smile, ChevronRight,
} from "lucide-react";
import { usePlayerStore }              from "@/store/usePlayerStore";
import { toggleSavedTrack, isTrackSaved } from "@/app/actions/library";
import { followUser, unfollowUser }   from "@/app/actions/follow";
import { usePlaylistModal }           from "@/store/usePlaylistModal";
import { deleteTrack }                              from "@/app/actions/track";
import {
  getTrackComments, addComment,
  type CommentWithUser, type ReplyWithUser, type ReactionData,
} from "@/app/actions/comment";
import { useRouter }          from "next/navigation";
import EditTrackModal         from "@/app/dashboard/_components/EditTrackModal";
import DeleteConfirmModal     from "@/app/dashboard/_components/DeleteConfirmModal";
import ShareModal             from "@/components/ShareModal";
import { CommentThread, CornerDownRight } from "@/components/CommentItem";
import { dispatchCommentsChanged } from "@/components/TrackCommentsSection";
import EmojiGrid from "@/components/EmojiGrid";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_WIDTH = 300;
const MAX_WIDTH = 600;

// ─── Sub-components ───────────────────────────────────────────────────────────

function DropdownSep() {
  return <div className="h-px bg-white/[0.07] my-0.5 mx-1" aria-hidden />;
}

function DropdownItem({
  icon: Icon, label, onClick, destructive,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string; onClick: () => void; destructive?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick}
      className={`flex items-center gap-2.5 w-full text-left px-3 py-[7px] text-[13px] rounded-lg transition-colors duration-100
        ${destructive
          ? "text-red-400/80 hover:bg-red-500/[0.12] hover:text-red-400"
          : "text-white/60 hover:bg-white/[0.07] hover:text-white/90"}`}
    >
      <Icon size={13} strokeWidth={1.5} className="shrink-0" />
      {label}
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[11px] text-white/30 shrink-0">{label}</span>
      <span className="text-[11px] text-white/65 text-right truncate">{value}</span>
    </div>
  );
}

// ─── NowPlayingSidebar ────────────────────────────────────────────────────────

interface Props { userId: string }

export default function NowPlayingSidebar({ userId }: Props) {
  const router = useRouter();
  const {
    currentTrack, isSidebarOpen, toggleSidebar, openSidebar, playNext,
    sidebarWidth, setSidebarWidth, setIsResizing,
  } = usePlayerStore();

  const isOwner = Boolean(currentTrack && currentTrack.ownerId === userId);
  const { openModal: openPlaylistModal } = usePlaylistModal();

  // ── Tab ──────────────────────────────────────────────────────────────────────
  const [activeTab,  setActiveTab]  = useState<"details" | "comments">("details");

  // ── Details ──────────────────────────────────────────────────────────────────
  const [isLiked,    setIsLiked]    = useState(false);
  const [isFollowing,setIsFollowing]= useState(false);

  // ── Menus / modals ───────────────────────────────────────────────────────────
  const [showMoreMenu,      setShowMoreMenu]      = useState(false);
  const [showEditModal,     setShowEditModal]     = useState(false);
  const [showShareModal,    setShowShareModal]    = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [moreMenuPos,       setMoreMenuPos]       = useState({ bottom: 0, right: 0 });
  const [isPending,         startTransition]      = useTransition();

  // ── Comments ─────────────────────────────────────────────────────────────────
  const [comments,         setComments]         = useState<CommentWithUser[]>([]);
  const [commentsLoaded,   setCommentsLoaded]   = useState(false);
  const [commentsLoading,  setCommentsLoading]  = useState(false);
  const [commentText,      setCommentText]      = useState("");
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [replyingTo,      setReplyingTo]      = useState<CommentWithUser | ReplyWithUser | null>(null);
  const [showInputPicker, setShowInputPicker] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const moreMenuRef   = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // ── Resize ───────────────────────────────────────────────────────────────────
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: PointerEvent) => {
      const clampedMax = Math.min(MAX_WIDTH, Math.floor(window.innerWidth * 0.4));
      setSidebarWidth(Math.max(MIN_WIDTH, Math.min(clampedMax, window.innerWidth - ev.clientX)));
    };
    const onUp = () => {
      setIsResizing(false);
      document.body.style.cursor = document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
  };

  // ── Effects ───────────────────────────────────────────────────────────────────

  // Reset + auto-open when track changes; fetch real like state from DB
  useEffect(() => {
    if (!currentTrack) return;
    openSidebar();
    setIsLiked(false);
    setComments([]);
    setCommentsLoaded(false);
    setActiveTab("details");
    setReplyingTo(null);
    setCommentText("");
    setShowInputPicker(false);

    // Fetch real saved state (skip for owner — always saved)
    if (!isOwner) {
      isTrackSaved(currentTrack.id).then(setIsLiked).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Lazy-load comments when tab first becomes active
  const loadComments = useCallback(async (trackId: string) => {
    setCommentsLoading(true);
    const res = await getTrackComments(trackId);
    if (res.comments) { setComments(res.comments); setCommentsLoaded(true); }
    setCommentsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "comments" && currentTrack && !commentsLoaded)
      loadComments(currentTrack.id);
  }, [activeTab, currentTrack, commentsLoaded, loadComments]);

  // Sync with TrackCommentsSection on the track page — refetch when it mutates
  useEffect(() => {
    if (!currentTrack) return;
    const trackId = currentTrack.id;
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ trackId: string }>;
      if (ev.detail?.trackId !== trackId) return;
      // If comments tab is open, reload immediately; otherwise mark stale
      if (activeTab === "comments") {
        loadComments(trackId);
      } else {
        setCommentsLoaded(false); // force reload next time tab opens
      }
    };
    window.addEventListener("track-comments:changed", handler);
    return () => window.removeEventListener("track-comments:changed", handler);
  }, [currentTrack, activeTab, loadComments]);

  // Scroll to latest comment
  useEffect(() => {
    if (activeTab === "comments")
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length, activeTab]);

  // Outside-click closes more-menu
  useEffect(() => {
    if (!showMoreMenu) return;
    const onDown = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node))
        setShowMoreMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showMoreMenu]);


  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleShare = () => { if (currentTrack) setShowShareModal(true); };

  const handleFollowToggle = () => {
    if (!currentTrack?.ownerId) return;
    const targetId = currentTrack.ownerId;
    const next = !isFollowing;
    setIsFollowing(next);
    startTransition(async () => {
      try {
        if (next) await followUser(targetId);
        else      await unfollowUser(targetId);
      } catch { setIsFollowing(!next); }
    });
  };

  const handleDeleteTrack = () => {
    if (!currentTrack) return;
    startTransition(async () => {
      const res = await deleteTrack(currentTrack.id);
      if (res.error) {
        toast.error("Не удалось удалить трек. Попробуйте ещё раз.");
        return;
      }
      setShowDeleteConfirm(false);
      playNext();
      toggleSidebar();
      toast.success("Трек полностью удалён из Stillum");
      router.refresh();
    });
  };

  // When replying to a reply, flatten to the root comment level.
  // Also auto-insert @mention so readers understand the context.
  const handleReply = useCallback((target: CommentWithUser | ReplyWithUser) => {
    setReplyingTo(target);
    // If target is itself a reply, pre-fill @mention for context
    if (target.parentId) {
      const name = target.user.username ?? target.user.name ?? "Пользователь";
      setCommentText(`@${name} `);
    } else {
      setCommentText("");
    }
    // Focus input and scroll it into view
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }, []);

  const handleSubmitComment = async () => {
    if (!currentTrack || !commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    // If replyingTo is itself a reply, submit to its parent (root) to keep 1-level depth
    const parentId = replyingTo
      ? (replyingTo.parentId ?? replyingTo.id)
      : undefined;
    const res = await addComment(currentTrack.id, commentText, parentId);
    if (res.comment) {
      if (parentId) {
        // parentId always points to a root comment (flattened)
        setComments((prev) => prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...c.replies, res.comment as ReplyWithUser] }
            : c,
        ));
      } else {
        setComments((prev) => [...prev, res.comment as CommentWithUser]);
      }
      setCommentText("");
      setReplyingTo(null);
      dispatchCommentsChanged(currentTrack.id);
    }
    setIsSubmitting(false);
  };

  const handleCommentDeleted = (id: string) => {
    setComments((prev) => {
      const isTopLevel = prev.some((c) => c.id === id);
      if (isTopLevel) return prev.filter((c) => c.id !== id);
      return prev.map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== id) }));
    });
    if (currentTrack) dispatchCommentsChanged(currentTrack.id);
  };

  const handleReactionChange = (
    commentId: string, emoji: string, added: boolean, reaction?: ReactionData,
  ) => {
    setComments((prev) => prev.map((c) => {
      if (c.id === commentId) {
        const reactions = added && reaction
          ? [...c.reactions, reaction]
          : c.reactions.filter((r) => !(r.emoji === emoji && r.userId === userId));
        return { ...c, reactions };
      }
      if (c.replies.some((r) => r.id === commentId)) {
        const replies = c.replies.map((r) => {
          if (r.id !== commentId) return r;
          const reactions = added && reaction
            ? [...r.reactions, reaction]
            : r.reactions.filter((rx) => !(rx.emoji === emoji && rx.userId === userId));
          return { ...r, reactions };
        });
        return { ...c, replies };
      }
      return c;
    }));
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Modals */}
      {showEditModal && currentTrack && (
        <EditTrackModal
          track={{
            id:          currentTrack.id,
            title:       currentTrack.title,
            coverUrl:    currentTrack.coverUrl,
            isExplicit:    currentTrack.isExplicit    ?? false,
            isPublic:      currentTrack.isPublic      ?? false,
            allowComments: currentTrack.allowComments ?? true,
            genre:       currentTrack.genre        ?? null,
            releaseDate: currentTrack.releaseDate  ?? null,
            recordLabel: currentTrack.recordLabel  ?? null,
            buyLink:     currentTrack.buyLink      ?? null,
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {showShareModal && currentTrack && (
        <ShareModal
          track={{
            id:       currentTrack.id,
            title:    currentTrack.title,
            artist:   currentTrack.user?.username ?? currentTrack.user?.name ?? currentTrack.artist,
            coverUrl: currentTrack.coverUrl ?? null,
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {showDeleteConfirm && currentTrack && (
        <DeleteConfirmModal
          track={{ title: currentTrack.title, artist: currentTrack.artist, coverUrl: currentTrack.coverUrl }}
          isPending={isPending}
          onConfirm={handleDeleteTrack}
          onClose={() => { if (!isPending) setShowDeleteConfirm(false); }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR PANEL
          Layout (flex-col, fixed height):
            1. Resize handle (absolute)
            2. Header       (shrink-0)
            3. Scroll body  (flex-1 overflow-y-auto)
                a. Hero cover
                b. Info block (title + artist + actions)
                c. Sticky tab bar
                d. Tab content (details or comment list)
            4. Comment input (shrink-0, visible only on comments tab)
         ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`
          fixed top-0 right-0 flex flex-col overflow-hidden
          bg-[#050A15]/96 backdrop-blur-xl
          border-l border-white/[0.05] z-[40]
          transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
          ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
        `}
        style={{
          width:     `${sidebarWidth}px`,
          height:    "calc(100vh - 72px)",
          boxShadow: "-10px 0 15px rgba(0,0,0,0.1)",
        }}
      >
        {/* ── 1. Resize handle ─────────────────────────────────────────────── */}
        <div
          onPointerDown={handleResizePointerDown}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20
                     hover:bg-white/[0.07] active:bg-white/[0.12] transition-colors duration-150"
          aria-hidden
        />

        {/* ── 2. Header ────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-2 px-5 pt-5 pb-4">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Свернуть"
            className="p-1.5 -ml-1.5 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-md transition-all duration-150 group"
          >
            <ChevronRight size={16} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform duration-150" />
          </button>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-white/25 select-none">
            Сейчас играет
          </p>
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!currentTrack ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 pb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-white/[0.05]" />
            </div>
            <p className="text-[12px] text-white/20 text-center leading-relaxed">
              Выберите трек<br />для воспроизведения
            </p>
          </div>
        ) : (
          <>
            {/* ── 3. Scroll body ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">

              <div className="px-5">
                {/* ── a. Hero cover ──────────────────────────────────────────── */}
                <div className="w-full aspect-square rounded-xl overflow-hidden mb-5
                                bg-white/[0.04] border border-white/[0.04] shadow-2xl">
                  {currentTrack.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentTrack.coverUrl}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.06]" />
                    </div>
                  )}
                </div>

                {/* ── b. Info block ──────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  {/* Left — title + artist */}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[18px] font-bold text-white leading-tight tracking-tight truncate">
                      {currentTrack.title}
                    </h2>
                    {currentTrack.ownerId ? (
                      <Link
                        href={`/dashboard/profile/${currentTrack.ownerId}`}
                        className="text-[13px] text-white/45 hover:text-white/70 mt-1 truncate block transition-colors"
                      >
                        {currentTrack.user?.username ?? currentTrack.user?.name ?? currentTrack.artist}
                      </Link>
                    ) : (
                      <p className="text-[13px] text-white/45 mt-1 truncate">
                        {currentTrack.user?.username ?? currentTrack.user?.name ?? currentTrack.artist}
                      </p>
                    )}
                  </div>

                  {/* Right — action buttons */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {/* Heart */}
                    {(() => {
                      const likedDisplay = isLiked || isOwner;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (isOwner) {
                              toast("Это ваш трек — он всегда в вашей библиотеке.", { icon: "🎵" });
                              return;
                            }
                            if (!currentTrack) return;
                            const prev = isLiked;
                            setIsLiked(!prev); // optimistic
                            toggleSavedTrack(currentTrack.id).then((res) => {
                              if ("error" in res) {
                                setIsLiked(prev); // rollback
                                toast.error("Не удалось обновить медиатеку");
                              } else {
                                if (res.saved !== !prev) setIsLiked(res.saved); // sync
                                toast.success(res.saved ? "Добавлено в медиатеку" : "Удалено из медиатеки");
                              }
                            }).catch(() => {
                              setIsLiked(prev);
                              toast.error("Не удалось обновить медиатеку");
                            });
                          }}
                          aria-label={likedDisplay ? "Убрать из медиатеки" : "В медиатеку"}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
                            ${likedDisplay
                              ? "text-red-400 bg-red-500/10"
                              : "text-white/30 hover:text-white/70 hover:bg-white/[0.06]"}`}
                        >
                          <Heart size={15} strokeWidth={1.5} fill={likedDisplay ? "currentColor" : "none"} />
                        </button>
                      );
                    })()}

                    {/* Share */}
                    <button
                      type="button"
                      onClick={handleShare}
                      aria-label="Поделиться"
                      className="w-8 h-8 rounded-lg flex items-center justify-center
                                 text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-150"
                    >
                      <Share2 size={15} strokeWidth={1.5} />
                    </button>

                    {/* Pencil — owner only */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setShowEditModal(true)}
                        aria-label="Редактировать"
                        className="w-8 h-8 rounded-lg flex items-center justify-center
                                   text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-150"
                      >
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>
                    )}

                    {/* More */}
                    <div ref={moreMenuRef}>
                      <button
                        ref={moreButtonRef}
                        type="button"
                        onClick={() => {
                          const r = moreButtonRef.current?.getBoundingClientRect();
                          if (r) setMoreMenuPos({ bottom: window.innerHeight - r.top + 6, right: window.innerWidth - r.right });
                          setShowMoreMenu((v) => !v);
                        }}
                        aria-label="Ещё"
                        aria-expanded={showMoreMenu}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
                          ${showMoreMenu
                            ? "text-white/80 bg-white/[0.1]"
                            : "text-white/30 hover:text-white/70 hover:bg-white/[0.06]"}`}
                      >
                        <MoreHorizontal size={15} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── c. Sticky tab bar ─────────────────────────────────────────── */}
              <div className="sticky top-0 z-10 bg-[#050A15]/98 backdrop-blur-xl
                              flex gap-5 px-5 border-b border-white/[0.05] mb-0">
                {(["details", "comments"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 pt-2 text-[12px] font-medium transition-all duration-150
                                border-b-2 -mb-px
                      ${activeTab === tab
                        ? "text-white border-white"
                        : "text-white/40 border-transparent hover:text-white/65"}`}
                  >
                    {tab === "details" ? "Детали" : (
                      <span className="flex items-center gap-1.5">
                        Комментарии
                        {comments.length > 0 && (() => {
                          const total = comments.reduce((n, c) => n + 1 + c.replies.length, 0);
                          return (
                            <span className="text-[10px] bg-white/[0.08] text-white/40
                                             rounded-full px-1.5 py-0.5 leading-none tabular-nums">
                              {total}
                            </span>
                          );
                        })()}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── d. Tab content ─────────────────────────────────────────────── */}

              {/* ══ DETAILS ══ */}
              {activeTab === "details" && (
                <div className="px-5 pt-5 pb-6 flex flex-col gap-4">

                  {/* Uploader card — rendered synchronously from track.user */}
                  {currentTrack.user && currentTrack.ownerId && (() => {
                    const u = currentTrack.user!;
                    const displayName = u.username ?? u.name ?? "Артист";
                    const avatar = u.avatarUrl ?? u.image;
                    return (
                      <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl
                                      flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
                        <Link
                          href={`/dashboard/profile/${currentTrack.ownerId}`}
                          className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.06]
                                     overflow-hidden shrink-0 flex items-center justify-center"
                        >
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[12px] font-medium text-white/40">
                              {displayName[0]?.toUpperCase() ?? "?"}
                            </span>
                          )}
                        </Link>

                        <Link href={`/dashboard/profile/${currentTrack.ownerId}`} className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-white/80 truncate hover:text-white transition-colors">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-white/30">
                            {isOwner ? "Ваш трек" : "Артист"}
                          </p>
                        </Link>

                        {!isOwner && (
                          <button
                            type="button"
                            onClick={handleFollowToggle}
                            disabled={isPending}
                            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                                       text-[11px] font-medium transition-all duration-150 disabled:opacity-40
                              ${isFollowing
                                ? "text-white/35 hover:text-red-400/70"
                                : "bg-white/[0.07] text-white/60 hover:bg-white/[0.12] hover:text-white"}`}
                          >
                            {isFollowing
                              ? <UserCheck size={11} strokeWidth={1.5} />
                              : <UserPlus  size={11} strokeWidth={1.5} />
                            }
                            {isFollowing ? "Вы подписаны" : "Подписаться"}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Metadata */}
                  <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <p className="text-[9px] font-semibold tracking-widest uppercase text-white/20 mb-3 select-none">
                      О треке
                    </p>
                    <div className="flex flex-col gap-2.5">
                      <MetaRow label="Дата релиза" value={
                        currentTrack.releaseDate
                          ? currentTrack.releaseDate.split("-").reverse().join(".")
                          : "—"
                      } />
                      <MetaRow label="Жанр"         value={currentTrack.genre       ?? "—"} />
                      <MetaRow label="Лейбл"        value={currentTrack.recordLabel ?? "—"} />
                    </div>
                  </div>
                </div>
              )}

              {/* ══ COMMENTS DISABLED BANNER ══ */}
              {activeTab === "comments" && currentTrack?.allowComments === false && (
                <div className="px-5 pt-8 pb-6 flex flex-col items-center justify-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center">
                    <MessageCircle size={16} strokeWidth={1.5} className="text-white/15" />
                  </div>
                  <p className="text-[12px] text-white/25 text-center leading-relaxed">
                    Комментарии к этому треку<br />отключены автором.
                  </p>
                </div>
              )}

              {/* ══ COMMENTS LIST (no internal scroll — parent scrolls) ══ */}
              {activeTab === "comments" && currentTrack?.allowComments !== false && (
                <div className="px-5 pt-4 pb-4 flex flex-col gap-3 min-h-[120px]">

                  {/* Loading skeleton */}
                  {commentsLoading && (
                    <div className="flex flex-col gap-3 pt-1">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-2.5 animate-pulse">
                          <div className="w-7 h-7 rounded-full bg-white/[0.05] shrink-0" />
                          <div className="flex-1 space-y-1.5 pt-0.5">
                            <div className="h-2 bg-white/[0.05] rounded-full w-1/3" />
                            <div className="h-2 bg-white/[0.04] rounded-full w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!commentsLoading && comments.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/[0.04]
                                      flex items-center justify-center">
                        <MessageCircle size={16} strokeWidth={1.5} className="text-white/15" />
                      </div>
                      <p className="text-[12px] text-white/20 text-center leading-relaxed">
                        Комментариев пока нет.<br />Будьте первым.
                      </p>
                    </div>
                  )}

                  {/* Comment threads */}
                  {!commentsLoading && comments.map((c) => (
                    <CommentThread
                      key={c.id}
                      comment={c}
                      userId={userId}
                      isOwner={isOwner}
                      trackOwnerId={currentTrack?.ownerId ?? ""}
                      onDeleted={handleCommentDeleted}
                      onReply={handleReply}
                      onReactionChange={handleReactionChange}
                    />
                  ))}

                  {/* Scroll anchor */}
                  <div ref={commentsEndRef} />
                </div>
              )}
            </div>

            {/* ── 4. Comment input — pinned to bottom, only on comments tab ── */}
            {activeTab === "comments" && currentTrack?.allowComments !== false && (
              <div className="shrink-0 px-5 py-3 border-t border-white/[0.04] bg-[#050A15]">

                {/* Reply banner */}
                {replyingTo && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <CornerDownRight size={11} strokeWidth={1.5} className="text-white/25 shrink-0" />
                    <span className="text-[11px] text-white/35 truncate flex-1">
                      Ответ пользователю{" "}
                      <span className="text-white/55 font-medium">
                        @{replyingTo.user.username ?? replyingTo.user.name ?? "Пользователь"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => { setReplyingTo(null); setCommentText(""); }}
                      className="shrink-0 text-white/25 hover:text-white/60 transition-colors"
                      aria-label="Отменить ответ"
                    >
                      <X size={11} strokeWidth={1.5} />
                    </button>
                  </div>
                )}

                {/* Input row */}
                <div className="flex items-end gap-2 px-3 py-2.5
                                bg-white/[0.03] border border-white/[0.06] rounded-xl
                                focus-within:border-white/[0.12] transition-colors duration-150">
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = `${t.scrollHeight}px`;
                    }}
                    placeholder={replyingTo ? "Написать ответ…" : "Написать комментарий…"}
                    rows={1}
                    maxLength={500}
                    className="flex-1 bg-transparent text-[12px] text-white/70 placeholder-white/20
                               resize-none outline-none leading-relaxed
                               min-h-[20px] max-h-[80px] overflow-y-auto scrollbar-hide"
                    style={{ height: "auto" }}
                  />

                  {/* Emoji picker */}
                  <div className="shrink-0">
                    <EmojiGrid
                      open={showInputPicker}
                      onOpenChange={setShowInputPicker}
                      onSelect={(emoji) => {
                        setCommentText((prev) => prev + emoji);
                        textareaRef.current?.focus();
                      }}
                      trigger={
                        <button
                          type="button"
                          aria-label="Добавить эмодзи"
                          className={`w-7 h-7 rounded-lg flex items-center justify-center
                                      transition-all duration-150
                                      ${showInputPicker
                                        ? "text-white/70 bg-white/[0.08]"
                                        : "text-white/25 hover:text-white/60 hover:bg-white/[0.06]"}`}
                        >
                          <Smile size={13} strokeWidth={1.5} />
                        </button>
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || isSubmitting}
                    aria-label="Отправить"
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                               transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed
                               text-white/50 hover:text-white hover:bg-white/[0.08]"
                  >
                    {isSubmitting
                      ? <span className="w-3 h-3 rounded-full border border-white/30 border-t-transparent animate-spin" />
                      : <Send size={12} strokeWidth={1.5} />
                    }
                  </button>
                </div>
                <p className="text-[10px] text-white/15 mt-1.5 text-right select-none">
                  {commentText.length}/500 · Enter для отправки
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── More-menu dropdown — fixed to viewport ─────────────────────────── */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{    opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            style={{
              position:        "fixed",
              bottom:          moreMenuPos.bottom,
              right:           moreMenuPos.right,
              transformOrigin: "bottom right",
              zIndex:          200,
            }}
            className="w-52 rounded-xl bg-[#1C1C1E]/92 backdrop-blur-2xl
                       border border-white/[0.09] shadow-2xl p-1"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {isOwner ? (
              <>
                <DropdownItem icon={ListMusic} label="Добавить в плейлист"
                  onClick={() => { setShowMoreMenu(false); if (currentTrack) openPlaylistModal(currentTrack.id); }} />
                <DropdownSep />
                <DropdownItem icon={Trash2} label="Удалить из библиотеки"
                  onClick={() => { setShowMoreMenu(false); setShowDeleteConfirm(true); }} destructive />
              </>
            ) : (
              <>
                <DropdownItem icon={ListMusic} label="Добавить в плейлист"
                  onClick={() => { setShowMoreMenu(false); if (currentTrack) openPlaylistModal(currentTrack.id); }} />
                <DropdownSep />
                <DropdownItem icon={Flag} label="Пожаловаться" onClick={() => setShowMoreMenu(false)} destructive />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
