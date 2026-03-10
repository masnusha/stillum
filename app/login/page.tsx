"use client";

import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { useState, useId } from "react";
import Link from "next/link";

// ─── Icons ────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="white" fillOpacity="0.9" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="white" fillOpacity="0.7" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="white" fillOpacity="0.8" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      setError("Invalid email or password.");
      setIsLoading(null);
      return;
    }

    window.location.href = "/";
  }

  const busy = isLoading !== null;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#050A15] px-4">

      {/* Subtle radial ambient — barely visible, just enough depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255,255,255,0.022) 0%, transparent 68%)",
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 sm:p-10 backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)]"
      >

        {/* ── Header ── */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-6 block text-[11px] font-medium tracking-[0.25em] text-white/25 uppercase hover:text-white/50 transition-colors duration-300 focus-visible:outline-none"
          >
            ← Stillum
          </Link>
          <h1 className="font-semibold tracking-tight text-white text-3xl">
            Log in to Stillum
          </h1>
          <p className="text-sm text-white/40 mt-2">
            Welcome back. Your library is waiting.
          </p>
        </div>

        {/* ── Google button ── */}
        <button
          onClick={handleGoogle}
          disabled={busy}
          className="flex items-center justify-center gap-3 w-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white rounded-xl py-3 font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-40 text-sm"
        >
          <GoogleIcon />
          {isLoading === "google" ? "Connecting…" : "Continue with Google"}
        </button>

        {/* ── Divider ── */}
        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-white/30 text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {/* ── Credentials form ── */}
        <form onSubmit={handleCredentials} className="flex flex-col gap-4" noValidate>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label htmlFor={emailId} className="text-xs font-medium text-white/35 tracking-wide">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-300 disabled:opacity-40"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor={passwordId} className="text-xs font-medium text-white/35 tracking-wide">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-white/25 hover:text-white/50 transition-colors duration-300 focus-visible:outline-none"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                id={passwordId}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-300 disabled:opacity-40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55 transition-colors duration-200 focus-visible:outline-none"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-red-500/15 bg-red-500/[0.08] px-4 py-2.5 text-xs text-red-400/90"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full bg-white text-black font-medium rounded-xl py-3 hover:bg-gray-200 transition-all duration-300 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-30 mt-1"
          >
            {isLoading === "credentials" ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* ── Footer ── */}
        <p className="mt-7 text-center text-xs text-white/25">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-white/45 hover:text-white/75 transition-colors duration-300 underline underline-offset-2 decoration-white/20 hover:decoration-white/40"
          >
            Create one
          </Link>
        </p>
      </motion.div>

      {/* Legal */}
      <p className="relative z-10 mt-5 text-center text-[10px] text-white/15 leading-relaxed">
        By signing in, you agree to Stillum&apos;s Terms of Service.
      </p>
    </main>
  );
}
