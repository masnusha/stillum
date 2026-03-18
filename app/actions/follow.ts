"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── followUser ───────────────────────────────────────────────────────────────

export async function followUser(targetId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const me = session.user.id;
  if (me === targetId) return; // cannot follow yourself

  // Check if already following — skip if row exists (upsert handles DB, but we
  // use the result to decide whether to create a notification)
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: me, followingId: targetId } },
  });

  if (!existing) {
    // New follow — create Follow row, then handle FOLLOW notification
    await prisma.follow.create({ data: { followerId: me, followingId: targetId } });

    // Anti-spam: reuse existing FOLLOW notification (re-follow → mark unread again)
    const existingNotif = await prisma.notification.findFirst({
      where: { userId: targetId, issuerId: me, type: "FOLLOW" },
      select: { id: true },
    });

    if (existingNotif) {
      await prisma.notification.update({
        where: { id: existingNotif.id },
        data:  { isRead: false, createdAt: new Date() },
      });
    } else {
      await prisma.notification.create({
        data: { userId: targetId, issuerId: me, type: "FOLLOW", isRead: false },
      });
    }
  }

  revalidatePath(`/dashboard/profile/${targetId}`);
  revalidatePath("/dashboard");
}

// ─── unfollowUser ─────────────────────────────────────────────────────────────

export async function unfollowUser(targetId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const me = session.user.id;

  // deleteMany — silent no-op if row doesn't exist (avoids P2025)
  await prisma.follow.deleteMany({
    where: { followerId: me, followingId: targetId },
  });

  revalidatePath(`/dashboard/profile/${targetId}`);
}
