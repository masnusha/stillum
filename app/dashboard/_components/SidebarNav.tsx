"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Home, Sparkles, Radio, Library, ListMusic, Users, Mic2 } from "lucide-react";

const GLOBAL_NAV = [
  { href: "/dashboard/search", label: "Поиск",     icon: Search   },
  { href: "/dashboard/home",   label: "Главная",   icon: Home     },
  { href: "/dashboard/new",    label: "Новое",     icon: Sparkles },
  { href: "/dashboard/radio",  label: "Радио",     icon: Radio    },
] as const;

const LIBRARY_NAV = [
  { href: "/dashboard",           label: "Библиотека", icon: Library   },
  { href: "/dashboard/playlists", label: "Плейлисты",  icon: ListMusic },
  { href: "/dashboard/profiles",  label: "Профили",    icon: Users     },
] as const;

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href:   string;
  label:  string;
  icon:   React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
        active
          ? "text-white"
          : "text-white/30 hover:text-white/70 hover:bg-white/[0.02]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full bg-white/70" />
      )}
      <Icon
        size={15}
        strokeWidth={1.5}
        className={active ? "text-white/70" : "text-white/20 group-hover:text-white/40 transition-colors"}
      />
      {label}
    </Link>
  );
}

// ─── SidebarNav ───────────────────────────────────────────────────────────────

export default function SidebarNav({ role }: { role?: string }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">

      {/* ── Block 1: Global ───────────────────────────────────────────────── */}
      {GLOBAL_NAV.map(({ href, label, icon }) => (
        <NavLink
          key={href}
          href={href}
          label={label}
          icon={icon}
          active={pathname === href}
        />
      ))}

      {/* ── Студия — ARTIST only, bottom of global block ─────────────────── */}
      {role === "ARTIST" && (
        <NavLink
          href="/dashboard/studio"
          label="Студия"
          icon={Mic2}
          active={pathname.startsWith("/dashboard/studio")}
        />
      )}

      {/* ── Section label: Медиатека ──────────────────────────────────────── */}
      <div className="mt-7 mb-2 px-3">
        <h3 className="text-[10px] font-black tracking-[0.2em] text-white/20 uppercase">
          Медиатека
        </h3>
      </div>

      {/* ── Block 2: Personal library ─────────────────────────────────────── */}
      {LIBRARY_NAV.map(({ href, label, icon }) => (
        <NavLink
          key={href}
          href={href}
          label={label}
          icon={icon}
          active={pathname === href || (href === "/dashboard" && pathname === "/dashboard")}
        />
      ))}

    </nav>
  );
}
