import { useLocation } from "react-router-dom";
import { useState } from "react";

export function useMobileDropdowns() {
  const location = useLocation();

  // Track open and closed states per dropdown
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  // Utility: check if pathname matches any sub-path
  const pathStartsWith = (patterns: string[]) =>
    patterns.some((p) => location.pathname.startsWith(p));

  // Compute final open state per dropdown
  const isOpen = (id: string, patterns: string[]) => {
    const userOpen = opened[id] === true;
    const userClosed = closed[id] === true;
    const active = pathStartsWith(patterns);

    if (userOpen) return true;
    if (userClosed) return false;

    return active;
  };

  // Toggle user open/close state
  const toggle = (id: string, patterns: string[]) => {
    const currentlyOpen = isOpen(id, patterns);

    if (currentlyOpen) {
      // User closes dropdown
      setOpened((prev) => ({ ...prev, [id]: false }));
      setClosed((prev) => ({ ...prev, [id]: true }));
    } else {
      // User opens dropdown
      setOpened((prev) => ({ ...prev, [id]: true }));
      setClosed((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Reset all dropdown states (called when menu closes)
  const reset = () => {
    setOpened({});
    setClosed({});
  };

  return {
    isOpen,
    toggle,
    reset,
  };
}
