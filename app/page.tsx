"use client";

import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#050A15]">
      {/* Ambient background glow — deep radial, barely visible */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255,255,255,0.025) 0%, transparent 70%)",
        }}
      />

      {/* Centered composition */}
      <div className="relative flex flex-col items-center select-none">
        {/* Light beam — vertical glowing ray, the Stillum logo mark */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0.4 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden
          className="mb-10 flex flex-col items-center"
          style={{ transformOrigin: "bottom center" }}
        >
          {/* Top fade of the beam */}
          <div
            style={{
              width: 1,
              height: 64,
              background:
                "linear-gradient(to bottom, transparent, rgba(255,255,255,0.55))",
            }}
          />
          {/* Core bright spot */}
          <div
            style={{
              width: 1,
              height: 24,
              background: "rgba(255,255,255,0.9)",
              boxShadow:
                "0 0 8px 3px rgba(255,255,255,0.35), 0 0 24px 8px rgba(255,255,255,0.12)",
            }}
          />
          {/* Bottom fade of the beam */}
          <div
            style={{
              width: 1,
              height: 48,
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.55), transparent)",
            }}
          />
        </motion.div>

        {/* Wordmark */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          className="text-[clamp(2rem,8vw,4.5rem)] font-extralight tracking-[0.35em] text-white uppercase"
        >
          Stillum
        </motion.h1>

        {/* Divider line */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          aria-hidden
          className="mt-5 h-px w-16 origin-center bg-white/20"
        />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.75 }}
          className="mt-4 text-[0.65rem] font-light tracking-[0.3em] text-white/30 uppercase"
        >
          Your music. Uninterrupted.
        </motion.p>
      </div>
    </main>
  );
}
