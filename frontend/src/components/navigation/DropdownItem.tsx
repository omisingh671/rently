import { NavLink } from "react-router-dom";
import type { IconType } from "react-icons";
import { useDropdown } from "./Dropdown.context";

type DropdownItemProps = {
  to: string;
  icon?: IconType;
  children: React.ReactNode;
};

export function DropdownItem({ to, icon: Icon, children }: DropdownItemProps) {
  const { close } = useDropdown();

  return (
    <NavLink
      to={to}
      onClick={close}
      className={({ isActive }) =>
        `flex items-center gap-2 py-2 px-2 rounded text-sm transition-colors
         ${
           isActive
             ? "bg-indigo-800/80 text-white"
             : "text-indigo-100 hover:bg-indigo-800/30 hover:text-white"
         }`
      }
    >
      {({ isActive }) => (
        <>
          {Icon && (
            <Icon
              className={`h-4 w-4 ${
                isActive ? "text-white" : "text-indigo-300"
              }`}
            />
          )}
          <span>{children}</span>
        </>
      )}
    </NavLink>
  );
}
