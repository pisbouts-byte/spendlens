import { LogOut, Menu, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.ts";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="safe-top sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:h-16 lg:justify-end lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile brand */}
      <span className="text-lg font-bold text-brand-600 lg:hidden">SpendLens</span>

      {/* User actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="hidden items-center gap-2 text-sm text-gray-600 sm:flex">
          <User className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{user?.name || user?.email}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg p-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:px-3 lg:py-1.5"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden lg:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
