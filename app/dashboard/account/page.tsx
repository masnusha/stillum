import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import {
  User,
  CreditCard,
  MonitorSmartphone,
  Download,
  Receipt,
  Wallet,
  LifeBuoy,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import UserMenu from "@/app/dashboard/_components/UserMenu";

export const dynamic = "force-dynamic";

// ─── SettingRow ───────────────────────────────────────────────────────────────

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
}

function SettingRow({ icon, label, description }: SettingRowProps) {
  return (
    <div className="border-b border-white/5 py-4 flex items-center justify-between group cursor-pointer hover:bg-white/[0.01] px-2 -mx-2 rounded-lg transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0 text-white/30 group-hover:text-white/50 group-hover:border-white/10 transition-colors">
          {icon}
        </div>
        <div>
          <p className="text-[13px] font-medium text-white/70 group-hover:text-white/90 transition-colors">
            {label}
          </p>
          <p className="text-xs text-white/30 mt-0.5">{description}</p>
        </div>
      </div>
      <ChevronRight
        size={15}
        strokeWidth={1.5}
        className="text-white/20 group-hover:text-white/50 transition-colors shrink-0"
      />
    </div>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-white mb-2 mt-10">{children}</h2>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col h-full min-h-full">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <h1 className="text-[15px] font-semibold text-white tracking-tight">Аккаунт</h1>
        <UserMenu />
      </header>

    <div className="max-w-4xl mx-auto w-full pt-10 pb-24 px-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <h1 className="text-3xl font-bold text-white mb-10">Обзор аккаунта</h1>

      {/* ── Plan cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">

        {/* Current plan */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
          <p className="text-sm text-white/50 mb-2">Ваш тариф</p>
          <p className="text-2xl font-bold text-white mb-5">Stillum Base</p>
          <ul className="space-y-2.5">
            {[
              "Стандартное качество (320 kbps)",
              "Публикация треков",
              "Персональная библиотека",
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-2.5 text-[13px] text-white/50">
                <CheckCircle2
                  size={14}
                  strokeWidth={1.5}
                  className="text-white/20 shrink-0"
                />
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* Stillum Plus promo */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden group">
          {/* Glow blob */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} strokeWidth={1.5} className="text-indigo-300/70" />
            <p className="text-2xl font-bold text-white">Stillum Plus</p>
          </div>
          <p className="text-sm text-white/50 leading-relaxed">
            Lossless качество, расширенная статистика и эксклюзивные функции.
          </p>
          <ul className="mt-4 space-y-2.5 mb-6">
            {[
              "Lossless / Hi-Res Audio (FLAC)",
              "Расширенная аналитика треков",
              "Приоритетная поддержка",
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-2.5 text-[13px] text-white/60">
                <CheckCircle2
                  size={14}
                  strokeWidth={1.5}
                  className="text-indigo-400/60 shrink-0"
                />
                {feat}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:scale-105 active:scale-[0.98] transition-transform"
          >
            Перейти на Plus
          </button>
        </div>
      </div>

      {/* ── Section: Аккаунт ──────────────────────────────────────────────── */}
      <SectionTitle>Аккаунт</SectionTitle>
      <div>
        <SettingRow
          icon={<User size={16} strokeWidth={1.5} />}
          label="Личная информация"
          description="Email, пароль, связанные аккаунты"
        />
        <SettingRow
          icon={<CreditCard size={16} strokeWidth={1.5} />}
          label="Управление подпиской"
          description="Изменение или отмена тарифа"
        />
      </div>

      {/* ── Section: Безопасность и данные ────────────────────────────────── */}
      <SectionTitle>Безопасность и данные</SectionTitle>
      <div>
        <SettingRow
          icon={<MonitorSmartphone size={16} strokeWidth={1.5} />}
          label="Активные сессии"
          description="Устройства, с которых выполнен вход"
        />
        <SettingRow
          icon={<Download size={16} strokeWidth={1.5} />}
          label="Скачать мои данные"
          description="Получить архив с вашими треками и информацией"
        />
      </div>

      {/* ── Section: Оплата ───────────────────────────────────────────────── */}
      <SectionTitle>Оплата</SectionTitle>
      <div>
        <SettingRow
          icon={<Receipt size={16} strokeWidth={1.5} />}
          label="История покупок"
          description="Просмотр прошлых транзакций"
        />
        <SettingRow
          icon={<Wallet size={16} strokeWidth={1.5} />}
          label="Способы оплаты"
          description="Привязанные карты и методы оплаты"
        />
      </div>

      {/* ── Section: Помощь ───────────────────────────────────────────────── */}
      <SectionTitle>Помощь</SectionTitle>
      <div>
        <SettingRow
          icon={<LifeBuoy size={16} strokeWidth={1.5} />}
          label="Служба поддержки"
          description="Связаться с командой Stillum"
        />
      </div>

    </div>
    </div>
  );
}
