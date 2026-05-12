import { NavLink } from "react-router-dom";
import type { IconType } from "react-icons";

type MenuItemProps = {
  to: string;
  icon?: IconType;
  variant: "desktop" | "mobile";
  onClick?: () => void;
  children: React.ReactNode;
};

export function MenuItem({
  to,
  icon: Icon,
  variant,
  onClick,
  children,
}: MenuItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        variant === "desktop" ? desktopClass(isActive) : mobileClass(isActive)
      }
    >
      {({ isActive }) => (
        <>
          {variant === "mobile" && Icon && (
            <Icon
              className={`h-4 w-4 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted group-hover:text-primary"
              }`}
            />
          )}
          <span className="whitespace-nowrap">{children}</span>

          {variant === "desktop" && (
            <span
              className={`nav-underline whitespace-nowrap ${
                isActive ? "nav-underline-active" : ""
              }`}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

function desktopClass(isActive: boolean) {
  return `
    relative px-1 pb-1 font-heading text-base transition-colors
    ${isActive ? "text-emerald-200" : "text-indigo-100 hover:text-white"}
  `;
}

function mobileClass(isActive: boolean) {
  return `
    group flex items-center gap-3 px-4 py-2.5 rounded-lg
    text-base font-medium transition-colors
    ${
      isActive
        ? "bg-surface-3 text-primary"
        : "text-default hover:bg-surface-2 hover:text-primary"
    }
  `;
}
