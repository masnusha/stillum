import { getServerSession } from "next-auth";
import { redirect }         from "next/navigation";
import Link                  from "next/link";
import { ListMusic }         from "lucide-react";
import { authOptions }       from "@/auth";
import { prisma }            from "@/lib/prisma";
import UserMenu              from "@/app/dashboard/_components/UserMenu";
import NewTracksGrid         from "./_components/NewTracksGrid";

export const dynamic = "force-dynamic";

// ─── Track select shape ───────────────────────────────────────────────────────

const TRACK_SELECT = {
  id:          true,
  ownerId:     true,
  title:       true,
  artist:      true,
  coverUrl:    true,
  audioUrl:    true,
  duration:    true,
  isExplicit:  true,
  isPublic:      true,
  allowComments: true,
  genre:       true,
  releaseDate: true,
  recordLabel: true,
  buyLink:     true,
  owner: { select: { id: true, username: true, name: true, avatarUrl: true, image: true } },
} as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Parallel data fetching
  const [heroPlaylists, latestTracks, morePlaylists] = await Promise.all([

    // 4 newest public playlists — hero banners
    prisma.playlist.findMany({
      where:   { isPublic: true },
      orderBy: { createdAt: "desc" },
      take:    4,
      select: {
        id:          true,
        name:        true,
        description: true,
        coverUrl:    true,
        owner:       { select: { username: true, name: true } },
        _count:      { select: { playlistTracks: true } },
      },
    }),

    // 12 newest public tracks
    prisma.track.findMany({
      where:   { isPublic: true },
      orderBy: { createdAt: "desc" },
      take:    12,
      select:  TRACK_SELECT,
    }),

    // 10 more public playlists, skipping the first 4
    prisma.playlist.findMany({
      where:   { isPublic: true },
      orderBy: { createdAt: "desc" },
      skip:    4,
      take:    10,
      select: {
        id:          true,
        name:        true,
        coverUrl:    true,
        owner:       { select: { username: true, name: true } },
        _count:      { select: { playlistTracks: true } },
      },
    }),

  ]);

  return (
    <div className="flex flex-col h-full min-h-full">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <h1 className="text-[15px] font-semibold text-white tracking-tight">Новое</h1>
        <UserMenu />
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="pt-8 pb-24 max-w-7xl mx-auto px-6">

        {/* ── Hero banners ────────────────────────────────────────────────────── */}
        {heroPlaylists.length > 0 && (
          <div className="flex gap-5 overflow-x-auto snap-x pb-4 scrollbar-hide -mx-6 px-6">
            {heroPlaylists.map((pl) => {
              const owner = pl.owner.username ?? pl.owner.name ?? "Stillum";
              return (
                <Link
                  key={pl.id}
                  href={`/dashboard/playlists/${pl.id}`}
                  className="w-[280px] sm:w-[400px] lg:w-[500px] shrink-0 aspect-[2/1] sm:aspect-[21/9] relative rounded-2xl overflow-hidden snap-start group cursor-pointer"
                >
                  {/* Cover — z-0, fills card */}
                  {pl.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pl.coverUrl}
                      alt={pl.name}
                      className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/[0.08] to-white/[0.02]" />
                  )}

                  {/* Gradient overlay — z-10 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent z-10" />

                  {/* Content — z-20, full height flex col justify-end */}
                  <div className="relative z-20 flex flex-col justify-end h-full p-6 sm:p-8">
                    <span className="text-xs font-bold tracking-[0.2em] text-white/60 uppercase mb-2">
                      Плейлист
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-white drop-shadow-md mb-1 leading-tight line-clamp-2">
                      {pl.name}
                    </p>
                    <p className="text-sm sm:text-base text-white/70 font-medium">
                      {owner}
                      <span className="mx-1.5 text-white/30">&middot;</span>
                      {pl._count.playlistTracks} тр.
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Latest tracks ───────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 mt-12">Свежие треки</h2>

          {latestTracks.length === 0 ? (
            <div className="py-12 flex items-center justify-center bg-white/[0.05] rounded-2xl">
              <p className="text-white/40">Здесь скоро появятся новые треки</p>
            </div>
          ) : (
            <NewTracksGrid tracks={latestTracks.map(({ owner, ...rest }) => ({ ...rest, user: owner }))} />
          )}
        </div>

        {/* ── New playlists ───────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-bold text-white mb-6 mt-14">Новые плейлисты</h2>

          {morePlaylists.length === 0 ? (
            <div className="py-12 flex items-center justify-center bg-white/[0.05] rounded-2xl">
              <p className="text-white/40">Здесь скоро появятся новые релизы</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {morePlaylists.map((pl) => {
                const owner = pl.owner.username ?? pl.owner.name ?? "Stillum";
                return (
                  <Link
                    key={pl.id}
                    href={`/dashboard/playlists/${pl.id}`}
                    className="flex flex-col gap-0 group"
                  >
                    <div className="aspect-square rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden relative flex items-center justify-center group-hover:border-white/[0.12] transition-colors">
                      {pl.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pl.coverUrl}
                          alt={pl.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <ListMusic size={28} strokeWidth={0.75} className="text-white/15" />
                      )}
                    </div>
                    <p className="text-white font-medium mt-3 truncate text-[13px] group-hover:text-white/80 transition-colors">
                      {pl.name}
                    </p>
                    <p className="text-white/40 text-[12px] truncate mt-0.5">{owner}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
      </div>
      </div>
  );
}
