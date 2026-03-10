"use client";

import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { useState, useId } from "react";
import Link from "next/link";

// ─── Icons ────────────────────────────────

function GoogleIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </>
      )}
    </svg>
  );
}

// ─── Input ────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

function Input({ label, error, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-white/40 uppercase">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={[
          "w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20",
          "outline-none transition-all duration-150",
          "focus:border-white/25 focus:bg-white/8",
          error ? "border-red-500/50" : "border-white/8",
          props.className ?? "",
        ].join(" ")}
      />
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-red-400/80"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────

export default function LoginPage() {
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState<"google" | "credentials" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setIsLoading("google");
    await signIn("google", { callbackUrl: "/" });
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading("credentials");
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Неверный email или пароль.");
      setIsLoading(null);
      return;
    }

    // Success — redirect to library
    window.location.href = "/";
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#050A15] px-4">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 30%, rgba(255,255,255,0.028) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* ── Glassmorphism card ── */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">

          {/* Wordmark */}
          <div className="mb-7 flex flex-col items-center select-none">
            {/* Light beam */}
            <div aria-hidden className="mb-4 flex flex-col items-center">
              <div style={{ width: 1, height: 28, background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.45))" }} />
              <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.88)", boxShadow: "0 0 5px 2px rgba(255,255,255,0.28), 0 0 16px 5px rgba(255,255,255,0.09)" }} />
              <div style={{ width: 1, height: 20, background: "linear-gradient(to bottom, rgba(255,255,255,0.45), transparent)" }} />
            </div>
            <Link href="/" className="text-xl font-extralight tracking-[0.3em] text-white uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded">
              Stillum
            </Link>
          </div>

          {/* ── Google button ── */}
          <button
            onClick={handleGoogle}
            disabled={isLoading !== null}
            className="group flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-gray-200 transition-all duration-150 hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleIcon />
            {isLoading === "google" ? "Подключение..." : "Продолжить с Google"}
          </button>

          {/* ── Divider ── */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[10px] font-medium tracking-widest text-white/20 uppercase">или</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>

          {/* ── Credentials form ── */}
          <form onSubmit={handleCredentials} className="flex flex-col gap-4" noValidate>
            <Input
              id={emailId}
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading !== null}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor={passwordId} className="text-xs font-medium tracking-wide text-white/40 uppercase">
                Пароль
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading !== null}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-11 text-sm text-white placeholder-white/20 outline-none transition-all duration-150 focus:border-white/25 focus:bg-white/[0.08] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition-colors duration-150 hover:text-white/60 focus-visible:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading !== null || !email || !password}
              className="mt-1 w-full rounded-xl bg-white/90 py-3 text-sm font-medium text-[#050A15] transition-all duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {isLoading === "credentials" ? "Вход..." : "Войти"}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-[11px] leading-relaxed text-white/20">
            Нет аккаунта?{" "}
            <Link
              href="/register"
              className="text-white/40 underline-offset-2 hover:text-white/70 hover:underline transition-colors duration-150"
            >
              Создать
            </Link>
          </p>
        </div>

        {/* Legal */}
        <p className="mt-4 text-center text-[10px] leading-relaxed text-white/15">
          Входя, вы принимаете условия использования Stillum.
        </p>
      </motion.div>
    </main>
  );
}
