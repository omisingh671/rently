import { NavLink } from "react-router-dom";

type MobileDropdownItemProps = {
  to: string;
  onClick?: () => void;
  children: React.ReactNode;
};

export function MobileDropdownItem({
  to,
  onClick,
  children,
}: MobileDropdownItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `
        flex items-center gap-2
        px-6 py-2.5 rounded-lg
        text-[0.95rem] font-medium
        transition-colors duration-150

        ${
          isActive
            ? "bg-indigo-50 text-indigo-700"
            : "text-default hover:bg-surface-2"
        }
      `}
    >
      {children}
    </NavLink>
  );
}
