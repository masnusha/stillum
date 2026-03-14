import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Music, ListMusic, Edit2 } from "lucide-react";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import TrackList           from "@/app/dashboard/_components/TrackList";
import UserMenu             from "@/app/dashboard/_components/UserMenu";
import UserNameWithBadges   from "@/components/ui/UserNameWithBadges";
import { TelegramIcon, VkIcon, FilledMusicIcon, FilledGlobeIcon } from "@/app/dashboard/profile/_components/SocialIcons";
import FollowButton from "./_components/FollowButton";
import FollowStats  from "./_components/FollowStats";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

// ─── PlaylistCard ─────────────────────────────────────────────────────────────

function PlaylistCard({
  id,
  name,
  coverUrl,
  trackCount,
  ownerId,
}: {
  id:         string;
  name:       string;
  coverUrl:   string | null;
  trackCount: number;
  ownerId:    string;
}) {
  return (
    <Link
      href={`/dashboard/playlists/${id}`}
      className="flex flex-col gap-2.5 group"
    >
      <div className="aspect-square rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden relative flex items-center justify-center group-hover:border-white/[0.12] transition-colors">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <ListMusic size={28} strokeWidth={0.75} className="text-white/15" />
        )}
      </div>
      <div>
        <p className="text-[13px] font-medium text-white/70 group-hover:text-white transition-colors truncate">{name}</p>
        <p className="text-[11px] text-white/30 mt-0.5">
          {trackCount} {plural(trackCount, "трек", "трека", "треков")}
        </p>
      </div>
    </Link>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const isOwn  = session.user.id === id;

  // Run user fetch + follow-state check in parallel
  const [user, followRow] = await Promise.all([
    prisma.user.findUnique({
    where: { id },
    select: {
      id:             true,
      name:           true,
      username:       true,
      bio:            true,
      avatarUrl:      true,
      bannerUrl:      true,
      image:          true,
      plan:           true,
      role:           true,
      statusEmoji:    true,
      telegramLink:   true,
      vkLink:         true,
      yandexMusicLink:true,
      customLink:     true,
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
      tracks: {
        where:   { isPublic: true },
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
      },
      playlists: {
        where:   { isPublic: true },
        orderBy: { createdAt: "desc" },
        select: {
          id:       true,
          name:     true,
          coverUrl: true,
          ownerId:  true,
          _count:   { select: { playlistTracks: true } },
        },
      },
    },
  }),
  isOwn
    ? Promise.resolve(null)
    : prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId:  session.user.id,
            followingId: id,
          },
        },
      }),
  ]);

  if (!user) notFound();

  const isFollowing = !!followRow;

  const displayName = user.username ?? user.name ?? id.slice(0, 8);
  const avatar      = user.avatarUrl ?? user.image;
  const banner      = user.bannerUrl;
  const initials    = displayName.split(" ").map((w) => w[0] ?? "").filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="flex flex-col h-full min-h-full overflow-y-auto">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <h1 className="text-[15px] font-semibold text-white tracking-tight">Профиль</h1>
        <UserMenu />
      </header>

      <div className="flex-1">

        {/* ── Banner ─────────────────────────────────────────────────────────── */}
        <div className="relative w-full h-[280px] shrink-0">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent" />
          )}
          {/* Top fade — dissolves upper edge into page background */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#030712] to-transparent" />
          {/* Bottom fade — dissolves lower edge into page background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030712]/60 to-[#030712]" />
        </div>

        {/* ── Hero — rides over the dissolved banner bottom ──────────────────── */}
        <div className="relative z-10 -mt-32 px-8 md:px-12">

          {/* Avatar + info */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 pb-10 border-b border-white/[0.05] mb-12">

            {/* Avatar */}
            <div className="w-36 h-36 md:w-44 md:h-44 rounded-full shrink-0 overflow-hidden bg-white/[0.05] border-4 border-[#030712] shadow-[0_8px_48px_rgba(0,0,0,0.7)] flex items-center justify-center">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-semibold text-white/20 select-none">{initials}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col gap-4 min-w-0 flex-1 text-left pb-2">

              <div>
                <p className="text-[10px] tracking-widest text-white/40 uppercase font-bold mb-2">Профиль</p>
                <h1 className="text-6xl sm:text-8xl lg:text-[100px] font-black tracking-tight text-white leading-[1.1] pb-2 break-words drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {user.username ? (
                    <UserNameWithBadges
                      name={user.username}
                      plan={user.plan}
                      role={user.role}
                      statusEmoji={user.statusEmoji}
                      size="lg"
                    />
                  ) : (
                    <span className="text-white/15">Никнейм</span>
                  )}
                </h1>
              </div>

              {user.bio && (
                <p className="text-sm text-white/55 max-w-xl leading-relaxed">{user.bio}</p>
              )}

              <FollowStats
                targetId={id}
                currentUserId={session.user.id}
                followerCount={user._count.followers}
                followingCount={user._count.following}
                trackCount={user.tracks.length}
                playlistCount={user.playlists.length}
              />

              <div className="flex flex-wrap items-center gap-3 mt-1">
                {user.telegramLink && (
                  <a href={user.telegramLink} target="_blank" rel="noopener noreferrer" aria-label="Telegram"
                    className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/[0.05]">
                    <TelegramIcon className="w-5 h-5" />
                  </a>
                )}
                {user.vkLink && (
                  <a href={user.vkLink} target="_blank" rel="noopener noreferrer" aria-label="ВКонтакте"
                    className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/[0.05]">
                    <VkIcon className="w-5 h-5" />
                  </a>
                )}
                {user.yandexMusicLink && (
                  <a href={user.yandexMusicLink} target="_blank" rel="noopener noreferrer" aria-label="Яндекс Музыка"
                    className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/[0.05]">
                    <FilledMusicIcon className="w-5 h-5" />
                  </a>
                )}
                {user.customLink && (
                  <a href={user.customLink} target="_blank" rel="noopener noreferrer" aria-label="Сайт"
                    className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/[0.05]">
                    <FilledGlobeIcon className="w-5 h-5" />
                  </a>
                )}
                {isOwn ? (
                  <Link
                    href="/dashboard/profile"
                    className="rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors px-4 py-2 text-xs font-medium text-white flex items-center gap-2 h-9"
                  >
                    <Edit2 className="w-3 h-3" />
                    Редактировать профиль
                  </Link>
                ) : (
                  <FollowButton targetId={id} isFollowing={isFollowing} />
                )}
              </div>

            </div>
          </div>

          {/* ── Public tracks ───────────────────────────────────────────────── */}
          <section className="mt-0">
            <h2 className="text-xl font-bold text-white mb-4">Публичные треки</h2>
            {user.tracks.length === 0 ? (
              <div className="w-full rounded-2xl bg-white/[0.05] flex flex-col items-center justify-center py-12 gap-2 transition-colors hover:bg-white/[0.07]">
                <Music className="w-6 h-6 text-white/20" />
                <p className="text-sm text-white/40">Пока нет публичных треков</p>
              </div>
            ) : (
              <div className="flex flex-col min-h-0">
                <TrackList tracks={user.tracks} />
              </div>
            )}
          </section>

          {/* ── Public playlists ────────────────────────────────────────────── */}
          <section className="mt-12 pb-16">
            <h2 className="text-xl font-bold text-white mb-6">Открытые плейлисты</h2>
            {user.playlists.length === 0 ? (
              <div className="w-full rounded-2xl bg-white/[0.05] flex flex-col items-center justify-center py-12 gap-2 transition-colors hover:bg-white/[0.07]">
                <ListMusic className="w-6 h-6 text-white/20" />
                <p className="text-sm text-white/40">Нет открытых плейлистов</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {user.playlists.map((pl) => (
                  <PlaylistCard
                    key={pl.id}
                    id={pl.id}
                    name={pl.name}
                    coverUrl={pl.coverUrl}
                    trackCount={pl._count.playlistTracks}
                    ownerId={pl.ownerId}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
