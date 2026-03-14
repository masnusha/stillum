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

  // Upsert — safe if already following (no duplicate key error)
  await prisma.follow.upsert({
    where:  { followerId_followingId: { followerId: me, followingId: targetId } },
    create: { followerId: me, followingId: targetId },
    update: {}, // no-op if row already exists
  });

  revalidatePath(`/dashboard/profile/${targetId}`);
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
