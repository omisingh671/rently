import { createContext, useContext } from "react";

type DropdownContextValue = {
  close: () => void;
};

export const DropdownContext = createContext<DropdownContextValue | null>(null);

export function useDropdown() {
  const ctx = useContext(DropdownContext);
  if (!ctx) {
    throw new Error("DropdownItem must be used inside Dropdown");
  }
  return ctx;
}
