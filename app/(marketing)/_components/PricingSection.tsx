"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const FREE_FEATURES = [
  { label: "Доступ ко всей вашей медиатеке",  ok: true  },
  { label: "Личные плейлисты",                 ok: true  },
  { label: "Музыка без рекламы",               ok: false },
];

const PLUS_FEATURES = [
  { label: "Доступ ко всей вашей медиатеке",  ok: true },
  { label: "Личные плейлисты",                 ok: true },
  { label: "Музыка без рекламы",               ok: true },
];

function FeatureRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0
        ${ok ? "bg-white/10" : "bg-white/[0.04]"}`}
      >
        {ok
          ? <Check size={10} strokeWidth={2.5} className="text-white/70" />
          : <X     size={9}  strokeWidth={2.5} className="text-white/20" />
        }
      </div>
      <span className={`text-[13px] leading-snug ${ok ? "text-white/60" : "text-white/20"}`}>
        {label}
      </span>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section id="pricing" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative text-center mb-16 z-10"
        >
          {/* Local glow behind heading */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[150px] bg-white/[0.04] blur-[100px] rounded-full pointer-events-none -z-10" />
          <p className="text-[11px] uppercase tracking-widest text-white/25 font-medium mb-4">Тарифы</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight">
            Выберите подписку,
            <br />
            <span className="text-white/40">которая подходит именно вам.</span>
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="relative grid md:grid-cols-2 gap-5 z-10">
          {/* Local glow behind cards */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-blue-500/[0.02] blur-[120px] pointer-events-none -z-10 rounded-full" />

          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-8 hover:border-white/[0.14] transition-all duration-300 flex flex-col"
          >
            <div className="mb-8">
              <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-3">Stillum Free</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-white">₽0</span>
                <span className="text-white/30 text-[14px] mb-1">/ месяц</span>
              </div>
              <p className="text-[13px] text-white/30 mt-2">Начните без ограничений по времени.</p>
            </div>

            <div className="flex flex-col gap-3.5 flex-1">
              {FREE_FEATURES.map((f) => <FeatureRow key={f.label} {...f} />)}
            </div>

            <Link
              href="/login"
              className="mt-8 block text-center py-3 rounded-xl border border-white/[0.1] text-[13px] font-medium text-white/50 hover:text-white hover:border-white/20 transition-all duration-150"
            >
              Начать бесплатно
            </Link>
          </motion.div>

          {/* Plus */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative bg-white/[0.03] border border-white/[0.18] rounded-3xl p-8 hover:border-white/30 transition-all duration-300 flex flex-col"
            style={{ boxShadow: "0 0 60px rgba(255,255,255,0.03)" }}
          >
            <div className="absolute top-6 right-6 px-2.5 py-1 rounded-full bg-white/[0.07] border border-white/[0.1] text-[10px] tracking-widest uppercase text-white/50 font-bold">
              Popular
            </div>

            <div className="mb-8">
              <p className="text-[11px] uppercase tracking-widest text-white/50 font-medium mb-3">Stillum Plus</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-white">₽299</span>
                <span className="text-white/30 text-[14px] mb-1">/ месяц</span>
              </div>
              <p className="text-[13px] text-white/30 mt-2">Полный доступ ко всем возможностям.</p>
            </div>

            <div className="flex flex-col gap-3.5 flex-1">
              {PLUS_FEATURES.map((f) => <FeatureRow key={f.label} {...f} />)}
            </div>

            <Link
              href="/login"
              className="mt-8 block text-center py-3 rounded-xl bg-white text-[#030712] text-[13px] font-semibold hover:bg-white/90 active:scale-[0.99] transition-all duration-150"
            >
              Начать с Plus
            </Link>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
