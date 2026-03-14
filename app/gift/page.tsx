"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo     from "@/components/ui/Logo";
import UserMenu from "@/app/dashboard/_components/UserMenu";
import { redeemPromoCode } from "@/app/actions/promo";

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECS = 60;
const REDIRECT_MS  = 3500;

// ─── PremiumCard ──────────────────────────────────────────────────────────────

function PremiumCard({ glow = false }: { glow?: boolean }) {
  return (
    <motion.div
      animate={glow ? { y: [0, -14, 0] } : { y: [0, -10, 0] }}
      transition={{ duration: glow ? 3 : 4, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-72 h-44 rounded-2xl overflow-hidden"
      style={{
        boxShadow: glow
          ? "0 0 80px rgba(168,85,247,0.45), 0 20px 60px rgba(0,0,0,0.7)"
          : "0 20px 60px rgba(0,0,0,0.6)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b3a] via-[#12102a] to-[#0a0a0c]" />
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] via-white/[0.07] to-transparent" />
      <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-2xl" />
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.07] to-amber-500/[0.04]" />
      )}
      <div className="absolute inset-0 rounded-2xl border border-white/[0.12]" />

      <div className="relative z-10 h-full flex flex-col justify-between p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400/80" strokeWidth={1.5} />
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500/70">
              Stillum Plus
            </span>
          </div>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <svg width="36" height="28" viewBox="0 0 36 28" fill="none" className="opacity-30">
            <rect x="0" y="0"  width="36" height="4" rx="2" fill="white" />
            <rect x="0" y="8"  width="24" height="4" rx="2" fill="white" />
            <rect x="0" y="16" width="30" height="4" rx="2" fill="white" />
            <rect x="0" y="24" width="16" height="4" rx="2" fill="white" />
          </svg>
          <div className="flex items-end justify-between mt-1">
            <span className="text-[10px] tracking-[0.15em] text-white/20 uppercase font-mono">
              Премиум доступ
            </span>
            <div className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400/30 to-purple-500/30" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SuccessOverlay ───────────────────────────────────────────────────────────

function SuccessOverlay() {
  return (
    <motion.div
      key="success-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0a0a0c]"
    >
      {/* Extra aurora bloom on success */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600 blur-[160px] opacity-25" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-amber-500 blur-[140px] opacity-10" />
      </div>

      {/* Card centred + scaled */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.15, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10"
      >
        <PremiumCard glow />
      </motion.div>

      {/* Text beneath card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="relative z-10 mt-14 text-center"
      >
        <h2 className="text-3xl font-bold text-white tracking-wide mb-3">
          Добро пожаловать в клуб
        </h2>
        <p className="text-white/35 text-[15px] max-w-xs leading-relaxed">
          Ваш аккаунт обновлён до&nbsp;
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500/80 font-semibold">
            Stillum Plus
          </span>
        </p>
      </motion.div>

      {/* Redirect hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        className="relative z-10 mt-8 text-[12px] text-white/20 tracking-wide"
      >
        Переходим в приложение…
      </motion.p>
    </motion.div>
  );
}

// ─── GiftPage ─────────────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "success" | "not_found" | "already_used" | "locked";

const ERROR_MESSAGES: Record<string, string> = {
  not_found:    "Этот код не существует. Проверьте правильность ввода.",
  already_used: "Этот код уже был использован ранее.",
};

export default function GiftPage() {
  const router = useRouter();

  const [code,      setCode]      = useState("");
  const [status,    setStatus]    = useState<Status>("idle");
  const [attempts,  setAttempts]  = useState(0);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auto-redirect after success ─────────────────────────────────────────────
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => router.push("/dashboard/home"), REDIRECT_MS);
    return () => clearTimeout(t);
  }, [status, router]);

  // ── Lockout countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(timerRef.current!);
          setAttempts(0);
          setStatus("idle");
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [countdown]);

  // ── Format input ────────────────────────────────────────────────────────────
  function formatCode(raw: string): string {
    const clean = raw.replace(/[^A-Z0-9]/g, "").slice(0, 12);
    return clean.match(/.{1,4}/g)?.join("-") ?? clean;
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (status === "locked") return;
    const formatted = formatCode(e.target.value.toUpperCase());
    setCode(formatted);
    if (status !== "idle") setStatus("idle");
  }

  // ── Activation ──────────────────────────────────────────────────────────────
  async function handleActivate() {
    if (!canSubmit) return;
    setStatus("loading");

    // Premium feel: artificial floor of 1.5s
    const [result] = await Promise.all([
      redeemPromoCode(code),
      new Promise((r) => setTimeout(r, 1500)),
    ]);

    if (result.ok) {
      setStatus("success");
      return;
    }

    if (result.reason === "unauthenticated") {
      router.push("/login");
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (nextAttempts >= MAX_ATTEMPTS) {
      setStatus("locked");
      setCountdown(LOCKOUT_SECS);
    } else {
      setStatus(result.reason); // "not_found" | "already_used"
    }
  }

  const rawLength = code.replace(/-/g, "").length;
  const isLocked  = status === "locked";
  const canSubmit = rawLength === 12 && status !== "loading" && !isLocked && status !== "success";
  const errorMessage = (status === "not_found" || status === "already_used")
    ? ERROR_MESSAGES[status]
    : null;

  return (
    <>
      {/* ── Success full-screen overlay (above everything) ── */}
      <AnimatePresence>
        {status === "success" && <SuccessOverlay />}
      </AnimatePresence>

      <div className="bg-[#0a0a0c] min-h-screen relative overflow-hidden flex flex-col items-center">

        {/* ── Aurora blobs ── */}
        <div className="pointer-events-none select-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600 blur-[140px] opacity-[0.18]" />
          <div className="absolute top-20 -right-48 w-[500px] h-[500px] rounded-full bg-purple-600 blur-[140px] opacity-[0.15]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-indigo-900 blur-[100px] opacity-[0.12]" />
        </div>

        {/* ── Global header ── */}
        <header className="absolute top-0 left-0 w-full flex justify-between items-center px-6 md:px-10 py-6 z-50">
          <Link href="/dashboard/home" className="flex items-center gap-2.5 group">
            <Logo className="h-7 w-auto rounded-lg" />
            <span className="text-[17px] font-medium tracking-[0.02em] text-white/70 group-hover:text-white/90 transition-colors">
              Stillum
            </span>
          </Link>
          <UserMenu />
        </header>

        {/* ── Main content ── */}
        <main className="relative z-10 w-full max-w-lg flex flex-col items-center px-6 pt-36 md:pt-40">

          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 text-center mb-4 leading-tight">
            Активируйте ваш код
          </h1>
          <p className="text-white/35 text-base text-center mb-12 max-w-sm leading-relaxed">
            Введите код из письма или подарочной карты, чтобы разблокировать Stillum Plus
          </p>

          {/* ── Form card ── */}
          <div className="w-full bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl">

            <input
              type="text"
              value={code}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={14}
              spellCheck={false}
              autoComplete="off"
              inputMode="text"
              disabled={isLocked || status === "loading"}
              className={`text-center text-2xl sm:text-3xl font-mono font-semibold tracking-[0.15em] uppercase bg-transparent border-b-2 focus:outline-none w-full px-4 py-4 text-white/90 placeholder:text-white/[0.08] placeholder:tracking-[0.15em] placeholder:font-mono transition-colors disabled:opacity-40 ${
                status === "not_found" || status === "already_used"
                  ? "border-red-500/50 focus:border-red-400/70"
                  : isLocked
                  ? "border-orange-500/30"
                  : rawLength === 12
                  ? "border-white/40"
                  : "border-white/[0.12] focus:border-white/40"
              }`}
            />

            {/* Attempts hint */}
            {(status === "not_found" || status === "already_used") && attempts < MAX_ATTEMPTS && (
              <p className="mt-2 text-[11px] text-white/20 text-center tabular-nums">
                Осталось попыток: {MAX_ATTEMPTS - attempts}
              </p>
            )}

            {/* Feedback area */}
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.p
                  key={status}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 text-[13px] text-center text-red-400/75"
                >
                  {errorMessage}
                </motion.p>
              )}

              {isLocked && (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 flex items-center justify-center gap-2 text-[13px] text-orange-400/70"
                >
                  <ShieldAlert size={13} strokeWidth={1.75} className="shrink-0" />
                  Слишком много попыток. Попробуйте через&nbsp;
                  <span className="tabular-nums font-mono font-semibold text-orange-400/90">
                    {countdown}с
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleActivate}
              className="w-full mt-8 bg-white text-black font-bold text-[15px] py-4 rounded-xl transition-all shadow-[0_0_24px_rgba(255,255,255,0.15)] disabled:opacity-25 disabled:cursor-not-allowed enabled:hover:scale-[1.02] enabled:active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <><Loader2 size={16} className="animate-spin" /> Проверяем…</>
              ) : isLocked ? (
                <><ShieldAlert size={16} strokeWidth={2} /> Заблокировано</>
              ) : (
                "Активировать"
              )}
            </button>

          </div>

          {/* ── Floating premium card ── */}
          <div className="mt-20 mb-16 flex flex-col items-center gap-5">
            <PremiumCard />
            <p className="text-[11px] tracking-widest text-white/15 uppercase font-semibold">
              Stillum Plus
            </p>
          </div>

        </main>
      </div>
    </>
  );
}
