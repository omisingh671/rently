import { useEffect, useRef, useState, useCallback } from "react";

interface Responsive {
  breakpoint: number;
  slidesToShow: number;
}

export function useReactSlide({
  defaultSlidesToShow = 3.5,
  gap = 16,
  responsive = [],
  autoplay = false,
  autoplayInterval = 3000,
  pauseOnHover = true,
}: {
  itemsLength: number;
  defaultSlidesToShow?: number;
  gap?: number;
  responsive?: Responsive[];
  autoplay?: boolean;
  autoplayInterval?: number;
  pauseOnHover?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleSlides, setVisibleSlides] = useState(defaultSlidesToShow);
  const [cardWidth, setCardWidth] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoveringRef = useRef(false);

  const updateCanScrollButtons = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, offsetWidth } = el;
    setCanScrollPrev(scrollLeft > 0);
    setCanScrollNext(scrollLeft + offsetWidth + 1 < scrollWidth);
  }, []);

  // Responsive visible slides
  useEffect(() => {
    const updateVisibleSlides = () => {
      const width = window.innerWidth;
      const sorted = [...responsive].sort(
        (a, b) => b.breakpoint - a.breakpoint
      );
      const matched = sorted.find((r) => width >= r.breakpoint);
      setVisibleSlides(matched ? matched.slidesToShow : defaultSlidesToShow);
    };

    updateVisibleSlides();
    window.addEventListener("resize", updateVisibleSlides);
    return () => window.removeEventListener("resize", updateVisibleSlides);
  }, [responsive, defaultSlidesToShow]);

  // Calculate card width and update scroll state (improved timing + ResizeObserver)
  useEffect(() => {
    const calculateWidth = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const totalGap = (visibleSlides - 1) * gap;
      setCardWidth((containerWidth - totalGap) / visibleSlides);
    };

    // run initial calculation
    calculateWidth();

    // schedule updateCanScrollButtons after layout is stable
    let rafId: number | null = null;
    let timeoutId: number | null = null;
    rafId = requestAnimationFrame(() => {
      updateCanScrollButtons();
      // small fallback in case of late layout shifts (images/fonts)
      timeoutId = window.setTimeout(() => updateCanScrollButtons(), 50);
    });

    // Use ResizeObserver when available to react to container/content size changes
    let ro: ResizeObserver | null = null;
    const observedContainer = containerRef.current;

    if (observedContainer && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        calculateWidth();
        // ensure we update after the layout change
        requestAnimationFrame(() => updateCanScrollButtons());
      });
      ro.observe(observedContainer);
    } else {
      // fallback - also keep window resize to recalc width
      window.addEventListener("resize", calculateWidth);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", calculateWidth);
    };
  }, [visibleSlides, gap, updateCanScrollButtons]);

  // Scroll event listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateCanScrollButtons);
    updateCanScrollButtons();

    return () => el.removeEventListener("scroll", updateCanScrollButtons);
  }, [cardWidth, updateCanScrollButtons]);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;

    const distance = Math.floor(visibleSlides) * (cardWidth + gap);
    el.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth",
    });

    // Update after scroll animation
    setTimeout(updateCanScrollButtons, 400);
  }, [cardWidth, gap, updateCanScrollButtons, visibleSlides]);

  // Autoplay
  const startAutoplay = useCallback(() => {
    if (!autoplay || autoplayRef.current || !containerRef.current) return;

    autoplayRef.current = setInterval(() => {
      const el = containerRef.current;
      if (!el || isHoveringRef.current) return;

      const { scrollLeft, scrollWidth, offsetWidth } = el;
      const isAtEnd = scrollLeft + offsetWidth + 1 >= scrollWidth;

      if (isAtEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollBy("right");
      }
    }, autoplayInterval);
  }, [autoplay, autoplayInterval, scrollBy]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  // Pause on hover
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !pauseOnHover) return;

    const handleMouseEnter = () => (isHoveringRef.current = true);
    const handleMouseLeave = () => (isHoveringRef.current = false);

    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [pauseOnHover]);

  // Drag support
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      el.classList.add("dragging");
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const onMouseUp = () => {
      isDown = false;
      el.classList.remove("dragging");
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseleave", onMouseUp);
    el.addEventListener("mousemove", onMouseMove);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mouseleave", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return {
    containerRef,
    cardWidth,
    gap,
    canScrollNext,
    canScrollPrev,
    scrollBy,
    startAutoplay,
    stopAutoplay,
  };
}
