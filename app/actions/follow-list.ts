"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FollowUser {
  id:              string;
  name:            string;
  avatarUrl:       string | null;
  isFollowedByMe:  boolean;
}

// ─── Shared helper: IDs the current user already follows ─────────────────────

async function myFollowingSet(myId: string): Promise<Set<string>> {
  const rows = await prisma.follow.findMany({
    where:  { followerId: myId },
    select: { followingId: true },
  });
  return new Set(rows.map((r) => r.followingId));
}

// ─── getFollowers ─────────────────────────────────────────────────────────────

export async function getFollowers(targetId: string): Promise<FollowUser[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const [rows, following] = await Promise.all([
    prisma.follow.findMany({
      where:   { followingId: targetId },
      orderBy: { createdAt: "desc" },
      take:    200,
      select:  {
        follower: {
          select: { id: true, username: true, name: true, avatarUrl: true, image: true },
        },
      },
    }),
    myFollowingSet(session.user.id),
  ]);

  return rows.map(({ follower: u }) => ({
    id:             u.id,
    name:           u.username ?? u.name ?? u.id.slice(0, 8),
    avatarUrl:      u.avatarUrl ?? u.image,
    isFollowedByMe: following.has(u.id),
  }));
}

// ─── getFollowing ─────────────────────────────────────────────────────────────

export async function getFollowing(targetId: string): Promise<FollowUser[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const [rows, following] = await Promise.all([
    prisma.follow.findMany({
      where:   { followerId: targetId },
      orderBy: { createdAt: "desc" },
      take:    200,
      select:  {
        following: {
          select: { id: true, username: true, name: true, avatarUrl: true, image: true },
        },
      },
    }),
    myFollowingSet(session.user.id),
  ]);

  return rows.map(({ following: u }) => ({
    id:             u.id,
    name:           u.username ?? u.name ?? u.id.slice(0, 8),
    avatarUrl:      u.avatarUrl ?? u.image,
    isFollowedByMe: following.has(u.id),
  }));
}
