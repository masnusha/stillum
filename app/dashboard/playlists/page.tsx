import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import UserMenu from "@/app/dashboard/_components/UserMenu";
import PlaylistsClient from "./_components/PlaylistsClient";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const playlists = await prisma.playlist.findMany({
    where:   { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id:          true,
      name:        true,
      description: true,
      coverUrl:    true,
      isPublic:    true,
      createdAt:   true,
      _count: { select: { playlistTracks: true } },
    },
  });

  return (
    <div className="flex flex-col h-full min-h-full">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <h1 className="text-[15px] font-semibold text-white tracking-tight">Плейлисты</h1>
        <UserMenu />
      </header>

      <PlaylistsClient playlists={playlists} />
    </div>
  );
}
