import { Link } from "react-router-dom";
import { FiMenu, FiSettings } from "react-icons/fi";
import AdminNotifications from "./AdminNotifications";
import { adminPath, ADMIN_ROUTES } from "@/configs/routePathsAdmin";

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export default function AdminHeader({
  title,
  subtitle,
  onMenuClick,
}: AdminHeaderProps) {
  return (
    <header className="flex h-20 items-center justify-between px-4 md:px-6 border-b bg-[#33365b] text-white border-[#45497a] md:bg-white md:text-slate-900 md:border-slate-100">
      <div className="flex items-center gap-3">
        {/* Hamburger (mobile only) */}
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-white hover:bg-[#3f4270] md:text-slate-600 md:hover:bg-slate-100 md:hidden"
        >
          <FiMenu size={20} />
        </button>

        {/* Mobile brand ONLY */}
        <div className="md:hidden leading-tight">
          <h1 className="text-base font-semibold text-white">Admin Panel</h1>
          <p className="text-xs text-white/70">Sucasa Homes</p>
        </div>

        {/* Desktop page title ONLY */}
        <div className="hidden md:block">
          {title && (
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
              {title}
            </h2>
          )}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 text-white md:text-slate-600">
        <Link
          to={adminPath(ADMIN_ROUTES.SETTINGS)}
          aria-label="Open settings"
          title="Settings"
          className="rounded-md p-2 transition hover:bg-[#3f4270] md:hover:bg-slate-100"
        >
          <FiSettings size={20} />
        </Link>
        <AdminNotifications />
      </div>
    </header>
  );
}
