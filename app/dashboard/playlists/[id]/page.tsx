import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import UserMenu from "@/app/dashboard/_components/UserMenu";
import PlaylistDetailClient from "./_components/PlaylistDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlaylistDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const playlist = await prisma.playlist.findUnique({
    where:  { id },
    select: {
      id:          true,
      name:        true,
      description: true,
      coverUrl:    true,
      isPublic:    true,
      ownerId:     true,
      createdAt:   true,
      owner: { select: { username: true, name: true } },
      playlistTracks: {
        orderBy: { position: "asc" },
        select: {
          id:       true,
          position: true,
          addedAt:  true,
          track: {
            select: {
              id:          true,
              ownerId:     true,
              title:       true,
              artist:      true,
              duration:    true,
              coverUrl:    true,
              audioUrl:    true,
              isPublic:      true,
              allowComments: true,
              isExplicit:  true,
              genre:       true,
              releaseDate: true,
              recordLabel: true,
              buyLink:     true,
              owner: { select: { id: true, username: true, name: true, avatarUrl: true, image: true } },
            },
          },
        },
      },
    },
  });

  if (!playlist) notFound();
  // Private playlists: only owner can view
  if (!playlist.isPublic && playlist.ownerId !== session.user.id) notFound();

  const isOwner = playlist.ownerId === session.user.id;

  const ownerName = playlist.owner.username ?? playlist.owner.name ?? "Unknown";

  // Rename owner → user in each track so TrackRowData is satisfied
  const playlistWithUser = {
    ...playlist,
    ownerName,
    playlistTracks: playlist.playlistTracks.map((pt) => {
      const { owner, ...trackRest } = pt.track;
      return { ...pt, track: { ...trackRest, user: owner } };
    }),
  };

  return (
    <div className="flex flex-col h-full min-h-full">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/[0.03] shrink-0">
        <Link
          href="/dashboard/playlists"
          className="flex items-center gap-1.5 text-white/35 hover:text-white/80 transition-colors group"
        >
          <ChevronLeft
            size={16}
            strokeWidth={1.5}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span className="text-[13px] font-medium">Плейлисты</span>
        </Link>
        <UserMenu />
      </header>

      <PlaylistDetailClient
        playlist={playlistWithUser}
        isOwner={isOwner}
      />
    </div>
  );
}
