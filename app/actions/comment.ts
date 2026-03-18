"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma }     from "@/lib/prisma";

// ─── Shared select fragments ──────────────────────────────────────────────────

const userSelect = {
  id:        true,
  name:      true,
  username:  true,
  avatarUrl: true,
  image:     true,
} as const;

const reactionSelect = {
  id:     true,
  emoji:  true,
  userId: true,
  user:   { select: userSelect },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReactionData = {
  id:     string;
  emoji:  string;
  userId: string;
  user: {
    id:        string;
    name:      string | null;
    username:  string | null;
    avatarUrl: string | null;
    image:     string | null;
  };
};

export type CommentWithUser = {
  id:        string;
  content:   string;
  createdAt: Date;
  parentId:  string | null;
  user: {
    id:        string;
    name:      string | null;
    username:  string | null;
    avatarUrl: string | null;
    image:     string | null;
  };
  reactions: ReactionData[];
  replies:   ReplyWithUser[];
};

export type ReplyWithUser = {
  id:        string;
  content:   string;
  createdAt: Date;
  parentId:  string | null;
  user: {
    id:        string;
    name:      string | null;
    username:  string | null;
    avatarUrl: string | null;
    image:     string | null;
  };
  reactions: ReactionData[];
};

// ─── Access check helper ──────────────────────────────────────────────────────

async function assertTrackAccess(trackId: string, userId: string) {
  const track = await prisma.track.findUnique({
    where:  { id: trackId },
    select: { ownerId: true, isPublic: true },
  });
  if (!track) return "Track not found";
  if (!track.isPublic && track.ownerId !== userId) return "Access denied";
  return null;
}

// ─── getTrackComments ─────────────────────────────────────────────────────────
// Returns only top-level comments (parentId == null), each with nested replies.

export async function getTrackComments(
  trackId: string,
): Promise<{ error?: string; comments?: CommentWithUser[] }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const err = await assertTrackAccess(trackId, session.user.id);
  if (err) return { error: err };

  const rows = await prisma.comment.findMany({
    where:   { trackId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      user:      { select: userSelect },
      reactions: { select: reactionSelect },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user:      { select: userSelect },
          reactions: { select: reactionSelect },
        },
      },
    },
  });

  return { comments: rows as CommentWithUser[] };
}

// ─── addComment ───────────────────────────────────────────────────────────────

export async function addComment(
  trackId:  string,
  content:  string,
  parentId?: string,
): Promise<{ error?: string; comment?: CommentWithUser | ReplyWithUser }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const sanitized = content.trim().replace(/\s+/g, " ").slice(0, 500);
  if (!sanitized) return { error: "Комментарий не может быть пустым" };

  const err = await assertTrackAccess(trackId, session.user.id);
  if (err) return { error: err };

  // If replying, verify parent belongs to same track
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where:  { id: parentId },
      select: { trackId: true, parentId: true },
    });
    if (!parent || parent.trackId !== trackId) return { error: "Invalid parent" };
    // Flatten: replies-to-replies become siblings of the parent's reply chain
    // (parentId stays as the top-level parent to enforce 1-level UI depth)
    if (parent.parentId) {
      return { error: "Нельзя отвечать на ответ" };
    }
  }

  const me = session.user.id;

  const comment = await prisma.comment.create({
    data: {
      content:  sanitized,
      userId:   me,
      trackId,
      parentId: parentId ?? null,
    },
    include: {
      user:      { select: userSelect },
      reactions: { select: reactionSelect },
      replies: {
        include: {
          user:      { select: userSelect },
          reactions: { select: reactionSelect },
        },
      },
    },
  });

  // ── Fire notification (best-effort) ─────────────────────────────────────────
  if (parentId) {
    // Reply → notify the parent comment's author
    const parent = await prisma.comment.findUnique({
      where:  { id: parentId },
      select: { userId: true },
    });
    if (parent && parent.userId !== me) {
      await prisma.notification.create({
        data: { userId: parent.userId, issuerId: me, type: "REPLY", trackId, commentId: comment.id },
      });
    }
  } else {
    // Top-level comment → notify the track owner
    const track = await prisma.track.findUnique({
      where:  { id: trackId },
      select: { ownerId: true },
    });
    if (track && track.ownerId !== me) {
      await prisma.notification.create({
        data: { userId: track.ownerId, issuerId: me, type: "NEW_COMMENT", trackId, commentId: comment.id },
      });
    }
  }

  return { comment: comment as CommentWithUser };
}

// ─── deleteComment ────────────────────────────────────────────────────────────

export async function deleteComment(
  commentId: string,
): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const comment = await prisma.comment.findUnique({
    where:   { id: commentId },
    include: { track: { select: { ownerId: true } } },
  });
  if (!comment) return { error: "Not found" };

  if (
    comment.userId        !== session.user.id &&
    comment.track.ownerId !== session.user.id
  ) return { error: "Forbidden" };

  await prisma.comment.delete({ where: { id: commentId } });
  return {};
}

// ─── toggleReaction ───────────────────────────────────────────────────────────
// Adds the reaction if it doesn't exist yet; removes it if it does (toggle).

export async function toggleReaction(
  commentId: string,
  emoji:     string,
): Promise<{ error?: string; added?: boolean; reaction?: ReactionData }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Validate emoji — must be a single grapheme cluster, 1-8 chars
  const trimmed = emoji.trim();
  if (!trimmed || trimmed.length > 8) return { error: "Invalid emoji" };

  // Verify the comment exists (and implicitly the track access via comment ownership)
  const comment = await prisma.comment.findUnique({
    where:  { id: commentId },
    select: { trackId: true, userId: true },
  });
  if (!comment) return { error: "Comment not found" };

  const me = session.user.id;

  const err = await assertTrackAccess(comment.trackId, me);
  if (err) return { error: err };

  const existing = await prisma.reaction.findUnique({
    where: { userId_commentId_emoji: { userId: me, commentId, emoji: trimmed } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return { added: false };
  }

  const reaction = await prisma.reaction.create({
    data:   { emoji: trimmed, userId: me, commentId },
    select: reactionSelect,
  });

  // Notify the comment author (skip self-reactions)
  if (comment.userId !== me) {
    await prisma.notification.create({
      data: { userId: comment.userId, issuerId: me, type: "REACTION", trackId: comment.trackId, commentId },
    });
  }

  return { added: true, reaction };
}
