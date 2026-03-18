"use server";

import { revalidatePath }   from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

type ToggleResult = { saved: boolean } | { error: string };

/**
 * Toggle a track in the current user's library.
 * Owners cannot remove their own tracks (ACCESS_RULES.md §1 — zero-trust library).
 */
export async function toggleSavedTrack(trackId: string): Promise<ToggleResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = session.user.id;

  // Verify track exists + check ownership.
  const track = await prisma.track.findUnique({
    where:  { id: trackId },
    select: { id: true, ownerId: true, isPublic: true },
  });

  if (!track) return { error: "Track not found." };

  // Access gate: must be owner or track is public.
  const isOwner = track.ownerId === userId;
  if (!track.isPublic && !isOwner) return { error: "Forbidden." };

  // Owner's tracks are permanently in their library.
  if (isOwner) return { saved: true };

  const existing = await prisma.savedTrack.findUnique({
    where: { userId_trackId: { userId, trackId } },
  });

  if (existing) {
    await prisma.savedTrack.delete({ where: { userId_trackId: { userId, trackId } } });
    revalidatePath("/dashboard");
    return { saved: false };
  } else {
    await prisma.savedTrack.create({ data: { userId, trackId } });
    revalidatePath("/dashboard");
    return { saved: true };
  }
}

/**
 * Check if the current user has a track saved (or is the owner).
 */
export async function isTrackSaved(trackId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;

  const userId = session.user.id;

  const row = await prisma.savedTrack.findUnique({
    where: { userId_trackId: { userId, trackId } },
    select: { id: true },
  });

  return !!row;
}
