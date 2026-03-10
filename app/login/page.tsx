"use client";

import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useState } from "react";

// ─── Icons ───────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
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

function VKIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C5.029 10.818 4.012 8.687 4.012 8.183c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.864 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.169-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.169.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.745-.576.745z" />
    </svg>
  );
}

// ─── Provider Button ──────────────────────

interface ProviderButtonProps {
  provider: "google" | "vk";
  icon: React.ReactNode;
  label: string;
  isLoading: boolean;
  onClick: () => void;
}

function ProviderButton({
  icon,
  label,
  isLoading,
  onClick,
}: ProviderButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-gray-200 transition-all duration-150 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex-shrink-0">{icon}</span>
      <span>{isLoading ? "Подключение..." : label}</span>
    </button>
  );
}

// ─── Page ─────────────────────────────────

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  async function handleSignIn(provider: string) {
    setLoadingProvider(provider);
    await signIn(provider, { callbackUrl: "/" });
    // setLoadingProvider(null) — no need, page will redirect
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#050A15] px-4">
      {/* Background ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }}
      />

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Glassmorphism card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">

          {/* Wordmark + beam */}
          <div className="mb-8 flex flex-col items-center gap-0 select-none">
            {/* Mini light beam */}
            <div aria-hidden className="mb-4 flex flex-col items-center">
              <div
                style={{
                  width: 1,
                  height: 32,
                  background:
                    "linear-gradient(to bottom, transparent, rgba(255,255,255,0.5))",
                }}
              />
              <div
                style={{
                  width: 1,
                  height: 12,
                  background: "rgba(255,255,255,0.85)",
                  boxShadow:
                    "0 0 6px 2px rgba(255,255,255,0.3), 0 0 18px 6px rgba(255,255,255,0.1)",
                }}
              />
              <div
                style={{
                  width: 1,
                  height: 24,
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)",
                }}
              />
            </div>

            <h1 className="text-2xl font-extralight tracking-[0.3em] text-white uppercase">
              Stillum
            </h1>
            <p className="mt-2 text-xs font-light tracking-[0.2em] text-white/25 uppercase">
              Your music. Uninterrupted.
            </p>
          </div>

          {/* Divider */}
          <div className="mb-6 h-px w-full bg-white/8" />

          {/* Heading */}
          <p className="mb-5 text-center text-sm text-gray-400">
            Войди, чтобы продолжить
          </p>

          {/* Provider buttons */}
          <div className="flex flex-col gap-3">
            <ProviderButton
              provider="google"
              icon={<GoogleIcon />}
              label="Продолжить с Google"
              isLoading={loadingProvider === "google"}
              onClick={() => handleSignIn("google")}
            />
            <ProviderButton
              provider="vk"
              icon={<VKIcon />}
              label="Продолжить с ВКонтакте"
              isLoading={loadingProvider === "vk"}
              onClick={() => handleSignIn("vk")}
            />
          </div>

          {/* Legal note */}
          <p className="mt-6 text-center text-[10px] leading-relaxed text-white/20">
            Входя, вы принимаете условия использования.<br />
            Ваши данные защищены и не передаются третьим лицам.
          </p>
        </div>
      </motion.div>
    </main>
  );
}
