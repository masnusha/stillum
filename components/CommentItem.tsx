"use client";

import { useState } from "react";
import Link from "next/link";
import { SmilePlus, Trash2, CornerDownRight } from "lucide-react";
import { toggleReaction, deleteComment, type CommentWithUser, type ReplyWithUser, type ReactionData } from "@/app/actions/comment";
import EmojiGrid from "@/components/EmojiGrid";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyComment = CommentWithUser | ReplyWithUser;

// username (without @) → userId — used to make @mentions navigable
type KnownUsers = Map<string, string>;

interface Props {
  comment:      AnyComment;
  userId:       string;
  isOwner:      boolean;
  trackOwnerId: string;
  isReply?:     boolean;
  knownUsers:   KnownUsers;
  onDeleted:    (id: string) => void;
  onReply?:     (comment: AnyComment) => void;
  onReactionChange: (commentId: string, emoji: string, added: boolean, reaction?: ReactionData) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)    return "только что";
  if (diff < 3600)  return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  return new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// Splits text into plain segments and @mention segments, links known mentions.
function renderContent(text: string, knownUsers: KnownUsers) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const handle = part.slice(1);
      const uid = knownUsers.get(handle.toLowerCase());
      return uid ? (
        <Link
          key={i}
          href={`/dashboard/profile/${uid}`}
          className="text-white/70 hover:text-white font-medium transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      ) : (
        <span key={i} className="text-white/55 font-medium">{part}</span>
      );
    }
    return part;
  });
}

type GroupedReaction = {
  emoji:  string;
  count:  number;
  myId?:  string;
  users:  AnyComment["reactions"][number]["user"][];
};

function groupReactions(
  reactions: AnyComment["reactions"],
  userId: string,
): GroupedReaction[] {
  const map = new Map<string, GroupedReaction>();
  for (const r of reactions) {
    const g = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, users: [] };
    g.count += 1;
    g.users.push(r.user);
    if (r.userId === userId) g.myId = r.id;
    map.set(r.emoji, g);
  }
  return [...map.values()];
}

// ─── CommentItem ──────────────────────────────────────────────────────────────

export default function CommentItem({
  comment, userId, isOwner, trackOwnerId, isReply = false,
  knownUsers, onDeleted, onReply, onReactionChange,
}: Props) {
  const [showPicker,   setShowPicker]   = useState(false);
  const [loadingEmoji, setLoadingEmoji] = useState<string | null>(null);

  const grouped = groupReactions(comment.reactions, userId);
  const canDelete = comment.user.id === userId || isOwner;
  const authorReaction = comment.reactions.find((r) => r.userId === trackOwnerId);

  const handleToggleReaction = async (emoji: string) => {
    if (loadingEmoji) return;
    setLoadingEmoji(emoji);
    const res = await toggleReaction(comment.id, emoji);
    if (!res.error) {
      onReactionChange(comment.id, emoji, res.added!, res.reaction);
    }
    setLoadingEmoji(null);
  };

  const handleDelete = async () => {
    const res = await deleteComment(comment.id);
    if (!res.error) onDeleted(comment.id);
  };

  const displayName = comment.user.username ?? comment.user.name ?? "Пользователь";
  const avatar      = comment.user.avatarUrl ?? comment.user.image;

  return (
    <div className={`flex gap-2.5 group/item ${isReply ? "" : ""}`}>
      {/* Avatar */}
      <Link href={`/dashboard/profile/${comment.user.id}`} className="shrink-0 mt-0.5">
        <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.05]
                        overflow-hidden flex items-center justify-center">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-medium text-white/40">
              {displayName[0]?.toUpperCase()}
            </span>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <Link
            href={`/dashboard/profile/${comment.user.id}`}
            className="text-[12px] font-medium text-white/75 hover:text-white truncate transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {displayName}
          </Link>
          <span className="text-[10px] text-white/25 shrink-0">{relativeTime(comment.createdAt)}</span>
        </div>

        {/* Text — @mentions are linked */}
        <p className="text-[12px] text-white/50 leading-relaxed break-words">
          {renderContent(comment.content, knownUsers)}
        </p>

        {/* "Liked by author" badge */}
        {authorReaction && (
          <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5
                          bg-red-500/10 border border-red-500/20 rounded-full w-fit">
            <span className="text-[11px] leading-none">{authorReaction.emoji}</span>
            <span className="text-[10px] font-medium text-red-400 uppercase tracking-wide">
              Понравилось автору
            </span>
          </div>
        )}

        {/* Reactions row */}
        {grouped.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {grouped.map((g) => (
              <div key={g.emoji} className="relative group/reaction inline-flex">
                <button
                  type="button"
                  disabled={!!loadingEmoji}
                  onClick={() => handleToggleReaction(g.emoji)}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px]
                              transition-all duration-150 disabled:opacity-50
                              ${g.myId
                                ? "bg-white/[0.06] border border-white/20 text-white/80"
                                : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.08]"
                              }`}
                >
                  <span>{g.emoji}</span>
                  <span className="text-[10px] tabular-nums">{g.count}</span>
                </button>

                {/* Who reacted — hover popover */}
                <div className="absolute bottom-full left-0 z-50 pb-1.5
                                opacity-0 pointer-events-none
                                group-hover/reaction:opacity-100 group-hover/reaction:pointer-events-auto
                                transition-opacity duration-150">
                  <div className="bg-[#0D1525] border border-white/[0.08] rounded-xl
                                  shadow-xl p-1.5 min-w-[130px]">
                    {g.users.map((u) => {
                      const name = u.username ?? u.name ?? "?";
                      const ava  = u.avatarUrl ?? u.image;
                      return (
                        <div key={u.id}
                             onClick={(e) => e.stopPropagation()}
                             className="flex items-center gap-2 px-2 py-1
                                        rounded-lg hover:bg-white/[0.06] transition-colors">
                          <div className="w-5 h-5 rounded-full bg-white/[0.06] overflow-hidden
                                          shrink-0 flex items-center justify-center">
                            {ava
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={ava} alt="" className="w-full h-full object-cover" />
                              : <span className="text-[8px] text-white/40">{name[0]?.toUpperCase()}</span>
                            }
                          </div>
                          <span className="text-[11px] text-white/70 truncate max-w-[90px]">
                            {name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-3 mt-2">
          {/* Reply */}
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(comment)}
              className="text-[10px] font-medium text-white/30 hover:text-white/70
                         uppercase tracking-wider transition-colors"
            >
              Ответить
            </button>
          )}

          {/* Emoji picker */}
          <EmojiGrid
            open={showPicker}
            onOpenChange={setShowPicker}
            onSelect={handleToggleReaction}
            trigger={
              <button
                type="button"
                className={`flex items-center justify-center transition-all duration-150
                  ${showPicker ? "text-white/70" : "text-white/30 hover:text-white/70"}`}
              >
                <SmilePlus size={13} strokeWidth={1.5} />
              </button>
            }
          />

          {/* Delete */}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="opacity-0 group-hover/item:opacity-100 flex items-center justify-center
                         w-5 h-5 rounded-md text-white/20 hover:text-red-400/70
                         hover:bg-red-500/[0.08] transition-all duration-150"
            >
              <Trash2 size={11} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CommentThread ─────────────────────────────────────────────────────────────
// Top-level comment + its flat list of replies.

interface ThreadProps {
  comment:         CommentWithUser;
  userId:          string;
  isOwner:         boolean;
  trackOwnerId:    string;
  onDeleted:       (id: string) => void;
  onReply:         (comment: AnyComment) => void;
  onReactionChange:(commentId: string, emoji: string, added: boolean, reaction?: ReactionData) => void;
}

export function CommentThread({
  comment, userId, isOwner, trackOwnerId, onDeleted, onReply, onReactionChange,
}: ThreadProps) {
  // Build username→userId map for the whole thread so @mentions can be linked
  const knownUsers: KnownUsers = new Map();
  const addUser = (u: AnyComment["user"]) => {
    if (u.username) knownUsers.set(u.username.toLowerCase(), u.id);
    if (u.name)     knownUsers.set(u.name.toLowerCase(),     u.id);
  };
  addUser(comment.user);
  if ("replies" in comment) comment.replies.forEach((r) => addUser(r.user));

  return (
    <div>
      <CommentItem
        comment={comment}
        userId={userId}
        isOwner={isOwner}
        trackOwnerId={trackOwnerId}
        knownUsers={knownUsers}
        onDeleted={onDeleted}
        onReply={onReply}
        onReactionChange={onReactionChange}
      />

      {/* Replies — one level deep, indented with left border */}
      {("replies" in comment) && comment.replies.length > 0 && (
        <div className="ml-9 border-l border-white/[0.07] pl-4 mt-3 flex flex-col gap-3.5">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              userId={userId}
              isOwner={isOwner}
              trackOwnerId={trackOwnerId}
              isReply
              knownUsers={knownUsers}
              onDeleted={onDeleted}
              onReply={onReply}
              onReactionChange={onReactionChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Re-export CornerDownRight for use in the sidebar reply banner
export { CornerDownRight };
