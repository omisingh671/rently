import { useLayoutEffect, useRef } from "react";

export default function useLockBodyScroll(locked: boolean) {
  const scrollYRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const body = document.body;
    if (!locked) {
      if (scrollYRef.current !== null) {
        const saved = scrollYRef.current;
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.overflow = "";
        window.scrollTo(0, saved);
        scrollYRef.current = null;
      }
      return;
    }

    const scrollY = window.scrollY || window.pageYOffset;
    scrollYRef.current = scrollY;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      if (scrollYRef.current !== null) {
        const saved = scrollYRef.current;
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.overflow = "";
        window.scrollTo(0, saved);
        scrollYRef.current = null;
      }
    };
  }, [locked]);
}
