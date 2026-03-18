"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, X, Smile } from "lucide-react";
import {
  getTrackComments, addComment,
  type CommentWithUser, type ReplyWithUser, type ReactionData,
} from "@/app/actions/comment";
import { CommentThread, CornerDownRight } from "@/components/CommentItem";
import EmojiGrid from "@/components/EmojiGrid";

// ─── Custom event key ─────────────────────────────────────────────────────────
// Both this component and NowPlayingSidebar dispatch/listen to this event so
// that adding/deleting a comment in one place syncs the other.

export function dispatchCommentsChanged(trackId: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("track-comments:changed", { detail: { trackId } }));
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  trackId:       string;
  trackOwnerId:  string;
  currentUserId: string;
  allowComments: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrackCommentsSection({
  trackId, trackOwnerId, currentUserId, allowComments,
}: Props) {
  const isOwner = currentUserId === trackOwnerId;

  const [comments,        setComments]       = useState<CommentWithUser[]>([]);
  const [loading,         setLoading]        = useState(true);
  const [commentText,     setCommentText]    = useState("");
  const [isSubmitting,    setIsSubmitting]   = useState(false);
  const [replyingTo,      setReplyingTo]     = useState<CommentWithUser | ReplyWithUser | null>(null);
  const [showInputPicker, setShowInputPicker]= useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listEndRef  = useRef<HTMLDivElement>(null);

  // ── Load ─────────────────────────────────────────────────────────────────────

  const loadComments = useCallback(async () => {
    setLoading(true);
    const res = await getTrackComments(trackId);
    if (res.comments) setComments(res.comments);
    setLoading(false);
  }, [trackId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  // ── Cross-component sync ──────────────────────────────────────────────────────
  // Re-fetch when the sidebar mutates comments for the same track.

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ trackId: string }>;
      if (ev.detail?.trackId === trackId) loadComments();
    };
    window.addEventListener("track-comments:changed", handler);
    return () => window.removeEventListener("track-comments:changed", handler);
  }, [trackId, loadComments]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleReply = useCallback((target: CommentWithUser | ReplyWithUser) => {
    setReplyingTo(target);
    if (target.parentId) {
      const name = target.user.username ?? target.user.name ?? "Пользователь";
      setCommentText(`@${name} `);
    } else {
      setCommentText("");
    }
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }, []);

  const handleSubmit = async () => {
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const parentId = replyingTo
      ? (replyingTo.parentId ?? replyingTo.id)
      : undefined;
    const res = await addComment(trackId, commentText, parentId);
    if (res.comment) {
      if (parentId) {
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
      dispatchCommentsChanged(trackId);
      setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setIsSubmitting(false);
  };

  const handleDeleted = (id: string) => {
    setComments((prev) => {
      if (prev.some((c) => c.id === id)) return prev.filter((c) => c.id !== id);
      return prev.map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== id) }));
    });
    dispatchCommentsChanged(trackId);
  };

  const handleReactionChange = (
    commentId: string, emoji: string, added: boolean, reaction?: ReactionData,
  ) => {
    setComments((prev) => prev.map((c) => {
      if (c.id === commentId) {
        const reactions = added && reaction
          ? [...c.reactions, reaction]
          : c.reactions.filter((r) => !(r.emoji === emoji && r.userId === currentUserId));
        return { ...c, reactions };
      }
      if (c.replies.some((r) => r.id === commentId)) {
        const replies = c.replies.map((r) => {
          if (r.id !== commentId) return r;
          const reactions = added && reaction
            ? [...r.reactions, reaction]
            : r.reactions.filter((rx) => !(rx.emoji === emoji && rx.userId === currentUserId));
          return { ...r, reactions };
        });
        return { ...c, replies };
      }
      return c;
    }));
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!allowComments) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.04]
                        flex items-center justify-center">
          <MessageCircle size={18} strokeWidth={1.25} className="text-white/15" />
        </div>
        <p className="text-[13px] text-white/30 text-center leading-relaxed">
          Комментарии к этому треку отключены автором.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── List ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/[0.05] shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-2.5 bg-white/[0.05] rounded-full w-1/4" />
                  <div className="h-2.5 bg-white/[0.04] rounded-full w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.04]
                            flex items-center justify-center">
              <MessageCircle size={18} strokeWidth={1.25} className="text-white/15" />
            </div>
            <p className="text-[13px] text-white/30 text-center leading-relaxed">
              Комментариев пока нет.<br />Будьте первым.
            </p>
          </div>
        )}

        {/* Threads */}
        {!loading && comments.map((c) => (
          <CommentThread
            key={c.id}
            comment={c}
            userId={currentUserId}
            isOwner={isOwner}
            trackOwnerId={trackOwnerId}
            onDeleted={handleDeleted}
            onReply={handleReply}
            onReactionChange={handleReactionChange}
          />
        ))}

        <div ref={listEndRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.05] pt-5">

        {/* Reply banner */}
        {replyingTo && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <CornerDownRight size={12} strokeWidth={1.5} className="text-white/25 shrink-0" />
            <span className="text-[12px] text-white/35 truncate flex-1">
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
              <X size={12} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Input box */}
        <div className="flex items-end gap-3 px-4 py-3
                        bg-white/[0.03] border border-white/[0.06] rounded-2xl
                        focus-within:border-white/[0.12] transition-colors duration-150">
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
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
            className="flex-1 bg-transparent text-[13px] text-white/70
                       placeholder-white/20 resize-none outline-none
                       leading-relaxed min-h-[22px] max-h-[120px] overflow-y-auto scrollbar-hide"
            style={{ height: "auto" }}
          />

          {/* Emoji */}
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
                  className={`w-8 h-8 rounded-xl flex items-center justify-center
                              transition-all duration-150
                              ${showInputPicker
                                ? "text-white/70 bg-white/[0.08]"
                                : "text-white/25 hover:text-white/60 hover:bg-white/[0.06]"}`}
                >
                  <Smile size={14} strokeWidth={1.5} />
                </button>
              }
            />
          </div>

          {/* Send */}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!commentText.trim() || isSubmitting}
            aria-label="Отправить"
            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                       transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed
                       text-white/50 hover:text-white hover:bg-white/[0.08]"
          >
            {isSubmitting
              ? <span className="w-3.5 h-3.5 rounded-full border border-white/30 border-t-transparent animate-spin" />
              : <Send size={13} strokeWidth={1.5} />
            }
          </button>
        </div>

        <p className="text-[11px] text-white/15 mt-1.5 text-right select-none">
          {commentText.length}/500 · Enter для отправки
        </p>
      </div>
    </div>
  );
}
