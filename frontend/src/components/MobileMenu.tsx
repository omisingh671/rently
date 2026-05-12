import ReactDOM from "react-dom";
import { NavLink } from "react-router-dom";

import type { AuthUser } from "@/features/auth/types";
import useLockBodyScroll from "@/hooks/useLockBodyScroll";
import { useMobileDropdowns } from "@/hooks/useMobileDropdowns";

import { FiX, FiLogOut } from "react-icons/fi";

import { MenuItem } from "@/components/navigation/MenuItem";
import { MobileDropdown } from "@/components/navigation/MobileDropdown";
import { MobileDropdownItem } from "@/components/navigation/MobileDropdownItem";

import { MAIN_NAV, CTA_NAV, LEGAL_NAV, ACCOUNT_NAV } from "@/configs/navConfig";
import { ROUTES } from "@/configs/routePaths";

type MobileMenuProps = {
  id?: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
  logoutPending?: boolean;
  user?: AuthUser | null;
};

const logoSrc = "/assets/images/logo-mobile.png";

export default function MobileMenu({
  id,
  open,
  onClose,
  onLogout,
  logoutPending,
  user,
}: MobileMenuProps) {
  useLockBodyScroll(open);

  // Dropdown controller
  const dropdowns = useMobileDropdowns();

  // Close mobile menu
  const closeMenu = (extra?: () => void) => {
    dropdowns.reset(); // essential
    if (extra) extra();
    onClose();
  };

  if (typeof document === "undefined") return null;

  const overlayClass = `fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${
    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
  }`;

  const panelClass = `fixed top-0 left-0 h-full w-80 max-w-[80vw] bg-surface-1 border-r border-default/50 shadow-xl z-50 transform transition-transform duration-300 ease-out ${
    open ? "translate-x-0" : "-translate-x-full"
  }`;

  const SettingsItem = (
    <li
      onClick={() => closeMenu()}
      className="px-6 py-2.5 rounded-lg text-[0.95rem] font-medium text-default hover:bg-surface-2 transition-colors cursor-pointer"
    >
      Settings
    </li>
  );

  const content = (
    <>
      <div className={overlayClass} onClick={onClose} />

      <aside id={id} className={panelClass}>
        <div className="p-4 pb-0 h-full flex flex-col">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-default/10 pb-4 mb-4">
            <NavLink
              to={ROUTES.HOME}
              onClick={() => closeMenu()}
              className="flex items-center gap-3"
            >
              <div className="h-16 rounded-md overflow-hidden">
                <img
                  src={logoSrc}
                  alt="Home Away from Home"
                  className="w-full h-full object-cover"
                />
              </div>
            </NavLink>

            <button
              onClick={onClose}
              aria-label="Close menu"
              className="
                w-8 h-8 rounded-full border border-default/10
                bg-surface-2 hover:bg-surface-3 inline-flex items-center justify-center
              "
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 overflow-auto">
            <ul className="space-y-2">
              {/* MAIN NAV */}
              {MAIN_NAV.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.to}>
                    <MenuItem
                      to={item.to}
                      variant="mobile"
                      onClick={() => closeMenu()}
                    >
                      <span className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4" />}
                        {item.label}
                      </span>
                    </MenuItem>
                  </li>
                );
              })}

              {/* MORE DROPDOWN */}
              {(() => {
                const id = "more";
                const matchPaths = [ROUTES.ACCOUNT, ROUTES.BOOKINGS];
                const isOpen = dropdowns.isOpen(id, matchPaths);

                return (
                  <MobileDropdown
                    id={id}
                    label="More"
                    activeMatch={matchPaths}
                    isOpen={isOpen}
                    onToggle={() => dropdowns.toggle(id, matchPaths)}
                  >
                    {SettingsItem}

                    {user &&
                      ACCOUNT_NAV.map((item) => {
                        const Icon = item.icon;

                        return (
                          <MobileDropdownItem
                            key={item.to}
                            to={item.to}
                            onClick={() => closeMenu()}
                          >
                            {Icon && <Icon className="h-4 w-4" />}
                            {item.label}
                          </MobileDropdownItem>
                        );
                      })}
                  </MobileDropdown>
                );
              })()}

              {/* CTA NAV */}
              {CTA_NAV.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => closeMenu()}
                    className={({ isActive }) =>
                      `
                      flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold transition-colors
                      ${
                        item.label === "Book Now"
                          ? isActive
                            ? "bg-indigo-200/75 text-indigo-700"
                            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          : item.label === "Contact"
                            ? isActive
                              ? "bg-amber-200/75 text-amber-700"
                              : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                            : isActive
                              ? "bg-surface-3 text-primary"
                              : "bg-surface-2 text-default hover:bg-surface-3"
                      }
                      `
                    }
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </ul>

            {/* AUTH */}
            <div className="mt-5 border-t border-default/10 pt-4">
              {user ? (
                <button
                  onClick={() => closeMenu(() => onLogout())}
                  disabled={logoutPending}
                  className="
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                    text-base font-semibold bg-red-50 text-red-500
                    hover:bg-red-200/50 disabled:opacity-60
                  "
                >
                  <FiLogOut className="h-4 w-4" />
                  {logoutPending ? "Logging out..." : "Logout"}
                </button>
              ) : (
                <NavLink
                  to={ROUTES.LOGIN}
                  onClick={() => closeMenu()}
                  className="
                    flex items-center gap-3 px-4 py-2.5 rounded-lg
                    text-base font-semibold bg-green-100 text-green-600
                    hover:bg-green-500/20
                  "
                >
                  <FiLogOut className="h-4 w-4" />
                  Login
                </NavLink>
              )}
            </div>
          </nav>

          {/* LEGAL */}
          <div className="mt-4 border-t border-default/10 pt-3 text-xs text-muted">
            <div className="flex items-center gap-3">
              {LEGAL_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => closeMenu()}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* FOOTER */}
          <div className="-mx-4 mt-4 p-3 text-xs text-slate-300 bg-slate-800">
            © {new Date().getFullYear()} Home Away from Home
          </div>
        </div>
      </aside>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}
