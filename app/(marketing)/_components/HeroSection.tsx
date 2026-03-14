"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      {/* Ambient background blobs */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-[0.07] blur-[120px]"
          style={{
            background: "radial-gradient(ellipse, #5b8dee 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[100px]"
          style={{
            background: "radial-gradient(ellipse, #9b59ee 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Content — relative + z-10 so ambient glow sits behind */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] tracking-widest uppercase text-white/40 font-medium"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse" />
          Абсолютная приватность
        </motion.div>

        {/* Headline */}
        <div className="relative">
          {/* Ambient glow behind headline */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-white/[0.03] blur-[120px] rounded-full pointer-events-none -z-10" />

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white leading-[1.08] tracking-tight max-w-4xl"
          >
            Твоё приватное
            <br />
            <span className="text-white/40">цифровое музыкальное</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
              пространство.
            </span>
          </motion.h1>
        </div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8 text-lg md:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed"
        >
          Создавай своё настроение, свою эстетику, делись только когда ты
          хочешь. Без алгоритмов. Без шума.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-12 flex items-center gap-6"
        >
          <Link
            href="/login"
            className="relative px-8 py-4 rounded-2xl bg-white text-[#030712] text-[15px] font-semibold hover:scale-105 active:scale-95 transition-all duration-150 select-none"
            style={{
              boxShadow:
                "0 0 40px rgba(255,255,255,0.12), 0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            Начать бесплатно
          </Link>
          <a
            href="#features"
            className="text-sm font-medium text-white/60 hover:text-white transition-colors flex items-center gap-1"
          >
            Узнать больше →
          </a>
        </motion.div>
      </div>

    </section>
  );
}
