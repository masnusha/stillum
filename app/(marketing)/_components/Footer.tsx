import Link from "next/link";
import { Twitter, Instagram, Youtube, Send } from "lucide-react";
import Logo from "@/components/ui/Logo";

const LINKS = [
  {
    heading: "Продукт",
    items: [
      { label: "Возможности",   href: "#features" },
      { label: "Тарифы Plus",   href: "#pricing"  },
      { label: "Для артистов",  href: "#features" },
      { label: "Web-приложение", href: "/login"   },
    ],
  },
  {
    heading: "Поддержка",
    items: [
      { label: "Вопросы и ответы",     href: "#faq"          },
      { label: "Написать в поддержку", href: "mailto:support@stillum.app" },
      { label: "Запросить функцию",    href: "mailto:feedback@stillum.app" },
    ],
  },
  {
    heading: "Юридическая информация",
    items: [
      { label: "Условия использования",       href: "/legal/terms"   },
      { label: "Политика конфиденциальности", href: "/legal/privacy" },
      { label: "Правообладателям (DMCA)",     href: "/legal/dmca"    },
      { label: "Файлы cookie",                href: "/legal/cookies" },
    ],
  },
];

const SOCIALS = [
  { icon: Twitter,   label: "Twitter"   },
  { icon: Instagram, label: "Instagram" },
  { icon: Youtube,   label: "YouTube"   },
  { icon: Send,      label: "Telegram"  },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#030712] pt-16 pb-8 px-6 md:px-12 text-white">

      {/* ── Top grid ── */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">

        {/* Slogan column */}
        <div className="col-span-2 md:col-span-1">
          <p className="text-white/30 text-sm leading-relaxed">
            Stillum. Искусство звучать свободно.
          </p>
        </div>

        {/* Link columns */}
        {LINKS.map((col) => (
          <div key={col.heading}>
            <p className="text-white font-semibold text-sm mb-4">{col.heading}</p>
            <ul className="space-y-3">
              {col.items.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-white/40 hover:text-white transition-colors text-sm block w-fit"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Bottom bar ── */}
      <div className="max-w-7xl mx-auto border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">

        {/* Socials */}
        <div className="flex items-center gap-5">
          {SOCIALS.map(({ icon: Icon, label }) => (
            <button key={label} type="button" aria-label={label}>
              <Icon className="w-5 h-5 text-white/30 hover:text-white transition-colors cursor-pointer" />
            </button>
          ))}
        </div>

        {/* Logo + wordmark */}
        <div className="flex items-center gap-2.5">
          <Logo className="h-5 w-auto" />
          <span className="font-neue text-[16px] font-medium tracking-[0.02em] text-white/40 mt-[1px]">
            Stillum
          </span>
        </div>

        {/* Copyright */}
        <p className="text-xs text-white/25">
          © {new Date().getFullYear()} Stillum. Все права защищены.
        </p>

      </div>
    </footer>
  );
}
