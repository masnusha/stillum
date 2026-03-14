import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import UserMenu from "@/app/dashboard/_components/UserMenu";

export const dynamic = "force-dynamic";

// ─── ProfileCard ──────────────────────────────────────────────────────────────

function ProfileCard({
  id,
  username,
  avatarUrl,
}: {
  id:        string;
  username:  string;
  avatarUrl: string | null;
}) {
  const initial = username[0]?.toUpperCase() ?? "?";

  return (
    <Link href={`/dashboard/profile/${id}`} className="flex flex-col items-center gap-3 group">

      {/* Avatar */}
      <div className="w-28 h-28 rounded-full overflow-hidden bg-white/[0.05] border border-white/[0.07] relative flex items-center justify-center group-hover:scale-[1.04] transition-transform duration-300">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl font-semibold text-white/20 select-none">
            {initial}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="text-[13px] font-medium text-white/60 group-hover:text-white transition-colors text-center truncate max-w-full px-1">
        {username}
      </span>

    </Link>
  );
}

// ─── ProfilesPage ─────────────────────────────────────────────────────────────

export default async function ProfilesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const follows = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      following: {
        select: {
          id:        true,
          username:  true,
          name:      true,
          avatarUrl: true,
          image:     true,
        },
      },
    },
  });

  const users = follows.map(({ following: u }) => ({
    id:        u.id,
    username:  u.username ?? u.name ?? u.id.slice(0, 8),
    avatarUrl: u.avatarUrl ?? u.image,
  }));

  return (
    <div className="flex flex-col h-full min-h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <h1 className="text-[15px] font-semibold text-white tracking-tight">
          Профили
        </h1>
        <UserMenu />
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 pt-10 pb-16 overflow-y-auto">

        {users.length === 0 ? (

          /* ── Empty state ──────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center pt-20 opacity-40">
            <Users className="w-12 h-12 mb-4" />
            <p className="text-lg text-white">
              Здесь появятся люди, на которых вы подпишетесь
            </p>
          </div>

        ) : (

          /* ── Profile grid ─────────────────────────────────────────────── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
            {users.map((u) => (
              <ProfileCard
                key={u.id}
                id={u.id}
                username={u.username}
                avatarUrl={u.avatarUrl}
              />
            ))}
          </div>

        )}

      </div>
    </div>
  );
}
