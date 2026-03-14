"use server";

import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchUser {
  id:        string;
  username:  string | null;
  name:      string | null;
  avatarUrl: string | null;
  image:     string | null;
}

export interface SearchTrack {
  id:          string;
  title:       string;
  artist:      string;
  genre:       string | null;
  releaseDate: string | null;
  recordLabel: string | null;
  buyLink:     string | null;
  isExplicit:  boolean;
  isPublic:    boolean;
  duration:    number;
  coverUrl:    string | null;
  audioUrl:    string;
}

export interface SearchResults {
  users:  SearchUser[];
  tracks: SearchTrack[];
}

// ─── searchContent ────────────────────────────────────────────────────────────

export async function searchContent(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return { users: [], tracks: [] };

  const [users, tracks] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { name:     { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: {
        id:        true,
        username:  true,
        name:      true,
        avatarUrl: true,
        image:     true,
      },
    }),
    prisma.track.findMany({
      where: {
        isPublic: true,
        OR: [
          { title:  { contains: q, mode: "insensitive" } },
          { artist: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id:          true,
        title:       true,
        artist:      true,
        genre:       true,
        releaseDate: true,
        recordLabel: true,
        buyLink:     true,
        isExplicit:  true,
        isPublic:    true,
        duration:    true,
        coverUrl:    true,
        audioUrl:    true,
      },
    }),
  ]);

  return { users, tracks };
}
