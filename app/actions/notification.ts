"use server";

import { getServerSession } from "next-auth";
import { authOptions }      from "@/auth";
import { prisma }           from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationItem = {
  id:        string;
  type:      "NEW_COMMENT" | "REPLY" | "REACTION" | "FOLLOW";
  isRead:    boolean;
  createdAt: Date;
  trackId:   string | null;
  commentId: string | null;
  issuer: {
    id:        string;
    name:      string | null;
    username:  string | null;
    avatarUrl: string | null;
    image:     string | null;
  };
  track: { title: string } | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getNotifications(): Promise<{
  notifications: NotificationItem[];
  unreadCount:   number;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { notifications: [], unreadCount: 0 };

  const rows = await prisma.notification.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take:    40,
    select: {
      id:        true,
      type:      true,
      isRead:    true,
      createdAt: true,
      trackId:   true,
      commentId: true,
      issuer: {
        select: { id: true, name: true, username: true, avatarUrl: true, image: true },
      },
      track: { select: { title: true } },
    },
  });

  const unreadCount = rows.filter((n) => !n.isRead).length;
  return { notifications: rows as NotificationItem[], unreadCount };
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data:  { isRead: true },
  });
}

export async function markOneNotificationRead(id: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  // Scoped by userId — prevents IDOR
  await prisma.notification.updateMany({
    where: { id, userId: session.user.id, isRead: false },
    data:  { isRead: true },
  });
}

export async function clearAllNotifications(): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  await prisma.notification.deleteMany({
    where: { userId: session.user.id },
  });
}
