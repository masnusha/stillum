import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import TrackList from "./_components/TrackList";
import UserMenu from "./_components/UserMenu";
import UploadDropzone from "./_components/UploadDropzone";

export const dynamic = "force-dynamic";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Fetch all tracks saved by the user (includes own uploads — auto-saved on upload)
  // ordered by most recently saved first
  const saved = await prisma.savedTrack.findMany({
    where:   { userId: session.user.id },
    orderBy: { savedAt: "desc" },
    select: {
      track: {
        select: {
          id:            true,
          ownerId:       true,
          title:         true,
          artist:        true,
          genre:         true,
          releaseDate:   true,
          recordLabel:   true,
          buyLink:       true,
          isExplicit:    true,
          isPublic:      true,
          allowComments: true,
          duration:      true,
          coverUrl:      true,
          audioUrl:      true,
          owner: { select: { id: true, username: true, name: true, avatarUrl: true, image: true } },
        },
      },
    },
  });

  const tracks = saved.map(({ track }) => {
    const { owner, ...rest } = track;
    return { ...rest, user: owner };
  });

  const count = tracks.length;
  const countLabel =
    count === 0 ? "Пусто" :
    count === 1 ? "1 трек" :
    count < 5   ? `${count} трека` :
                  `${count} треков`;

  return (
    <div className="flex flex-col h-full min-h-full">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-white tracking-tight">Медиатека</h1>
          <p className="text-[12px] text-white/25 mt-0.5">{countLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          <UploadDropzone variant="button" />
          <UserMenu />
        </div>
      </header>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      {tracks.length === 0 ? (

        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.05] flex items-center justify-center mb-1">
            <Heart size={20} strokeWidth={1} className="text-white/20" />
          </div>
          <p className="text-[15px] font-semibold text-white/50">Ваша медиатека пуста</p>
          <p className="text-[13px] text-white/25 max-w-xs leading-relaxed">
            Сохраняйте треки, нажимая на сердечко — они появятся здесь
          </p>
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
