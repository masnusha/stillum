export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect }         from "next/navigation";
import { authOptions }      from "@/auth";
import UserMenu             from "../_components/UserMenu";
import UploadDropzone       from "../_components/UploadDropzone";
import ArtistReleaseForm    from "./_components/ArtistReleaseForm";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UploadPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const isArtist = session.user.role === "ARTIST";

  return (
    <div className="flex flex-col h-full min-h-full overflow-y-auto">

      {/* ── Top bar ───────────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <h1 className="text-[15px] font-semibold text-white tracking-tight">
          {isArtist ? "Студия" : "Загрузка"}
        </h1>
        <UserMenu />
      </header>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 md:px-12 py-10">
        {isArtist ? (
          <ArtistReleaseForm />
        ) : (
          /* Regular user: single-track upload zone, centered */
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <UploadDropzone variant="zone" />
          </div>
        )}
      </div>

    </div>
  );
}
