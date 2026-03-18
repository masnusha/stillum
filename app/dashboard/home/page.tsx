import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Music } from "lucide-react";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import UserMenu from "@/app/dashboard/_components/UserMenu";
import HomeTrackCard from "./_components/HomeTrackCard";

export const dynamic = "force-dynamic";

// ─── Featured cards (hardcoded until curator playlists exist in DB) ───────────

const FEATURED = [
  {
    id:       "f1",
    href:     "/dashboard/explore/vibe",
    label:    "Сделано для тебя",
    title:    "Вайб Stillum",
    gradient: "from-violet-600 to-indigo-700",
  },
  {
    id:       "f2",
    href:     "/dashboard/explore/focus",
    label:    "Настроение дня",
    title:    "Deep Focus",
    gradient: "from-sky-600 to-cyan-700",
  },
  {
    id:       "f3",
    href:     "/dashboard/explore/underground",
    label:    "Редкие находки",
    title:    "Underground Selects",
    gradient: "from-rose-600 to-pink-700",
  },
];

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-[17px] font-bold text-white mb-4 px-6">{title}</h2>
      <div className="flex overflow-x-auto scrollbar-hide gap-6 px-6 pb-8 -mx-0">
        {children}
      </div>
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Latest public tracks
  const latestTracks = await prisma.track.findMany({
    where:   { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id:            true,
      title:         true,
      artist:        true,
      coverUrl:      true,
      audioUrl:      true,
      duration:      true,
      ownerId:       true,
      isExplicit:    true,
      isPublic:      true,
      allowComments: true,
      owner: { select: { id: true, username: true, name: true, avatarUrl: true, image: true } },
    },
  });

  // Recent users
  const newProfiles = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id:        true,
      username:  true,
      name:      true,
      avatarUrl: true,
      image:     true,
    },
  });

  return (
    <div className="flex flex-col h-full min-h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <h1 className="text-[15px] font-semibold text-white tracking-tight">Главная</h1>
        <UserMenu />
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="pt-8 pb-4 max-w-7xl mx-auto">

          {/* ── Block 1: Featured ────────────────────────────────────────── */}
          <Section title="Выбор редакции">
            {FEATURED.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`relative w-[300px] md:w-[380px] h-[220px] shrink-0 rounded-2xl bg-gradient-to-br ${item.gradient} overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}
              >
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                  <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-1">
                    {item.label}
                  </p>
                  <p className="text-2xl font-black text-white leading-tight">
                    {item.title}
                  </p>
                </div>
              </Link>
            ))}
          </Section>

          {/* ── Block 2: Latest tracks ───────────────────────────────────── */}
          {latestTracks.length > 0 && (
            <Section title="Недавно добавленное">
              {latestTracks.map((track) => (
                <HomeTrackCard key={track.id} track={track} />
              ))}
            </Section>
          )}

          {/* ── Block 3: New profiles ────────────────────────────────────── */}
          {newProfiles.length > 0 && (
            <Section title="Интересные профили">
              {newProfiles.map((user) => {
                const displayName = user.username ?? user.name ?? user.id.slice(0, 6);
                const avatar      = user.avatarUrl ?? user.image;
                const initial     = displayName[0]?.toUpperCase() ?? "?";

                return (
                  <Link
                    key={user.id}
                    href={`/dashboard/profile/${user.id}`}
                    className="w-28 md:w-32 shrink-0 flex flex-col items-center gap-2.5 group"
                  >
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white/[0.05] border border-white/[0.07] overflow-hidden relative flex items-center justify-center group-hover:scale-[1.05] transition-transform duration-300">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-semibold text-white/20 select-none">
                          {initial}
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] font-medium text-white/50 group-hover:text-white/80 transition-colors text-center truncate max-w-full px-1">
                      {displayName}
                    </span>
                  </Link>
                );
              })}
            </Section>
          )}

        </div>
      </div>

    </div>
  );
}
