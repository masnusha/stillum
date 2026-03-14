"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HistoryType = "USER" | "TRACK";

export interface HistoryItem {
  historyId: string;
  type:      HistoryType;
  id:        string;       // userId or trackId
  name:      string;       // displayName or "Artist — Title"
  subtitle:  string | null;
  avatarUrl: string | null;
  href:      string;
}

// ─── saveToHistory ────────────────────────────────────────────────────────────

export async function saveToHistory(
  targetId: string,
  type:     HistoryType,
): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  await prisma.searchHistory.upsert({
    where:  { userId_targetId_type: { userId: session.user.id, targetId, type } },
    create: { userId: session.user.id, targetId, type },
    update: { createdAt: new Date() }, // bubble to top on re-search
  });
}

// ─── getSearchHistory ─────────────────────────────────────────────────────────

export async function getSearchHistory(): Promise<HistoryItem[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const records = await prisma.searchHistory.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take:    12,
  });

  if (records.length === 0) return [];

  const userIds  = records.filter((r) => r.type === "USER").map((r) => r.targetId);
  const trackIds = records.filter((r) => r.type === "TRACK").map((r) => r.targetId);

  const [users, tracks] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where:  { id: { in: userIds } },
          select: { id: true, username: true, name: true, avatarUrl: true, image: true },
        })
      : [],
    trackIds.length > 0
      ? prisma.track.findMany({
          where:  { id: { in: trackIds }, isPublic: true },
          select: { id: true, title: true, artist: true, coverUrl: true },
        })
      : [],
  ]);

  const userMap  = new Map(users.map((u) => [u.id, u]));
  const trackMap = new Map(tracks.map((t) => [t.id, t]));

  const items: HistoryItem[] = [];

  for (const r of records) {
    if (r.type === "USER") {
      const u = userMap.get(r.targetId);
      if (!u) continue;
      items.push({
        historyId: r.id,
        type:      "USER",
        id:        u.id,
        name:      u.username ?? u.name ?? u.id.slice(0, 8),
        subtitle:  null,
        avatarUrl: u.avatarUrl ?? u.image,
        href:      `/dashboard/profile/${u.id}`,
      });
    } else {
      const t = trackMap.get(r.targetId);
      if (!t) continue;
      items.push({
        historyId: r.id,
        type:      "TRACK",
        id:        t.id,
        name:      t.title,
        subtitle:  t.artist,
        avatarUrl: t.coverUrl,
        href:      "#", // no dedicated track page yet
      });
    }
  }

  return items;
}

// ─── deleteFromHistory ────────────────────────────────────────────────────────

export async function deleteFromHistory(historyId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  // Scope to current user to prevent IDOR
  await prisma.searchHistory.deleteMany({
    where: { id: historyId, userId: session.user.id },
  });
}
