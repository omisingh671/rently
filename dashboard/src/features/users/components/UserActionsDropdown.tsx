import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiChevronDown,
  FiEdit2,
  FiLogOut,
  FiMail,
  FiShield,
} from "react-icons/fi";

import type { AdminUser } from "@/features/users/types";

export type PendingActionType = "password" | "reset" | "logout";

interface UserActionsDropdownProps {
  user: AdminUser;
  isPendingAction: (userId: string, type: PendingActionType) => boolean;
  onEdit: (user: AdminUser) => void;
  onSendResetLink: (user: AdminUser) => void;
  onToggleForcePasswordChange: (user: AdminUser) => void;
  onForceLogout: (user: AdminUser) => void;
}

function InlineSpinner() {
  return (
    <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export default function UserActionsDropdown({
  user,
  isPendingAction,
  onEdit,
  onSendResetLink,
  onToggleForcePasswordChange,
  onForceLogout,
}: UserActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isResetPending = isPendingAction(user.id, "reset");
  const isPasswordPending = isPendingAction(user.id, "password");
  const isLogoutPending = isPendingAction(user.id, "logout");
  const isAnyPending = isResetPending || isPasswordPending || isLogoutPending;

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeMenu = () => setOpen(false);

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [open]);

  const toggleOpen = () => {
    const nextOpen = !open;
    if (nextOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }

    setOpen(nextOpen);
  };

  const runAndClose = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div ref={ref} className="inline-flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        disabled={isAnyPending}
        onClick={toggleOpen}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isAnyPending ? <InlineSpinner /> : <FiShield />}
        Actions
        <FiChevronDown size={14} />
      </button>

      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: menuPosition.top, right: menuPosition.right }}
            className="fixed z-50 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => runAndClose(() => onEdit(user))}
            >
              <FiEdit2 />
              Edit User
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={isResetPending}
              className={itemClass}
              onClick={() => runAndClose(() => onSendResetLink(user))}
            >
              {isResetPending ? <InlineSpinner /> : <FiMail />}
              Send Reset Link
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={isPasswordPending}
              className={itemClass}
              onClick={() =>
                runAndClose(() => onToggleForcePasswordChange(user))
              }
            >
              {isPasswordPending ? <InlineSpinner /> : <FiShield />}
              {user.mustChangePassword
                ? "Clear Force Change Password"
                : "Force Change Password"}
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={isLogoutPending}
              className={`${itemClass} text-red-700 hover:bg-red-50`}
              onClick={() => runAndClose(() => onForceLogout(user))}
            >
              {isLogoutPending ? <InlineSpinner /> : <FiLogOut />}
              Force Logout
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
