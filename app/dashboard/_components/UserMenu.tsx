"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link  from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import UserNameWithBadges from "@/components/ui/UserNameWithBadges";

const NotificationBell = dynamic(() => import("@/components/NotificationBell"), { ssr: false });
import {
  User,
  BadgeCheck,
  Sparkles,
  Key,
  LogOut,
  BookOpen,
  Mic2,
  LifeBuoy,
  Scale,
} from "lucide-react";

// ─── MenuItem ─────────────────────────────────────────────────────────────────

function MenuItem({
  icon: Icon,
  label,
  onClick,
  dim,
  danger,
  amber,
}: {
  icon:     React.ElementType;
  label:    string;
  onClick:  () => void;
  dim?:     boolean;
  danger?:  boolean;
  amber?:   boolean;
}) {
  const base = "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer";

  const colour = danger
    ? "text-white/50 hover:text-red-400 hover:bg-red-500/[0.08]"
    : amber
    ? "text-amber-400/80 hover:text-amber-400 hover:bg-amber-400/[0.08]"
    : dim
    ? "text-white/35 hover:text-white/65 hover:bg-white/[0.05] text-[13px]"
    : "text-white/80 hover:text-white hover:bg-white/[0.08]";

  return (
    <button type="button" onClick={onClick} className={`${base} ${colour}`}>
      <Icon size={dim ? 13 : 14} strokeWidth={1.75} className="shrink-0 opacity-70" />
      <span className={dim ? "text-[13px]" : "text-[14px]"}>{label}</span>
    </button>
  );
}

// ─── LinkItem ─────────────────────────────────────────────────────────────────

function LinkItem({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon:    React.ElementType;
  label:   string;
  href:    string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-[13px] text-white/35 hover:text-white/65 hover:bg-white/[0.05] transition-colors cursor-pointer"
    >
      <Icon size={13} strokeWidth={1.75} className="shrink-0 opacity-70" />
      {label}
    </Link>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-white/[0.06] my-1.5" />;
}

// ─── UserMenu ─────────────────────────────────────────────────────────────────

export default function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const router            = useRouter();

  const name        = session?.user?.name;
  const email       = session?.user?.email;
  const image       = session?.user?.image;
  const plan        = session?.user?.plan        ?? "FREE";
  const role        = session?.user?.role        ?? "USER";
  const statusEmoji = session?.user?.statusEmoji ?? null;
  const initials    = name?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? "?";

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function close() { setOpen(false); }
  function nav(href: string) { close(); router.push(href); }

  return (
    <div className="flex items-center gap-5">
    <NotificationBell />
    <div ref={ref} className="relative">

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center overflow-hidden hover:border-white/30 transition-colors shrink-0"
      >
        {image ? (
          <Image src={image} alt={name ?? "Avatar"} fill className="object-cover" />
        ) : (
          <span className="text-[13px] font-medium text-white/60">{initials}</span>
        )}
      </button>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y:  0, scale: 1    }}
            exit={{    opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute right-0 top-11 w-64 bg-[#0a0a0c]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-2"
          >

            {/* ── User identity header ── */}
            <div className="px-3 py-2.5 mb-1">
              <UserNameWithBadges
                name={name ?? email?.split("@")[0] ?? ""}
                plan={plan}
                role={role}
                statusEmoji={statusEmoji}
                size="sm"
                className="text-[13px] font-semibold text-white/80 truncate leading-snug max-w-full"
              />
              <p className="text-[11px] text-white/30 truncate mt-0.5">{email}</p>
            </div>

            <Divider />

            {/* ── Primary actions ── */}
            <MenuItem
              icon={User}
              label="Профиль"
              onClick={() => nav("/dashboard/profile")}
            />
            <MenuItem
              icon={BadgeCheck}
              label="Аккаунт"
              onClick={() => nav("/dashboard/account")}
            />
            {plan !== "PLUS" && (
              <>
                <MenuItem
                  icon={Sparkles}
                  label="Перейти на Plus"
                  onClick={close}
                  amber
                />
                <MenuItem
                  icon={Key}
                  label="Активировать код"
                  onClick={() => nav("/gift")}
                />
              </>
            )}

            <Divider />

            {/* ── Secondary / info links ── */}
            <LinkItem
              icon={BookOpen}
              label="Философия Stillum"
              href="/about"
              onClick={close}
            />
            <LinkItem
              icon={Mic2}
              label="Для артистов"
              href="/artists"
              onClick={close}
            />
            <LinkItem
              icon={LifeBuoy}
              label="Служба поддержки"
              href="/support"
              onClick={close}
            />
            <LinkItem
              icon={Scale}
              label="Правовая информация"
              href="/legal"
              onClick={close}
            />

            <Divider />

            {/* ── Sign out ── */}
            <MenuItem
              icon={LogOut}
              label="Выйти"
              onClick={() => signOut({ callbackUrl: "/" })}
              danger
            />

          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
