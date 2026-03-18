import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { authOptions } from "@/auth";
import { prisma }     from "@/lib/prisma";
import { Mic } from "lucide-react";
import SidebarNav from "./_components/SidebarNav";
import Player from "./_components/Player";
import Logo from "@/components/ui/Logo";
import SessionProvider from "./_components/SessionProvider";
import NowPlayingSidebar from "@/components/NowPlayingSidebar";
import MainContentWrapper from "@/components/MainContentWrapper";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import { Toaster } from "sonner";

// Calling cookies() inside the layout is the canonical Next.js signal that
// this segment reads per-request data, which prevents static prerendering
// and ensures getServerSession() runs on every request (auth guard intact).
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reading cookies forces dynamic rendering at the Next.js level.
  await cookies();

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // New users who haven't completed onboarding → send them there first
  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id! },
    select: { username: true },
  });
  if (!dbUser?.username) redirect("/onboarding");

  const user = session.user;
  const initials =
    user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <SessionProvider>
    {/* Outer wrapper — fills the whole viewport.
        No overflow-hidden here: the sidebar is position:fixed and Framer Motion
        applies CSS transforms; overflow-hidden on a transformed ancestor would
        create a new containing block and clip the fixed panel. */}
    <div className="h-screen w-full flex bg-[#030712] select-none overflow-x-clip">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-white/[0.03]">

        {/* Logo + wordmark */}
        <div className="px-5 pt-7 pb-6">
          <Link href="/dashboard/home" className="flex items-center gap-2.5 group cursor-pointer w-fit">
            <Logo className="h-6 w-auto" />
            <span className="font-neue text-[17px] font-medium tracking-[0.02em] text-white/70 group-hover:text-white/90 mt-[1px] transition-colors">
              Stillum
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-2 overflow-y-auto scrollbar-hide pb-4">
          <SidebarNav role={session.user.role} />
        </div>

        {/* Artist CTA — only for ARTIST role */}
        {session.user.role === "ARTIST" && (
          <div className="px-3 pb-3">
            <Link
              href="/dashboard/upload"
              className="btn-shimmer w-full text-black font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.99]"
            >
              <Mic size={15} strokeWidth={2} />
              Создать релиз
            </Link>
          </div>
        )}

        {/* User profile — pinned to bottom */}
        <div className="p-3 border-t border-white/[0.03]">
          <Link href="/dashboard/profile" className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.03] transition-colors group">

            {/* Avatar */}
            <div className="relative w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "Avatar"}
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="text-[11px] font-medium text-white/40">
                  {initials}
                </span>
              )}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white/60 truncate group-hover:text-white/80 transition-colors">
                {user.name ?? user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-white/20 truncate">
                {user.email}
              </p>
            </div>

          </Link>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      {/* MainContentWrapper is a client component that reads isSidebarOpen from
          Zustand and shifts its right margin to avoid the Now Playing panel. */}
      <MainContentWrapper>
        {children}
      </MainContentWrapper>

      {/* ── GLOBAL AUDIO PLAYER ─────────────────────────────────────────────── */}
      <Player userId={session.user.id!} />

      {/* ── NOW PLAYING SIDEBAR ──────────────────────────────────────────────── */}
      <NowPlayingSidebar userId={session.user.id!} />

      {/* ── ADD TO PLAYLIST MODAL ────────────────────────────────────────────── */}
      <AddToPlaylistModal />

      {/* ── TOAST NOTIFICATIONS ─────────────────────────────────────────────── */}
      <Toaster
        position="bottom-right"
        offset={88}
        toastOptions={{
          style: {
            background: "#0D1526",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.85)",
            fontSize: "13px",
          },
        }}
      />
    </div>
    </SessionProvider>
  );
}
