import { FiUser, FiMenu, FiLogIn } from "react-icons/fi";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";

import { useAuthStore } from "@/stores/authStore";

import { ROUTES } from "@/configs/routePaths";
import { MAIN_NAV, CTA_NAV } from "@/configs/navConfig";

import { MenuItem } from "@/components/navigation/MenuItem";
import MobileMenu from "./MobileMenu";

export type HeaderProps = {
  onLogout: () => Promise<void> | void;
  logoutPending?: boolean;
};

const logoSrc = "/assets/images/logo-main.png";

export default function Header({ onLogout, logoutPending }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="navbar bg-indigo-950/95 backdrop-blur-md border-b border-indigo-500/30 shadow-sm">
      <div className="container flex items-center justify-between py-3">
        {/* Left: Mobile Menu Button + Logo */}
        <div className="flex flex-none items-center gap-4">
          <button
            className="menu-button"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            title="Open menu"
          >
            <FiMenu className="h-5 w-5" />
          </button>

          <NavLink to={ROUTES.HOME} className="inline-flex items-center gap-3">
            <div className="h-16 rounded-md overflow-hidden">
              <img
                src={logoSrc}
                alt="Home Away from Home"
                className="w-full h-full object-contain"
              />
            </div>
          </NavLink>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 min-w-0">
          <div className="md:mx-4 flex-1 overflow-x-auto whitespace-nowrap h-14 flex items-center scrollbar-auto scrollbar-thin">
            <ul className="flex items-center gap-4 text-base font-heading">
              {MAIN_NAV.map((item) => (
                <MenuItem key={item.to} to={item.to} variant="desktop">
                  {item.label}
                </MenuItem>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-4 flex-none">
            {CTA_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`badge-nav ${
                  isActive(item.to) ? "badge-nav-active" : ""
                }`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Right: Auth Menu */}
        <nav className="ml-3">
          {user ? (
            <NavLink
              to={ROUTES.ACCOUNT}
              className={`badge-nav ${
                isActive(ROUTES.ACCOUNT) ? "badge-nav-active" : ""
              }`}
            >
              <FiUser className="h-5 w-5" />
            </NavLink>
          ) : (
            <NavLink
              to={ROUTES.LOGIN}
              className={`badge-nav ${
                isActive(ROUTES.LOGIN) ? "badge-nav-active" : ""
              }`}
            >
              <FiLogIn className="h-5 w-5 mr-1" />
            </NavLink>
          )}
        </nav>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        id="mobile-menu"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={onLogout}
        logoutPending={logoutPending}
        user={user}
      />
    </header>
  );
}
