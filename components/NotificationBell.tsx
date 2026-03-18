"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Bell, BellRing } from "lucide-react";
import {
  getNotifications, markAllNotificationsRead, markOneNotificationRead,
  clearAllNotifications, type NotificationItem,
} from "@/app/actions/notification";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60)  return "только что";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}м назад`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}ч назад`;
  return `${Math.floor(h / 24)}д назад`;
}

function notificationText(n: NotificationItem): string {
  switch (n.type) {
    case "NEW_COMMENT":
      return `прокомментировал ваш трек${n.track ? ` «${n.track.title}»` : ""}`;
    case "REPLY":
      return "ответил на ваш комментарий";
    case "REACTION":
      return "оставил реакцию на ваш комментарий";
    case "FOLLOW":
      return "подписался на вас";
  }
}

function notificationHref(n: NotificationItem): string {
  if (n.type === "FOLLOW") return `/dashboard/profile/${n.issuer.id}`;
  if (n.trackId) return `/dashboard/track/${n.trackId}`;
  return `/dashboard/profile/${n.issuer.id}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [,              startTransition]  = useTransition();

  useEffect(() => {
    getNotifications().then(({ notifications, unreadCount }) => {
      setNotifications(notifications);
      setUnreadCount(unreadCount);
    });
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      startTransition(async () => {
        await markAllNotificationsRead();
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      });
    }
  };

  const handleClear = () => {
    startTransition(async () => {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    });
  };

  const handleClickNotification = (id: string) => {
    // Optimistic mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setOpen(false);
    startTransition(() => { markOneNotificationRead(id); });
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Уведомления"
          className="relative w-9 h-9 rounded-lg flex items-center justify-center
                     text-white/35 hover:text-white/75 hover:bg-white/[0.05]
                     transition-all duration-150 shrink-0"
        >
          <Bell size={18} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute top-[8px] right-[8px] w-[7px] h-[7px] bg-white rounded-full border-2 border-[#030712]" />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={15}
          style={{ outline: "none", zIndex: 300 }}
          className="w-80 bg-[#08101F]/90 backdrop-blur-2xl
                     border border-white/[0.07] rounded-2xl overflow-hidden
                     shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          {/* ── Header ── */}
          <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white/80">Уведомления</p>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] uppercase tracking-wider text-white/20 hover:text-white/70 transition-colors duration-150"
              >
                Очистить
              </button>
            )}
          </div>

          {/* ── List ── */}
          <div className="max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-6">
                <BellRing size={28} strokeWidth={1.25} className="text-white/10" />
                <p className="text-[12px] text-white/25 text-center leading-relaxed">
                  Нет новых уведомлений
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={notificationHref(n)}
                  onClick={() => handleClickNotification(n.id)}
                  className={`flex items-start gap-3 px-4 py-3.5
                              border-b border-white/[0.03] last:border-0
                              hover:bg-white/[0.05] transition-colors duration-150
                              ${!n.isRead ? "bg-white/[0.025]" : ""}`}
                >
                  {/* Unread dot — left of avatar */}
                  <div className="flex items-center pt-[14px] shrink-0 w-2">
                    {!n.isRead && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.05]
                                  overflow-hidden shrink-0 flex items-center justify-center">
                    {(n.issuer.avatarUrl ?? n.issuer.image) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(n.issuer.avatarUrl ?? n.issuer.image)!}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] font-medium text-white/40">
                        {(n.issuer.name ?? n.issuer.username ?? "?")?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-snug">
                      <span className="font-semibold text-white">
                        {n.issuer.username ?? n.issuer.name ?? "Пользователь"}
                      </span>{" "}
                      <span className="text-white/50">{notificationText(n)}</span>
                    </p>
                    <p className="text-[10px] text-white/25 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
