import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown } from "react-icons/fi";
import { useLocation } from "react-router-dom";
import { DropdownContext } from "./Dropdown.context";

type DropdownDirection = "left" | "right";

type DropdownProps = {
  label: React.ReactNode;
  activeMatch?: string[];
  direction?: DropdownDirection;
  children: React.ReactNode;
};

export function Dropdown({
  label,
  activeMatch = [],
  direction = "left",
  children,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [pos, setPos] = useState({ left: 0, top: 0 });

  const location = useLocation();
  const isActive = activeMatch.some((p) => location.pathname.startsWith(p));

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();

    const left =
      direction === "right"
        ? triggerRect.right - menuRect.width
        : triggerRect.left;

    setPos({
      left: Math.max(8, left),
      top: triggerRect.bottom + 8,
    });
  }, [open, direction]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <DropdownContext.Provider value={{ close: () => setOpen(false) }}>
      <div ref={wrapperRef} className="relative inline-block">
        {/* Trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`relative px-1 pb-1 font-heading text-base inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
            isActive ? "text-emerald-200" : "text-indigo-100 hover:text-white"
          }`}
        >
          <span>{label}</span>

          <FiChevronDown
            className={`h-4 w-4 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />

          <span
            className={`nav-underline ${
              isActive ? "nav-underline-active" : ""
            }`}
          />
        </button>

        {/* Portalled menu */}
        {open &&
          createPortal(
            <div
              ref={menuRef}
              className="user-menu fixed z-1000"
              style={{
                left: pos.left,
                top: pos.top,
              }}
            >
              {children}
            </div>,
            document.body
          )}
      </div>
    </DropdownContext.Provider>
  );
}
