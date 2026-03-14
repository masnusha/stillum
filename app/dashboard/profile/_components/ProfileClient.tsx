"use client";

import { useState }          from "react";
import { useSession }        from "next-auth/react";
import Link                  from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Music, ListMusic, Lock, Mic } from "lucide-react";
import ProfileEditModal from "./ProfileEditModal";
import { TelegramIcon, VkIcon, FilledMusicIcon, FilledGlobeIcon } from "./SocialIcons";
import UserMenu              from "@/app/dashboard/_components/UserMenu";
import FollowStats           from "@/app/dashboard/profile/[id]/_components/FollowStats";
import UserNameWithBadges    from "@/components/ui/UserNameWithBadges";
import TrackList, { type TrackRowData } from "@/app/dashboard/_components/TrackList";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaylistPreview {
  id:         string;
  name:       string;
  coverUrl:   string | null;
  isPublic:   boolean;
  trackCount: number;
}

export interface AlbumPreview {
  id:          string;
  title:       string;
  coverImage:  string | null;
  type:        string; // "SINGLE" | "EP" | "ALBUM"
  releaseDate: string | null;
  isPublic:    boolean;
  trackCount:  number;
}

export interface UserProfile {
  id:              string;
  name:            string | null;
  email:           string;
  username:        string | null;
  bio:             string | null;
  avatarUrl:       string | null;
  bannerUrl:       string | null;
  plan:            string;
  role:            string;
  statusEmoji:     string | null;
  followersCount:  number;
  followingCount:  number;
  trackCount:      number;
  playlistCount:   number;
  tracks:          TrackRowData[];
  looseTracks:     TrackRowData[];
  playlists:       PlaylistPreview[];
  albums:          AlbumPreview[];
  telegramLink:    string | null;
  vkLink:          string | null;
  yandexMusicLink: string | null;
  customLink:      string | null;
}

interface Props {
  user: UserProfile;
}

// ─── ProfileAvatar ────────────────────────────────────────────────────────────

function ProfileAvatar({ avatarUrl, displayName }: { avatarUrl: string | null; displayName: string }) {
  const initials = displayName
    .split(" ")
    .map((w) => w[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="w-36 h-36 md:w-44 md:h-44 rounded-full shrink-0 overflow-hidden bg-white/[0.05] border-4 border-[#030712] shadow-[0_8px_48px_rgba(0,0,0,0.7)] flex items-center justify-center">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
      ) : (
        <span className="text-5xl font-semibold text-white/20 select-none">{initials}</span>
      )}
    </div>
  );
}

// ─── PlaylistCard ─────────────────────────────────────────────────────────────

function PlaylistCard({ id, name, coverUrl, isPublic, trackCount }: PlaylistPreview) {
  return (
    <Link href={`/dashboard/playlists/${id}`} className="flex flex-col gap-2.5 group">
      <div className="aspect-square rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden relative flex items-center justify-center group-hover:border-white/[0.12] transition-colors">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <ListMusic size={28} strokeWidth={0.75} className="text-white/15" />
        )}
        {/* Private badge */}
        {!isPublic && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
            <Lock size={10} strokeWidth={2} className="text-white/60" />
          </div>
        )}
      </div>
      <div>
        <p className="text-[13px] font-medium text-white/70 group-hover:text-white transition-colors truncate">{name}</p>
        <p className="text-[11px] text-white/30 mt-0.5">{trackCount} тр.</p>
      </div>
    </Link>
  );
}

// ─── AlbumCard ────────────────────────────────────────────────────────────────

function AlbumCard({ id, title, coverImage, type, trackCount }: AlbumPreview) {
  const TYPE_LABEL: Record<string, string> = {
    SINGLE: "Single",
    EP:     "EP",
    ALBUM:  "Альбом",
  };

  return (
    <Link href={`/dashboard/albums/${id}`} className="flex flex-col gap-2.5 group">
      <div className="aspect-square rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden relative flex items-center justify-center group-hover:border-white/[0.12] transition-colors">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
        ) : (
          <ListMusic size={28} strokeWidth={0.75} className="text-white/15" />
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-0.5">
          {TYPE_LABEL[type] ?? type}
        </p>
        <p className="text-[13px] font-medium text-white/70 group-hover:text-white transition-colors truncate">
          {title}
        </p>
        <p className="text-[11px] text-white/30 mt-0.5">{trackCount} тр.</p>
      </div>
    </Link>
  );
}

// ─── EmptySection ─────────────────────────────────────────────────────────────

function EmptySection({
  message,
  icon: Icon,
}: {
  message: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="w-full rounded-2xl bg-white/[0.05] flex flex-col items-center justify-center py-12 gap-2 transition-colors hover:bg-white/[0.07]">
      <Icon className="w-6 h-6 text-white/20" />
      <p className="text-sm text-white/40">{message}</p>
    </div>
  );
}

// ─── ProfileClient ────────────────────────────────────────────────────────────

export default function ProfileClient({ user: initialUser }: Props) {
  const [user,          setUser]          = useState(initialUser);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const { update: updateSession }         = useSession();

  const displayName = user.username ?? user.name ?? user.email;

  return (
    <>
      <AnimatePresence>
        {showEditModal && (
          <ProfileEditModal
            user={user}
            onClose={() => setShowEditModal(false)}
            onSaved={async (updated) => {
              setUser((u) => ({ ...u, ...updated }));
              await updateSession();
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col h-full min-h-full overflow-y-auto">

        {/* ── Top bar ─────────────────────────────────────────────────────────── */}
        <header className="relative z-20 flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
          <h1 className="text-[15px] font-semibold text-white tracking-tight">Профиль</h1>
          <UserMenu />
        </header>

        <div className="flex-1">

          {/* ── Banner ──────────────────────────────────────────────────────────── */}
          <div className="relative w-full h-[280px] shrink-0">
            {user.bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.bannerUrl}
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

          {/* ── Hero — rides over the dissolved banner bottom ─────────────────── */}
          <div className="relative z-10 -mt-32 px-8 md:px-12">

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1,  y:  0 }}
                  exit={{    opacity: 0,  y: -8 }}
                  className="mb-6 px-4 py-3 rounded-xl bg-red-500/[0.08] border border-red-500/[0.15] text-[13px] text-red-400/80 flex items-center justify-between gap-3 max-w-2xl"
                >
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="shrink-0 text-red-400/40 hover:text-red-400/80 transition-colors"
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Avatar + info */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 pb-10 border-b border-white/[0.05] mb-12">

              <ProfileAvatar avatarUrl={user.avatarUrl} displayName={displayName} />

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
                  targetId={user.id}
                  currentUserId={user.id}
                  followerCount={user.followersCount}
                  followingCount={user.followingCount}
                  trackCount={user.trackCount}
                  playlistCount={user.playlistCount}
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
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors px-4 py-2 text-xs font-medium text-white flex items-center gap-2 h-9"
                  >
                    <Edit2 className="w-3 h-3" />
                    Редактировать профиль
                  </button>
                </div>

              </div>
            </div>

            {user.role === "ARTIST" ? (
              /* ── ARTIST VIEW ────────────────────────────────────────────────── */
              <>
                {/* ── Official releases (Albums / EPs / Singles) ──────────── */}
                <section className="mt-0">
                  <h2 className="text-xl font-bold text-white mb-6">Релизы</h2>
                  {user.albums.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                      {user.albums.map((a) => (
                        <AlbumCard key={a.id} {...a} />
                      ))}
                    </div>
                  ) : (
                    <div className="w-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                      <Mic className="w-12 h-12 text-white/10 mb-4" strokeWidth={0.75} />
                      <h3 className="text-xl font-bold text-white/40">Дискография пока пуста</h3>
                      <p className="text-white/20 text-sm mt-2 mb-8">Пора поделиться своим творчеством с миром</p>
                      <Link
                        href="/dashboard/upload"
                        className="bg-white text-black px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform"
                      >
                        Создать первый релиз
                      </Link>
                    </div>
                  )}
                </section>

                {/* ── Loose public tracks (outside any album) ─────────────── */}
                {user.looseTracks.length > 0 && (
                  <section className="mt-16">
                    <h2 className="text-xl font-bold text-white mb-6">Открытая библиотека</h2>
                    <div className="flex flex-col min-h-0">
                      <TrackList tracks={user.looseTracks} />
                    </div>
                  </section>
                )}

                {/* Playlists */}
                <section className="mt-14 pb-16">
                  <h2 className="text-lg font-bold text-white mb-6">Мои плейлисты</h2>
                  {user.playlists.length === 0 ? (
                    <EmptySection icon={ListMusic} message="Нет созданных плейлистов" />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                      {user.playlists.map((pl) => (
                        <PlaylistCard key={pl.id} {...pl} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              /* ── REGULAR USER VIEW ──────────────────────────────────────────── */
              <>
                {/* Tracks */}
                <section className="mt-0">
                  <h2 className="text-lg font-bold text-white mb-4">Мои треки</h2>
                  {user.tracks.length === 0 ? (
                    <EmptySection icon={Music} message="Здесь пока нет загруженных треков" />
                  ) : (
                    <div className="flex flex-col min-h-0">
                      <TrackList tracks={user.tracks} />
                    </div>
                  )}
                </section>

                {/* Playlists */}
                <section className="mt-12 pb-16">
                  <h2 className="text-lg font-bold text-white mb-6">Мои плейлисты</h2>
                  {user.playlists.length === 0 ? (
                    <EmptySection icon={ListMusic} message="Нет созданных плейлистов" />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                      {user.playlists.map((pl) => (
                        <PlaylistCard key={pl.id} {...pl} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
