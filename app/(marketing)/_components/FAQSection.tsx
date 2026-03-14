"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "Stillum — что это такое?",
    a: "Stillum — это приватное облачное пространство для вашей музыки. Загружайте собственные аудиофайлы, организуйте их в плейлисты и слушайте в любом месте. Никаких алгоритмов, никакой рекламы.",
  },
  {
    q: "Сколько стоит Stillum?",
    a: "Базовая версия Stillum полностью бесплатна. Stillum Plus доступен за ₽299 в месяц и открывает все возможности сервиса, включая прослушивание без рекламы и расширенное хранилище.",
  },
  {
    q: "Как пользоваться Stillum?",
    a: "Создайте аккаунт, загрузите свои аудиофайлы через простой drag-and-drop интерфейс, добавьте обложки и метаданные — и начните слушать. Всё интуитивно и без лишних шагов.",
  },
  {
    q: "Как отменить подписку?",
    a: "Вы можете отменить Stillum Plus в любой момент в настройках аккаунта. Доступ сохранится до конца оплаченного периода. Никаких скрытых комиссий и штрафов.",
  },
  {
    q: "Где можно слушать Stillum?",
    a: "Stillum работает в любом современном браузере на любом устройстве. Мобильные приложения для iOS и Android находятся в разработке.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/[0.07]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className={`text-[15px] font-medium transition-colors duration-150 leading-snug
          ${open ? "text-white" : "text-white/60 group-hover:text-white/85"}`}
        >
          {q}
        </span>
        <span className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200
          ${open ? "border-white/30 rotate-45" : "border-white/15 group-hover:border-white/25"}`}
        >
          <Plus size={11} strokeWidth={2} className="text-white/40" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-[14px] text-white/35 leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQSection() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-2xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[11px] uppercase tracking-widest text-white/25 font-medium mb-4">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Часто задаваемые вопросы.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {FAQS.map((item) => (
            <FAQItem key={item.q} {...item} />
          ))}
        </motion.div>

      </div>
    </section>
  );
}
