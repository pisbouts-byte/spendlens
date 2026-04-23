import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.tsx";
import { Header } from "./Header.tsx";
import { BottomNav } from "./BottomNav.tsx";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {/* Main content: offset on desktop for sidebar, full-width on mobile */}
      <div className="lg:ml-64">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="px-4 py-4 pb-20 lg:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>
      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
