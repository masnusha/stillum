"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const WAVEFORM = Array.from({ length: 60 }, (_, i) =>
  Math.round(20 + Math.abs(Math.sin(i * 0.4) * 60 + Math.cos(i * 0.2) * 30))
);

export default function CreatorsSection() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-5xl mx-auto">

        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[11px] uppercase tracking-widest text-white/25 font-medium mb-5">
              Для артистов
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight mb-6">
              Делитесь своим творчеством с другими.
            </h2>
            <p className="text-[15px] text-white/40 leading-relaxed mb-8">
              Идеальное место для артистов и битмейкеров. Никаких алгоритмов,
              скрывающих ваши релизы. Загружайте треки в Lossless-качестве
              и делитесь прямыми ссылками со своей аудиторией.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.1] text-[13px] font-medium text-white/60 hover:text-white hover:border-white/20 transition-all duration-150"
            >
              Начать как артист
            </Link>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div
              className="aspect-square rounded-3xl bg-white/[0.02] border border-white/[0.07] overflow-hidden relative"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
            >
              {/* Decorative waveform */}
              <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-8 opacity-20">
                {WAVEFORM.map((h, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-white shrink-0"
                      style={{ height: `${h}px` }}
                    />
                  ))}
              </div>

              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#050A15]/80 backdrop-blur-md border border-white/[0.08]">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.08] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-2 w-24 bg-white/20 rounded-full mb-1.5" />
                    <div className="h-1.5 w-16 bg-white/10 rounded-full" />
                  </div>
                  <div className="px-1.5 py-0.5 rounded border border-white/[0.12] text-[8px] uppercase tracking-wider text-white/30 font-bold">
                    LOSSLESS
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
