import { useEffect, useRef } from "react";
import clsx from "clsx";
import {
  FiUser,
  FiCalendar,
  FiCreditCard,
  FiSettings,
  FiLogOut,
  FiLock,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/features/auth/hooks";

import type { AccountTab } from "@/pages/guest/account/AccountPage";

const MENU: {
  key: AccountTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "profile", label: "My Profile", icon: FiUser },
  { key: "bookings", label: "My Bookings", icon: FiCalendar },
  { key: "payments", label: "Payments", icon: FiCreditCard },
  { key: "settings", label: "Settings", icon: FiSettings },
  { key: "changePassword", label: "Change Password", icon: FiLock },
];

interface Props {
  activeTab: AccountTab;
  onChangeTab: (tab: AccountTab) => void;
}

export default function ProfileSidebar({ activeTab, onChangeTab }: Props) {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const index = MENU.findIndex((m) => m.key === activeTab);
    const activeEl = itemRefs.current[index];
    if (!activeEl) return;

    activeEl.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeTab]);

  const onLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      {/* User summary (desktop only) */}
      <div className="hidden lg:flex flex-col items-center text-center p-6 border-b border-gray-300">
        <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-semibold">
          {user?.fullName?.charAt(0) ?? "U"}
        </div>

        <div className="mt-3">
          <div className="font-semibold text-slate-900">
            {user?.fullName ?? "User"}
          </div>
          <div className="text-sm text-slate-500">{user?.email}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        ref={navRef}
        className={clsx(
          "flex lg:flex-col",
          "overflow-x-auto lg:overflow-y-auto",
          "touch-pan-x lg:touch-pan-y",
          "scroll-smooth",
          "px-2 lg:px-4 py-2 lg:py-6",
          "gap-2 lg:gap-0 lg:space-y-3",
        )}
      >
        {MENU.map(({ key, label, icon: Icon }, index) => {
          const isActive = activeTab === key;

          return (
            <button
              key={key}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              onClick={() => onChangeTab(key)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-indigo-400",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              <Icon className="text-lg shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout (desktop only) */}
      <div className="hidden lg:block border-t px-6 py-4 border-gray-300">
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutMutation.isPending}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
        >
          <FiLogOut className="text-lg" />
          {logoutMutation.isPending ? "Logging out…" : "Logout"}
        </button>
      </div>
    </aside>
  );
}
