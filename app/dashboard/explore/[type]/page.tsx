import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import TrackList from "@/app/dashboard/_components/TrackList";
import UserMenu from "@/app/dashboard/_components/UserMenu";

export const dynamic = "force-dynamic";

// ─── Config — mirrors FEATURED in home/page.tsx ───────────────────────────────

const EXPLORE_CONFIG: Record<string, { label: string; title: string; gradient: string; genreQuery?: string[] }> = {
  // ── Editorial picks ──────────────────────────────────────────────────────
  vibe:         { label: "Сделано для тебя",  title: "Вайб Stillum",       gradient: "from-violet-600 to-indigo-700" },
  focus:        { label: "Настроение дня",    title: "Deep Focus",          gradient: "from-sky-600    to-cyan-700",   genreQuery: ["focus","lo-fi","lofi","ambient"] },
  underground:  { label: "Редкие находки",    title: "Underground Selects", gradient: "from-rose-600   to-pink-700" },
  // ── Genre pages (from /dashboard/search) ─────────────────────────────────
  "hip-hop":    { label: "Жанр", title: "Hip-Hop",      gradient: "from-blue-500    to-indigo-700",  genreQuery: ["hip-hop","hip hop","rap"] },
  "electronic": { label: "Жанр", title: "Electronic",   gradient: "from-emerald-400 to-teal-700",   genreQuery: ["electronic"] },
  "pop":        { label: "Жанр", title: "Pop",          gradient: "from-pink-500    to-rose-600",   genreQuery: ["pop"] },
  "rock":       { label: "Жанр", title: "Rock",         gradient: "from-red-500     to-red-800",    genreQuery: ["rock"] },
  "rb":         { label: "Жанр", title: "R&B",          gradient: "from-purple-500  to-purple-800", genreQuery: ["r&b","rnb"] },
  "jazz":       { label: "Жанр", title: "Jazz",         gradient: "from-amber-400   to-orange-600", genreQuery: ["jazz"] },
  "soul":       { label: "Жанр", title: "Soul",         gradient: "from-orange-400  to-red-600",    genreQuery: ["soul"] },
  "neo-soul":   { label: "Жанр", title: "Neo Soul",     gradient: "from-rose-400    to-fuchsia-700",genreQuery: ["neo soul"] },
  "house":      { label: "Жанр", title: "House",        gradient: "from-cyan-400    to-blue-700",   genreQuery: ["house"] },
  "techno":     { label: "Жанр", title: "Techno",       gradient: "from-zinc-500    to-slate-800",  genreQuery: ["techno"] },
  "trance":     { label: "Жанр", title: "Trance",       gradient: "from-violet-400  to-indigo-700", genreQuery: ["trance"] },
  "dnb":        { label: "Жанр", title: "Drum & Bass",  gradient: "from-lime-400    to-green-700",  genreQuery: ["drum & bass","dnb","drum and bass"] },
  "dubstep":    { label: "Жанр", title: "Dubstep",      gradient: "from-yellow-400  to-orange-700", genreQuery: ["dubstep"] },
  "trap":       { label: "Жанр", title: "Trap",         gradient: "from-gray-500    to-gray-900",   genreQuery: ["trap"] },
  "ambient":    { label: "Жанр", title: "Ambient",      gradient: "from-sky-300     to-blue-600",   genreQuery: ["ambient"] },
  "lofi":       { label: "Жанр", title: "Lo-Fi",        gradient: "from-stone-400   to-stone-700",  genreQuery: ["lo-fi","lofi","lo fi"] },
  "indie":      { label: "Жанр", title: "Indie",        gradient: "from-fuchsia-400 to-purple-700", genreQuery: ["indie"] },
  "folk":       { label: "Жанр", title: "Folk",         gradient: "from-green-400   to-emerald-700",genreQuery: ["folk"] },
  "country":    { label: "Жанр", title: "Country",      gradient: "from-yellow-500  to-amber-700",  genreQuery: ["country"] },
  "blues":      { label: "Жанр", title: "Blues",        gradient: "from-blue-700    to-blue-900",   genreQuery: ["blues"] },
  "classical":  { label: "Жанр", title: "Classical",    gradient: "from-slate-300   to-slate-600",  genreQuery: ["classical"] },
  "metal":      { label: "Жанр", title: "Metal",        gradient: "from-red-700     to-rose-900",   genreQuery: ["metal"] },
  "hard-rock":  { label: "Жанр", title: "Hard Rock",    gradient: "from-orange-600  to-red-800",    genreQuery: ["hard rock"] },
  "punk":       { label: "Жанр", title: "Punk",         gradient: "from-red-400     to-pink-700",   genreQuery: ["punk"] },
  "post-rock":  { label: "Жанр", title: "Post-Rock",    gradient: "from-indigo-400  to-slate-700",  genreQuery: ["post-rock","post rock"] },
  "funk":       { label: "Жанр", title: "Funk",         gradient: "from-yellow-300  to-lime-600",   genreQuery: ["funk"] },
  "latin":      { label: "Жанр", title: "Latin",        gradient: "from-rose-500    to-orange-600", genreQuery: ["latin"] },
  "reggae":     { label: "Жанр", title: "Reggae",       gradient: "from-green-500   to-yellow-600", genreQuery: ["reggae"] },
  "dance":      { label: "Жанр", title: "Dance",        gradient: "from-fuchsia-500 to-pink-700",   genreQuery: ["dance"] },
  "disco":      { label: "Жанр", title: "Disco",        gradient: "from-amber-300   to-pink-500",   genreQuery: ["disco"] },
  "synth-pop":  { label: "Жанр", title: "Synth-Pop",    gradient: "from-cyan-300    to-violet-600", genreQuery: ["synth-pop","synth pop"] },
  "minimal":    { label: "Жанр", title: "Minimal",      gradient: "from-neutral-400 to-neutral-700",genreQuery: ["minimal"] },
  "experimental":{ label:"Жанр", title: "Experimental", gradient: "from-violet-600  to-fuchsia-900",genreQuery: ["experimental"] },
  "noise":      { label: "Жанр", title: "Noise",        gradient: "from-zinc-400    to-zinc-800",   genreQuery: ["noise"] },
  "world":      { label: "Жанр", title: "World",        gradient: "from-teal-400    to-cyan-700",   genreQuery: ["world"] },
};

type ExploreType = string;

// ─── Track select shape (matches TrackRowData) ────────────────────────────────

const TRACK_SELECT = {
  id:          true,
  title:       true,
  artist:      true,
  genre:       true,
  releaseDate: true,
  recordLabel: true,
  buyLink:     true,
  isExplicit:    true,
  isPublic:      true,
  allowComments: true,
  duration:    true,
  coverUrl:    true,
  audioUrl:    true,
} as const;

// ─── Data fetcher ─────────────────────────────────────────────────────────────

async function fetchTracks(type: ExploreType) {
  const config = EXPLORE_CONFIG[type];

  // Genre-filtered page
  if (config.genreQuery) {
    return prisma.track.findMany({
      where: {
        isPublic: true,
        OR: config.genreQuery.map((g) => ({
          genre: { contains: g, mode: "insensitive" as const },
        })),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: TRACK_SELECT,
    });
  }

  // Editorial: underground — last 7 days
  if (type === "underground") {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return prisma.track.findMany({
      where: { isPublic: true, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: TRACK_SELECT,
    });
  }

  // Default (vibe + any unknown type): all public tracks newest-first
  return prisma.track.findMany({
    where:   { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: TRACK_SELECT,
  });
}

// ─── ExplorePage ──────────────────────────────────────────────────────────────

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { type: rawType } = await params;
  const type = rawType as ExploreType;
  if (!(type in EXPLORE_CONFIG)) notFound();

  const config = EXPLORE_CONFIG[type];
  const tracks = await fetchTracks(type);

  return (
    <div className="flex flex-col h-full min-h-full">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <Link
          href="/dashboard/home"
          className="flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/80 transition-colors"
        >
          <ChevronLeft size={15} strokeWidth={1.5} />
          Главная
        </Link>
        <UserMenu />
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className={`relative bg-gradient-to-br ${config.gradient} shrink-0`}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative px-8 pt-10 pb-12">
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-2">
              {config.label}
            </p>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.05]">
              {config.title}
            </h1>
            <p className="text-[13px] text-white/50 mt-3">
              {tracks.length}{" "}
              {tracks.length === 1 ? "трек" : tracks.length < 5 ? "трека" : "треков"}
            </p>
          </div>
        </div>

        {/* ── Track list ───────────────────────────────────────────────────── */}
        {tracks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <p className="text-[15px] font-medium text-white/30">Пока пусто</p>
            <p className="text-[13px] text-white/20 max-w-xs leading-relaxed">
              Треки появятся здесь, как только пользователи начнут публиковать музыку.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <TrackList tracks={tracks} />
          </div>
        )}

      </div>
    </div>
  );
}
