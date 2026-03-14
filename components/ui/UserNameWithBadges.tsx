"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Sparkles } from "lucide-react";

interface Props {
  name:         string;
  plan:         string;
  role:         string;
  statusEmoji?: string | null;
  size?:        "sm" | "md" | "lg";
  className?:   string;
  /** @deprecated use size instead */
  iconSize?:    number;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
// Portal-based so it's never clipped by overflow-hidden ancestors.

type TooltipVariant = "artist" | "plus";

function Tooltip({
  children,
  label,
  variant,
  delayMs = 220,
}: {
  children: React.ReactNode;
  label:    React.ReactNode;
  variant:  TooltipVariant;
  delayMs?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [pos,     setPos]     = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const showTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: r.left + r.width / 2,
      y: r.top - 8 + window.scrollY,
    });
  }, []);

  function show() {
    place();
    showTimer.current = setTimeout(() => setVisible(true), delayMs);
  }

  function hide() {
    if (showTimer.current) clearTimeout(showTimer.current);
    setVisible(false);
  }

  useEffect(() => () => { if (showTimer.current) clearTimeout(showTimer.current); }, []);

  const contentCls =
    variant === "artist"
      ? "bg-[#0a0a0c]/95 backdrop-blur-md border border-[#1d9bf0]/30 text-[#1d9bf0] shadow-[0_4px_20px_rgba(29,155,240,0.15)]"
      : "bg-white/[0.08] backdrop-blur-xl border border-white/20 text-white/90 shadow-2xl";

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="flex items-center"
      >
        {children}
      </span>

      {visible && typeof document !== "undefined" && createPortal(
        <div
          role="tooltip"
          style={{
            position:  "absolute",
            left:      pos.x,
            top:       pos.y,
            transform: "translate(-50%, -100%)",
            zIndex:    9999,
          }}
          className={`pointer-events-none flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 ${contentCls}`}
        >
          {variant === "plus" && (
            <Sparkles size={11} strokeWidth={1.75} className="text-white/50 shrink-0" />
          )}
          {label}
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── VerifiedBadge ────────────────────────────────────────────────────────────

const BADGE_SIZE = {
  sm: { ring: "w-[14px] h-[14px]", check: 7,  strokeWidth: 1.5  },
  md: { ring: "w-[18px] h-[18px]", check: 9,  strokeWidth: 1.5  },
  lg: { ring: "w-[30px] h-[30px]", check: 14, strokeWidth: 1.75 },
};

const BADGE_NUDGE = {
  sm: "translate-y-[0.5px]",
  md: "translate-y-[1px]",
  lg: "translate-y-[2px]",
};

function VerifiedBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = BADGE_SIZE[size];
  return (
    <Tooltip label="Верифицированный артист" variant="artist">
      <span className={`flex shrink-0 items-center ${BADGE_NUDGE[size]}`}>
        <span
          className={`${s.ring} rounded-full flex items-center justify-center bg-gradient-to-br from-[#1d9bf0] to-[#1565c0] shadow-[0_0_10px_rgba(29,155,240,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]`}
        >
          <Check
            size={s.check}
            strokeWidth={s.strokeWidth}
            className="text-white"
            style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" }}
          />
        </span>
      </span>
    </Tooltip>
  );
}

// ─── UserNameWithBadges ───────────────────────────────────────────────────────

export default function UserNameWithBadges({
  name,
  plan,
  role,
  statusEmoji,
  size = "md",
  className = "",
  iconSize,
}: Props) {
  const isPlus   = plan === "PLUS";
  const isArtist = role === "ARTIST";

  const resolvedSize: "sm" | "md" | "lg" =
    size !== "md"
      ? size
      : iconSize !== undefined
        ? iconSize >= 40 ? "lg" : iconSize <= 12 ? "sm" : "md"
        : "md";

  const gapClass  = resolvedSize === "lg" ? "gap-[0.22em]" : resolvedSize === "sm" ? "gap-[0.18em]" : "gap-[0.2em]";
  const emojiEm   = resolvedSize === "sm" ? "0.75em" : "0.7em";
  const sparkSize = resolvedSize === "lg" ? 22 : resolvedSize === "sm" ? 10 : 13;

  return (
    <span className={`inline-flex items-center leading-none whitespace-nowrap w-fit ${gapClass} ${className}`}>
      <span className="inline-block leading-none">{name}</span>

      {isArtist && <VerifiedBadge size={resolvedSize} />}

      {isPlus && statusEmoji ? (
        <Tooltip label="Статус Stillum Plus" variant="plus">
          <span
            className="flex shrink-0 items-center justify-center leading-none select-none translate-y-[1px] cursor-default"
            style={{ fontSize: resolvedSize === "lg" ? "32px" : emojiEm }}
            aria-label="Статус"
          >
            {statusEmoji}
          </span>
        </Tooltip>
      ) : isPlus ? (
        <span className={`flex shrink-0 items-center ${BADGE_NUDGE[resolvedSize]}`}>
          <Sparkles
            size={sparkSize}
            strokeWidth={1.75}
            className="text-white/40"
            aria-label="Stillum Plus"
          />
        </span>
      ) : null}
    </span>
  );
}
