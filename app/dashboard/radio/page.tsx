import UserMenu from "@/app/dashboard/_components/UserMenu";

export const dynamic = "force-dynamic";

export default function RadioPage() {
  return (
    <div className="flex flex-col h-full min-h-full">
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] shrink-0">
        <h1 className="text-[15px] font-semibold text-white tracking-tight">Радио</h1>
        <UserMenu />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-white mb-2">Радио</h2>
        <p className="text-sm text-white/40 max-w-md leading-relaxed">
          Этот раздел находится в разработке. Скоро здесь появится много новой музыки.
        </p>
      </div>
    </div>
  );
}
