"use client";

import Link from "next/link";
import { useScroll, useMotionValueEvent, motion } from "framer-motion";
import { useState } from "react";
import Logo from "@/components/ui/Logo";

export default function LandingHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 20));

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300
        backdrop-blur-2xl border-b
        ${scrolled
          ? "bg-[#030712]/80 border-white/[0.06]"
          : "bg-transparent border-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
          <Logo className="h-6 w-auto" />
          <span className="font-neue text-[19px] font-medium tracking-[0.02em] text-white mt-[1px] group-hover:text-white/80 transition-colors">
            Stillum
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#pricing"  className="text-[13px] text-white/50 hover:text-white transition-colors">Тарифы</a>
          <a href="#features" className="text-[13px] text-white/50 hover:text-white transition-colors">Возможности</a>
          <Link href="/login" className="text-[13px] text-white/50 hover:text-white transition-colors">Войти</Link>
        </nav>

        {/* CTA */}
        <Link
          href="/login"
          className="bg-white text-[#030712] text-[13px] font-semibold px-5 py-2 rounded-full hover:scale-105 hover:bg-white/90 active:scale-95 transition-all duration-150 select-none"
        >
          Присоединиться
        </Link>

      </div>
    </header>
  );
}
