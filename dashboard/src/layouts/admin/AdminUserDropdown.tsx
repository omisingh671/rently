import { useState, useRef, useEffect } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiKey,
  FiSettings,
  FiUser,
} from "react-icons/fi";

interface AdminUserDropdownProps {
  name: string;
  initials: string;
  onSettings?: () => void;
  onViewProfile?: () => void;
  onChangePassword?: () => void;
}

export default function AdminUserDropdown({
  name,
  initials,
  onSettings,
  onViewProfile,
  onChangePassword,
}: AdminUserDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-white hover:bg-[#3f4270]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-xs font-semibold text-black">
          {initials}
        </div>

        <span className="flex-1 text-left">{name}</span>

        {open ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="mt-2 rounded-md bg-[#44487a] p-2 shadow-lg">
          <button
            onClick={onSettings}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-[#50549a]"
          >
            <FiSettings size={15} />
            Settings
          </button>

          <button
            onClick={onViewProfile}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-[#50549a]"
          >
            <FiUser size={15} />
            View Profile
          </button>

          <button
            onClick={onChangePassword}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-[#50549a]"
          >
            <FiKey size={15} />
            Change Password
          </button>
        </div>
      )}
    </div>
  );
}
