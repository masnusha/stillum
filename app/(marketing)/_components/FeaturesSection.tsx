"use client";

import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "Приватность прежде всего",
    desc:  "Делитесь загруженными треками с другими только если вы этого хотите. Ваша коллекция — только ваша.",
  },
  {
    title: "Музыка на первом месте",
    desc:  "Простой, интуитивный интерфейс без лишнего шума. Никаких рекомендаций, лент и социального давления.",
  },
  {
    title: "Независимость от лейблов",
    desc:  "Мы не зависим от правообладателей. Треки загружаются пользователями. Музыка принадлежит сообществу.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative text-center mb-20 z-10"
        >
          {/* Local glow behind heading */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[150px] bg-white/[0.04] blur-[100px] rounded-full pointer-events-none -z-10" />
          <p className="text-[11px] uppercase tracking-widest text-white/25 font-medium mb-4">Возможности</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight">
            Гораздо больше, чем
            <br />
            <span className="text-white/40">просто музыкальный сервис.</span>
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="relative grid md:grid-cols-3 gap-6 z-10">
          {/* Local glow behind cards grid */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[50%] bg-indigo-500/[0.02] blur-[120px] pointer-events-none -z-10 rounded-full" />
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group"
            >
              {/* Mock screenshot placeholder */}
              <div className="aspect-[4/3] bg-white/[0.025] rounded-2xl mb-6 border border-white/[0.06] overflow-hidden relative group-hover:border-white/[0.1] transition-colors duration-300">
                {/* Simulated UI chrome */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="absolute inset-0 flex flex-col gap-2 p-4 opacity-30">
                  <div className="h-1.5 w-2/3 rounded-full bg-white/20" />
                  <div className="h-1.5 w-1/2 rounded-full bg-white/10" />
                  <div className="flex-1 mt-3 rounded-xl bg-white/[0.04] border border-white/[0.06]" />
                  <div className="h-1.5 w-3/4 rounded-full bg-white/10" />
                  <div className="h-1.5 w-1/3 rounded-full bg-white/[0.07]" />
                </div>
              </div>

              <h3 className="text-[15px] font-semibold text-white mb-2 tracking-tight">
                {f.title}
              </h3>
              <p className="text-[13px] text-white/35 leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
