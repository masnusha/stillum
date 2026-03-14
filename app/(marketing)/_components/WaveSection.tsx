"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function WaveSection() {
  const ref = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 30, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 30, damping: 20 });

  // Blob 1 moves opposite to mouse, blob 2 follows
  const blob1X = useTransform(springX, [0, 1], ["-10%", "10%"]);
  const blob1Y = useTransform(springY, [0, 1], ["-8%",  "8%"]);
  const blob2X = useTransform(springX, [0, 1], ["8%",  "-8%"]);
  const blob2Y = useTransform(springY, [0, 1], ["6%",  "-6%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top)  / rect.height);
  };

  return (
    <section
      ref={ref}
      onMouseMove={handleMouseMove}
      className="relative py-40 px-6"
    >
      {/* Animated background blobs — local to this section's content */}
      <motion.div
        style={{ x: blob1X, y: blob1Y }}
        className="absolute top-1/4 left-1/4 w-[600px] h-[500px] rounded-full pointer-events-none"
        animate={{ scale: [1, 1.08, 1], rotate: [0, 8, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="w-full h-full rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: "radial-gradient(ellipse, #4f7af8 0%, transparent 70%)" }}
        />
      </motion.div>

      <motion.div
        style={{ x: blob2X, y: blob2Y }}
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[400px] rounded-full pointer-events-none"
        animate={{ scale: [1, 1.12, 1], rotate: [0, -10, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      >
        <div
          className="w-full h-full rounded-full opacity-[0.06] blur-[110px]"
          style={{ background: "radial-gradient(ellipse, #a855f7 0%, transparent 70%)" }}
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Local glow behind heading */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[150px] bg-white/[0.04] blur-[100px] rounded-full pointer-events-none -z-10" />
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[11px] uppercase tracking-widest text-white/25 font-medium mb-6"
        >
          Ваша коллекция
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-8"
        >
          Ваша коллекция без границ.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-white/40 leading-relaxed"
        >
          Загружайте собственные аудиофайлы, редкие записи и демки,
          чтобы слушать их с комфортом и без региональных ограничений.
          Всё, что вы загружаете — принадлежит только вам.
        </motion.p>
      </div>
    </section>
  );
}
