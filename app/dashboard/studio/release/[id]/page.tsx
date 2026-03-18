export const dynamic = "force-dynamic";

import { getServerSession }  from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions }        from "@/auth";
import { prisma }             from "@/lib/prisma";
import UserMenu               from "../../../_components/UserMenu";
import ReleaseDetailClient    from "./_components/ReleaseDetailClient";

export default async function ReleasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id)             redirect("/login");
  if (session.user.role !== "ARTIST") redirect("/dashboard");

  const raw = await prisma.album.findUnique({
    where:   { id },
    include: { tracks: { orderBy: { order: "asc" } } },
  });

  if (!raw) notFound();
  if (raw.artistId !== session.user.id) redirect("/dashboard/studio");

  // Serialize: strip non-serializable Date objects before passing to client
  const album = {
    id:              raw.id,
    title:           raw.title,
    type:            raw.type,
    coverImage:      raw.coverImage,
    releaseDate:     raw.releaseDate,
    featuredArtists: raw.featuredArtists,
    genre:           raw.genre,
    language:        raw.language,
    label:           raw.label,
    tracks: raw.tracks.map(t => ({
      id:              t.id,
      title:           t.title,
      featuredArtists: t.featuredArtists,
      duration:        t.duration,
      audioUrl:        t.audioUrl,
      artist:          t.artist,
    })),
    totalDuration: raw.tracks.reduce((sum, t) => sum + t.duration, 0),
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <span className="text-[15px] font-semibold text-white tracking-tight">Студия</span>
        <UserMenu />
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 md:px-12 py-10 max-w-6xl w-full mx-auto">
        <ReleaseDetailClient album={album} />
      </div>

    </div>
  );
}
