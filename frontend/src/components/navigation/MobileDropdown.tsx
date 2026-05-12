import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";

type MobileDropdownProps = {
  id: string;
  label: string;
  activeMatch?: string[];
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

export function MobileDropdown({
  id,
  label,
  activeMatch = [],
  isOpen,
  onToggle,
  children,
}: MobileDropdownProps) {
  const location = useLocation();

  const isActive = useMemo(
    () => activeMatch.some((pattern) => location.pathname.startsWith(pattern)),
    [activeMatch, location.pathname]
  );

  const highlight = isOpen || isActive;

  return (
    <li className="space-y-1" id={id}>
      {/* Header button */}
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`
          w-full flex items-center justify-between
          px-4 py-2.5 text-base font-medium rounded-lg
          transition-colors duration-200
          ${
            highlight
              ? "bg-surface-2 text-primary"
              : "text-default hover:bg-surface-2"
          }
        `}
      >
        {label}

        <FiChevronDown
          className={`
            h-4 w-4 transition-transform duration-200
            ${isOpen ? "rotate-180" : ""}
            ${highlight ? "text-primary" : "text-muted"}
          `}
        />
      </button>

      {/* Collapsible content */}
      <div
        className={`
          overflow-hidden transition-[max-height] duration-300 ease-out
          ${isOpen ? "max-h-64" : "max-h-0"}
        `}
      >
        <div className="mt-1 rounded-xl bg-surface-2/60 px-2 py-2">
          <ul className="space-y-1">{children}</ul>
        </div>
      </div>
    </li>
  );
}
