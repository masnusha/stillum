"use client";

import Link from "next/link";
import { useScroll, useMotionValueEvent, AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";

export default function StickyBanner() {
  const { scrollY } = useScroll();
  const [visible,   setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    if (!dismissed) setVisible(y > 500);
  });

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{    y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg px-4"
        >
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#111318]/90 backdrop-blur-2xl border border-white/[0.1] shadow-2xl">
            <Sparkles size={15} strokeWidth={1.5} className="text-white/50 shrink-0" />
            <p className="flex-1 text-[13px] text-white/70 leading-snug">
              Создайте бесплатный аккаунт и получите преимущества Stillum.
            </p>
            <Link
              href="/login"
              className="shrink-0 bg-white text-[#030712] text-[12px] font-semibold px-4 py-1.5 rounded-full hover:bg-white/90 transition-all duration-150 whitespace-nowrap"
            >
              Начать
            </Link>
            <button
              type="button"
              onClick={() => { setDismissed(true); setVisible(false); }}
              aria-label="Закрыть"
              className="text-white/20 hover:text-white/60 transition-colors shrink-0"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
