import SessionProvider from "@/app/dashboard/_components/SessionProvider";

export default function GiftLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
