import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-out">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Drawer Content */}
        <div className="h-full overflow-y-auto pb-20">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
