"use client";

import { usePlayerStore } from "@/store/usePlayerStore";

export default function MainContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const isSidebarOpen = usePlayerStore((s) => s.isSidebarOpen);
  const sidebarWidth  = usePlayerStore((s) => s.sidebarWidth);
  const isResizing    = usePlayerStore((s) => s.isResizing);

  return (
    <main
      // Disable margin transition while the user is dragging — prevents
      // the "rubber band" lag where the content trails behind the handle.
      className={`flex-1 flex flex-col overflow-y-auto pb-[72px] relative
        ${isResizing ? "" : "transition-[margin] duration-300 ease-in-out"}`}
      style={{ marginRight: isSidebarOpen ? `${sidebarWidth}px` : "0px" }}
    >
      {children}
    </main>
  );
}
