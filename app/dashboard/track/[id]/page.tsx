import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { ChevronLeft, Music } from "lucide-react";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTrackSaved } from "@/app/actions/library";
import UserMenu from "@/app/dashboard/_components/UserMenu";
import TrackPageActions from "./_components/TrackPageActions";
import TrackPageRow from "./_components/TrackPageRow";
import TrackCommentsSection from "@/components/TrackCommentsSection";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}.${m}.${date.getFullYear()}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const track = await prisma.track.findUnique({
    where:  { id },
    select: {
      id:            true,
      title:         true,
      artist:        true,
      coverUrl:      true,
      audioUrl:      true,
      duration:      true,
      genre:         true,
      releaseDate:   true,
      recordLabel:   true,
      buyLink:       true,
      isExplicit:    true,
      isPublic:      true,
      allowComments: true,
      createdAt:     true,
      ownerId:       true,
      owner: {
        select: { id: true, name: true, username: true, avatarUrl: true, image: true },
      },
    },
  });

  if (!track) notFound();

  // Access control — public OR owner (ACCESS_RULES.md §1)

  const isOwner = track.ownerId === session.user.id;
  if (!track.isPublic && !isOwner) notFound();

  const initialIsLiked = await isTrackSaved(track.id);

  const isLossless = /\.(wav|flac)$/i.test(track.audioUrl);
  const year       = track.releaseDate?.slice(0, 4) ?? track.createdAt.getFullYear().toString();
  const ownerName  = track.owner.username ?? track.owner.name ?? "Артист";

  return (
    <div className="flex flex-col h-full min-h-full">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <Link
          href="/dashboard/home"
          className="flex items-center gap-1 text-white/35 hover:text-white/75 transition-colors group"
        >
          <ChevronLeft
            size={16}
            strokeWidth={1.5}
            className="group-hover:-translate-x-0.5 transition-transform duration-150"
          />
          <span className="text-[13px]">Назад</span>
        </Link>
        <UserMenu />
      </header>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 pt-10 pb-20">

          {/* ── Hero ─────────────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row gap-8 md:gap-10 items-end pb-10 border-b border-white/[0.04]">

            {/* Cover */}
            <div
              className="w-52 h-52 md:w-60 md:h-60 shrink-0 rounded-2xl overflow-hidden
                         bg-white/[0.04] border border-white/[0.05]
                         flex items-center justify-center"
              style={{ boxShadow: "0 32px 64px rgba(0,0,0,0.6)" }}
            >
              {track.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <Music size={48} strokeWidth={0.75} className="text-white/10" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">
                Сингл
              </p>

              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1]">
                {track.title}
                {track.isExplicit && (
                  <span className="ml-3 text-[11px] font-semibold bg-white/[0.07] text-white/30 px-1.5 py-0.5 rounded uppercase tracking-wide align-middle">
                    E
                  </span>
                )}
              </h1>

              <Link
                href={`/dashboard/profile/${track.owner.id}`}
                className="inline-block text-xl text-white/55 hover:text-white transition-colors mt-3"
              >
                {ownerName}
              </Link>

              {/* Metadata row */}
              <div className="flex items-center gap-2 mt-4 text-[13px] text-white/30 flex-wrap">
                {track.genre && (
                  <>
                    <span>{track.genre}</span>
                    <span className="text-white/[0.12]">·</span>
                  </>
                )}
                <span>{year}</span>
                {track.recordLabel && (
                  <>
                    <span className="text-white/[0.12]">·</span>
                    <span>{track.recordLabel}</span>
                  </>
                )}
                {isLossless && (
                  <>
                    <span className="text-white/[0.12]">·</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/45 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded-md">
                      {/* waveform glyph */}
                      <svg viewBox="0 0 14 9" fill="none" className="w-3.5 h-2.5" aria-hidden>
                        <path
                          d="M0 4.5h2L4 1l2 7 2-8 1.5 6.5L11 3l1.5 3H14"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Lossless
                    </span>
                  </>
                )}
              </div>

              {/* Play + actions */}
              <TrackPageActions
                currentUserId={session.user.id!}
                initialIsLiked={initialIsLiked}
                track={{
                  id:            track.id,
                  title:         track.title,
                  artist:        track.artist,
                  audioUrl:      track.audioUrl,
                  coverUrl:      track.coverUrl ?? null,
                  duration:      track.duration,
                  isExplicit:    track.isExplicit,
                  isPublic:      track.isPublic,
                  allowComments: track.allowComments,
                  ownerId:       track.ownerId,
                  user:          track.owner,
                  genre:         track.genre ?? null,
                  releaseDate:   track.releaseDate ?? null,
                  recordLabel:   track.recordLabel ?? null,
                  buyLink:       track.buyLink ?? null,
                }}
              />
            </div>
          </div>

          {/* ── Track row ─────────────────────────────────────────────────────── */}
          <div className="mt-6">
            {/* Column headers */}
            <div className="flex items-center gap-4 px-3 pb-2 border-b border-white/[0.04] mb-1">
              <span className="w-5 shrink-0" />
              <span className="w-10 shrink-0" />
              <span className="flex-1 text-[11px] font-medium uppercase tracking-widest text-white/20">
                Название
              </span>
              <span className="text-[11px] font-medium uppercase tracking-widest text-white/20 tabular-nums">
                Время
              </span>
            </div>

            <TrackPageRow
              track={{
                id:            track.id,
                title:         track.title,
                artist:        track.artist,
                audioUrl:      track.audioUrl,
                coverUrl:      track.coverUrl ?? null,
                duration:      track.duration,
                isExplicit:    track.isExplicit,
                isPublic:      track.isPublic,
                allowComments: track.allowComments,
                ownerId:       track.ownerId,
                user:          track.owner,
                genre:         track.genre ?? null,
                releaseDate:   track.releaseDate ?? null,
                recordLabel:   track.recordLabel ?? null,
                buyLink:       track.buyLink ?? null,
              }}
            />
          </div>

          {/* ── Footer ────────────────────────────────────────────────────────── */}
          <div className="mt-14 pt-6 border-t border-white/[0.04] space-y-1.5">
            <p className="text-[12px] text-white/25">
              Добавлено {formatDate(track.createdAt)}
            </p>
            <p className="text-[12px] text-white/25">
              ℗ {year} {track.recordLabel ?? ownerName}
            </p>
          </div>

          {/* ── Comments ──────────────────────────────────────────────────────── */}
          <div className="mt-16 pt-8 border-t border-white/[0.06]">
            <h2 className="text-[17px] font-bold text-white mb-6">Комментарии</h2>
            <TrackCommentsSection
              trackId={track.id}
              trackOwnerId={track.ownerId}
              currentUserId={session.user.id!}
              allowComments={track.allowComments}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
