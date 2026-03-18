import { type ReactNode } from "react";
import { Outlet } from "react-router-dom";

interface LayoutContainerProps {
  sidebar: ReactNode;
}

export function LayoutContainer({ sidebar }: LayoutContainerProps) {
  return (
    <div className="h-screen w-screen grid grid-cols-[15%_1fr]">
      {/* Sidebar */}
      <aside>
        {sidebar}
      </aside>

      {/* Main Content */}
      <main className="p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
