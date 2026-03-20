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
      <div className="h-screen flex flex-col">
        <main className="p-6 overflow-auto flex-1">
          <Outlet />
        </main>
        <footer className="px-6 py-3 text-sm text-gray-500 border-t">
          Copy Rights to AG Soft Solutions
        </footer>
      </div>
    </div>
  );
}
