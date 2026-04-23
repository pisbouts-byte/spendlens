import { NavLink } from "react-router-dom";
import { bottomNavItems } from "./Sidebar.tsx";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white lg:hidden safe-bottom">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-brand-600"
                  : "text-gray-400 active:text-gray-600"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
