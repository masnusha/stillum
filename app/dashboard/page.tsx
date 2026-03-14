import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import UploadDropzone from "./_components/UploadDropzone";
import TrackList from "./_components/TrackList";
import UserMenu from "./_components/UserMenu";

export const dynamic = "force-dynamic";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { user } = session;

  const tracks = await prisma.track.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      artist: true,
      genre: true,
      releaseDate: true,
      recordLabel: true,
      buyLink: true,
      isExplicit: true,
      isPublic:   true,
      duration: true,
      coverUrl: true,
      audioUrl: true,
    },
  });

  const trackLabel = tracks.length === 1 ? "1 track" : `${tracks.length} tracks`;

  return (
    <div className="flex flex-col h-full min-h-full">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-white tracking-tight">
            Your Library
          </h1>
          <p className="text-[12px] text-white/25 mt-0.5">{trackLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          <UploadDropzone variant="button" />
          <UserMenu />
        </div>
      </header>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      {tracks.length === 0 ? (

        /* Empty state */
        <div className="flex-1 flex items-center justify-center px-8">
          <UploadDropzone variant="zone" />
        </div>

      ) : (

        /* Track list */
        <div className="flex-1 flex flex-col min-h-0">
          <TrackList tracks={tracks} />
        </div>
      )}
    </div>
  );
}
