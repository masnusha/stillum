"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";

export default function LoginPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    await signIn("email", {
      email: email.trim(),
      callbackUrl: "/dashboard",
      redirect: false,
    });
    setSent(true);
    setLoading(false);
  };

  const handleGoogle = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen w-full flex bg-[#030712] text-white overflow-hidden">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden md:flex w-1/2 flex-col justify-between p-12 border-r border-white/[0.05] bg-white/[0.01] relative overflow-hidden">

        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 30% 60%, rgba(79,122,248,0.06) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 70% 30%, rgba(168,85,247,0.04) 0%, transparent 70%)",
          }}
        />

        {/* Logo + wordmark */}
        <div className="relative flex items-center gap-2.5">
          <Logo className="h-7 w-auto" />
          <span className="font-neue text-[19px] font-medium tracking-[0.02em] text-white/60 mt-[1px]">
            Stillum
          </span>
        </div>

        {/* Tagline */}
        <div className="relative">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-snug">
            Твоя музыка.
            <br />
            Твои правила.
          </h2>
          <p className="text-white/40 text-sm max-w-md mt-4 leading-relaxed">
            Присоединяйся к сообществу, где нет алгоритмов,
            а искусство принадлежит только тебе и твоим слушателям.
          </p>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 relative">

        {/* Back link */}
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-1.5 text-[13px] text-white/30 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={14} />
          На главную
        </Link>

        {/* Form container */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm"
        >
          <AnimatePresence mode="wait">
            {sent ? (

              /* ── Sent state ── */
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center space-y-4 py-8"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto">
                  <EnvelopeIcon />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Проверьте почту</p>
                  <p className="text-sm text-white/35 mt-2 leading-relaxed">
                    Мы отправили ссылку для входа на{" "}
                    <span className="text-white/60">{email}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="text-[13px] text-white/30 hover:text-white/60 transition-colors"
                >
                  Изменить email
                </button>
              </motion.div>

            ) : (

              /* ── Form state ── */
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {/* Heading */}
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white">
                    Создать пространство
                  </h1>
                  <p className="text-white/40 text-sm mt-2">
                    Введите email для входа или регистрации.
                  </p>
                </div>

                {/* Google OAuth */}
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-sm font-medium text-white/70 hover:text-white"
                >
                  <GoogleIcon />
                  Войти через Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/[0.07]" />
                  <span className="text-[10px] text-white/25 uppercase tracking-widest font-medium">
                    или
                  </span>
                  <div className="flex-1 h-px bg-white/[0.07]" />
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest text-white/25 font-medium mb-3">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full bg-transparent border-b border-white/[0.12] px-0 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/50 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-3 rounded-xl bg-white text-[#030712] text-sm font-bold hover:scale-[1.02] active:scale-[0.99] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? "Отправляем…" : "Продолжить"}
                  </button>
                </form>

                {/* Footnote */}
                <p className="text-center text-[11px] text-white/15 leading-relaxed">
                  Без пароля. Без трекинга. Только ваша музыка.
                </p>
              </motion.div>

            )}
          </AnimatePresence>
        </motion.div>
      </div>

    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/40" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
