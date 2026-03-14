// ─── DEBUG ONLY — remove before production ────────────────────────────────────
// GET /api/debug/seed-users  →  upserts 5 test accounts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SEED_USERS = [
  { username: "Meylan_Fan",      name: "Meylan Fan",       email: "meylan_fan@stillum.dev",      bio: "Electronic music enthusiast. Always hunting for new sounds." },
  { username: "Stillum_Artist",  name: "Stillum Artist",   email: "stillum_artist@stillum.dev",   bio: "Producer. Crafting sonic textures since 2019." },
  { username: "Techno_King",     name: "Techno King",      email: "techno_king@stillum.dev",      bio: "Peak-time techno. Berlin-inspired. No mercy." },
  { username: "Underground_Rex", name: "Underground Rex",  email: "underground_rex@stillum.dev",  bio: "Digging through the underground since the beginning." },
  { username: "Vibe_Curator",    name: "Vibe Curator",     email: "vibe_curator@stillum.dev",     bio: "Mood-driven selections. Lo-fi, ambient, soul." },
] as const;

export async function GET() {
  const results: { id: string; username: string | null }[] = [];

  for (const u of SEED_USERS) {
    const user = await prisma.user.upsert({
      where:  { email: u.email },
      create: { email: u.email, username: u.username, name: u.name, bio: u.bio },
      update: { username: u.username, name: u.name, bio: u.bio }, // refresh on re-run
    });
    results.push({ id: user.id, username: user.username });
  }

  return NextResponse.json({
    ok:      true,
    seeded:  results.length,
    users:   results,
    message: "Remove this route before production.",
  });
}
