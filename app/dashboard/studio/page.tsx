export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect }         from "next/navigation";
import Link                 from "next/link";
import Image                from "next/image";
import { Mic2, Plus, MoreHorizontal, Music } from "lucide-react";
import { authOptions }      from "@/auth";
import { prisma }           from "@/lib/prisma";
import UserMenu             from "../_components/UserMenu";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  SINGLE: "Сингл",
  EP:     "EP",
  ALBUM:  "Альбом",
};

function formatDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw.length === 10 ? raw + "T00:00:00" : raw);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StudioPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)             redirect("/login");
  if (session.user.role !== "ARTIST") redirect("/dashboard");

  const albums = await prisma.album.findMany({
    where:   { artistId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tracks: true } } },
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <h1 className="text-[15px] font-semibold text-white tracking-tight">Студия</h1>
        <UserMenu />
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 md:px-12 py-10 max-w-6xl w-full mx-auto">

        {/* Page heading + secondary CTA */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Каталог релизов</h2>
            <p className="text-[14px] text-white/35 mt-2">Управление вашим каталогом</p>
          </div>
          <Link
            href="/dashboard/upload"
            className="flex items-center gap-2 border border-white/20 text-white hover:bg-white/[0.07] px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            Новый релиз
          </Link>
        </div>

        {albums.length === 0 ? (

          /* ── Empty state ──────────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-white/[0.02] blur-3xl scale-[2]" />
              <div className="relative w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                <Mic2 size={30} strokeWidth={1} className="text-white/20" />
              </div>
            </div>
            <p className="text-xl font-semibold text-white/70 mb-2 tracking-tight">
              Каталог пуст
            </p>
            <p className="text-[14px] text-white/30 max-w-[260px] leading-relaxed mb-8">
              Вы ещё не выпустили ни одного релиза. Создайте первый — это займёт пару минут.
            </p>
            <Link
              href="/dashboard/upload"
              className="btn-shimmer flex items-center gap-2 text-[#030712] text-[13px] font-semibold px-6 py-3 rounded-full hover:scale-[1.03] active:scale-[0.98]"
            >
              <Plus size={14} strokeWidth={2.5} />
              Создать первый релиз
            </Link>
          </div>

        ) : (

          /* ── Release catalog table ────────────────────────────────────────── */
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">

            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_72px_130px_40px] gap-4 items-center px-6 py-3.5 border-b border-white/[0.05]">
              <span className="text-[10px] font-black tracking-[0.18em] text-white/25 uppercase">Релиз</span>
              <span className="text-[10px] font-black tracking-[0.18em] text-white/25 uppercase">Тип</span>
              <span className="text-[10px] font-black tracking-[0.18em] text-white/25 uppercase text-center">Треки</span>
              <span className="text-[10px] font-black tracking-[0.18em] text-white/25 uppercase">Дата</span>
              <span />
            </div>

            {/* Rows — each is a link to the release detail page */}
            {albums.map((album, i) => (
              <Link
                key={album.id}
                href={`/dashboard/studio/release/${album.id}`}
                className={[
                  "grid grid-cols-[1fr_100px_72px_130px_40px] gap-4 items-center px-6 py-4",
                  "cursor-pointer hover:bg-white/[0.04] transition-colors group",
                  i < albums.length - 1 ? "border-b border-white/[0.04]" : "",
                ].join(" ")}
              >
                {/* Release: cover + title */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/[0.04] border border-white/[0.05] flex items-center justify-center">
                    {album.coverImage ? (
                      <Image
                        src={album.coverImage}
                        alt={album.title}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music size={16} strokeWidth={1.25} className="text-white/20" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white/80 group-hover:text-white truncate leading-snug transition-colors">
                      {album.title}
                    </p>
                    {album.featuredArtists && (
                      <p className="text-[11px] text-white/30 truncate mt-0.5">
                        feat. {album.featuredArtists}
                      </p>
                    )}
                  </div>
                </div>

                {/* Type badge */}
                <div>
                  <span className="text-[11px] font-medium text-white/50 bg-white/[0.05] px-2.5 py-1 rounded-md">
                    {TYPE_LABELS[album.type] ?? album.type}
                  </span>
                </div>

                {/* Track count */}
                <div className="text-center">
                  <span className="text-[13px] text-white/40 tabular-nums">
                    {album._count.tracks}
                  </span>
                </div>

                {/* Date */}
                <div>
                  <span className="text-[12px] text-white/30">
                    {formatDate(album.releaseDate ?? album.createdAt.toISOString())}
                  </span>
                </div>

                {/* Chevron hint */}
                <div className="flex justify-end">
                  <MoreHorizontal
                    size={15}
                    strokeWidth={1.5}
                    className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>

              </Link>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}
