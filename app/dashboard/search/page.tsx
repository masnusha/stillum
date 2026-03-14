import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import { getSearchHistory } from "@/app/actions/search-history";
import UserMenu from "@/app/dashboard/_components/UserMenu";
import SearchView from "./_components/SearchView";

export const dynamic = "force-dynamic";

// ─── Genre catalog ────────────────────────────────────────────────────────────

const GENRES = [
  { name: "Hip-Hop",      slug: "hip-hop",      color: "from-blue-500    to-indigo-700"   },
  { name: "Electronic",   slug: "electronic",   color: "from-emerald-400 to-teal-700"    },
  { name: "Pop",          slug: "pop",          color: "from-pink-500    to-rose-600"    },
  { name: "Rock",         slug: "rock",         color: "from-red-500     to-red-800"     },
  { name: "R&B",          slug: "rb",           color: "from-purple-500  to-purple-800"  },
  { name: "Jazz",         slug: "jazz",         color: "from-amber-400   to-orange-600"  },
  { name: "Soul",         slug: "soul",         color: "from-orange-400  to-red-600"     },
  { name: "Neo Soul",     slug: "neo-soul",     color: "from-rose-400    to-fuchsia-700" },
  { name: "House",        slug: "house",        color: "from-cyan-400    to-blue-700"    },
  { name: "Techno",       slug: "techno",       color: "from-zinc-500    to-slate-800"   },
  { name: "Trance",       slug: "trance",       color: "from-violet-400  to-indigo-700"  },
  { name: "Drum & Bass",  slug: "dnb",          color: "from-lime-400    to-green-700"   },
  { name: "Dubstep",      slug: "dubstep",      color: "from-yellow-400  to-orange-700"  },
  { name: "Trap",         slug: "trap",         color: "from-gray-500    to-gray-900"    },
  { name: "Ambient",      slug: "ambient",      color: "from-sky-300     to-blue-600"    },
  { name: "Lo-Fi",        slug: "lofi",         color: "from-stone-400   to-stone-700"   },
  { name: "Indie",        slug: "indie",        color: "from-fuchsia-400 to-purple-700"  },
  { name: "Folk",         slug: "folk",         color: "from-green-400   to-emerald-700" },
  { name: "Country",      slug: "country",      color: "from-yellow-500  to-amber-700"   },
  { name: "Blues",        slug: "blues",        color: "from-blue-700    to-blue-900"    },
  { name: "Classical",    slug: "classical",    color: "from-slate-300   to-slate-600"   },
  { name: "Metal",        slug: "metal",        color: "from-red-700     to-rose-900"    },
  { name: "Hard Rock",    slug: "hard-rock",    color: "from-orange-600  to-red-800"     },
  { name: "Punk",         slug: "punk",         color: "from-red-400     to-pink-700"    },
  { name: "Post-Rock",    slug: "post-rock",    color: "from-indigo-400  to-slate-700"   },
  { name: "Funk",         slug: "funk",         color: "from-yellow-300  to-lime-600"    },
  { name: "Latin",        slug: "latin",        color: "from-rose-500    to-orange-600"  },
  { name: "Reggae",       slug: "reggae",       color: "from-green-500   to-yellow-600"  },
  { name: "Dance",        slug: "dance",        color: "from-fuchsia-500 to-pink-700"    },
  { name: "Disco",        slug: "disco",        color: "from-amber-300   to-pink-500"    },
  { name: "Synth-Pop",    slug: "synth-pop",    color: "from-cyan-300    to-violet-600"  },
  { name: "Minimal",      slug: "minimal",      color: "from-neutral-400 to-neutral-700" },
  { name: "Experimental", slug: "experimental", color: "from-violet-600  to-fuchsia-900" },
  { name: "Noise",        slug: "noise",        color: "from-zinc-400    to-zinc-800"    },
  { name: "World",        slug: "world",        color: "from-teal-400    to-cyan-700"    },
] as const;

// ─── SearchPage ───────────────────────────────────────────────────────────────

export default async function SearchPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const history = await getSearchHistory();

  return (
    <div className="flex flex-col h-full min-h-full">

      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <h1 className="text-[15px] font-semibold text-white tracking-tight">Поиск</h1>
        <UserMenu />
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="pt-8 pb-32 max-w-7xl mx-auto px-6">
          <SearchView genres={[...GENRES]} history={history} />
        </div>
      </div>

    </div>
  );
}
