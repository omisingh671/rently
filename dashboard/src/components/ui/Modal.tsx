import { useEffect } from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;

  size?: ModalSize;

  disableBackdropClose?: boolean;
  disableEscapeClose?: boolean;
};

const SIZE_MAP: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-7xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  disableBackdropClose = false,
  disableEscapeClose = false,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disableEscapeClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, disableEscapeClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!disableBackdropClose) {
            onClose();
          }
        }}
      />

      {/* Modal */}
      <div
        className={`relative z-10 w-full ${SIZE_MAP[size]} rounded-lg bg-white p-6 shadow-xl`}
      >
        {title && (
          <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>
        )}

        {children}
      </div>
    </div>,
    document.body,
  );
}
