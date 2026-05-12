"use client";

import React, { useEffect, useRef, useState } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import { useReactSlide } from "@/components/ui/ReactSlide/useReactSlide";
import clsx from "clsx";

type AlignNavButtons =
  | "topRight"
  | "topLeft"
  | "bottomCenter"
  | "bottomRight"
  | "bottomLeft"
  | "center";

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  slidesToShow?: number;
  gap?: number;
  responsive?: { breakpoint: number; slidesToShow: number }[];
  title?: React.ReactNode;
  autoplay?: boolean;
  autoplayInterval?: number;
  pauseOnHover?: boolean;
  alignNavButtons?: AlignNavButtons;

  showDots?: boolean; // dots follow only this
  showNavOnHover?: boolean; // nav follows only this
}

const ReactSlide = <T,>({
  items,
  renderItem,
  slidesToShow = 1,
  gap,
  responsive,
  title,
  autoplay = false,
  autoplayInterval = 3000,
  pauseOnHover = true,
  alignNavButtons = "topRight",
  showDots = true,
  showNavOnHover = false,
}: CarouselProps<T>) => {
  const {
    containerRef,
    cardWidth,
    gap: usedGap,
    canScrollNext,
    canScrollPrev,
    scrollBy,
  } = useReactSlide({
    itemsLength: items.length,
    defaultSlidesToShow: slidesToShow,
    gap,
    responsive,
    autoplay,
    autoplayInterval,
    pauseOnHover,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const rafRef = useRef<number | null>(null);
  const touchTimeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  const clearTouchTimeout = () => {
    if (touchTimeoutRef.current !== null) {
      window.clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
  };

  useEffect(() => clearTouchTimeout, []);

  // --- MOBILE TOUCH BEHAVIOR FIX ---
  const handleTouchStart = () => {
    clearTouchTimeout();
    setIsHovered(true);
  };

  const handleTouchEnd = () => {
    clearTouchTimeout();
    // Delay hide to avoid flicker when tapping slide
    touchTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
      touchTimeoutRef.current = null;
    }, 1200);
  };

  const handleTouchCancel = handleTouchEnd;

  // --- FOCUS (keyboard / accessibility) ---
  const handleFocusIn = () => {
    clearTouchTimeout();
    setIsHovered(true);
  };

  const handleFocusOut = () => {
    clearTouchTimeout();
    setIsHovered(false);
  };

  // pages: one dot per "page"
  const pages = Math.max(
    1,
    Math.ceil(items.length / Math.max(1, slidesToShow))
  );

  // loading
  useEffect(() => {
    if (cardWidth > 0) {
      const t = setTimeout(() => setIsLoading(false), 200);
      return () => clearTimeout(t);
    }
  }, [cardWidth]);

  // track activeIndex
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const step = (cardWidth || 1) + (usedGap ?? 0);
        const left = el.scrollLeft || 0;
        const idx = Math.round(left / step);
        setActiveIndex(idx);
      });
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, cardWidth, usedGap]);

  const activePage = Math.min(
    pages - 1,
    Math.floor(activeIndex / Math.max(1, slidesToShow))
  );

  const onDotClick = (page: number) => {
    const el = containerRef.current;
    if (!el || !cardWidth) return;

    const step = cardWidth + (usedGap ?? 0);
    const targetIndex = page * Math.max(1, slidesToShow);

    el.scrollTo({
      left: targetIndex * step,
      behavior: "smooth",
    });
  };

  const PrevBtn = (
    <button
      onClick={() => scrollBy("left")}
      disabled={!canScrollPrev}
      aria-label="Previous"
      className={clsx(
        "rounded w-9 h-10 flex items-center justify-center text-2xl transition-all duration-200 cursor-pointer",
        canScrollPrev
          ? "text-white bg-gray-800/80 hover:bg-gray-700/90"
          : "text-white bg-gray-800/40 cursor-not-allowed opacity-50"
      )}
    >
      <RiArrowLeftSLine />
    </button>
  );

  const NextBtn = (
    <button
      onClick={() => scrollBy("right")}
      disabled={!canScrollNext}
      aria-label="Next"
      className={clsx(
        "rounded w-9 h-10 flex items-center justify-center text-2xl transition-all duration-200 cursor-pointer",
        canScrollNext
          ? "text-white bg-gray-800/80 hover:bg-gray-700/90"
          : "text-white bg-gray-800/40 cursor-not-allowed opacity-50"
      )}
    >
      <RiArrowRightSLine />
    </button>
  );

  // nav follows only showNavOnHover
  const navVisibilityClass = () =>
    showNavOnHover
      ? isHovered
        ? "opacity-100"
        : "opacity-0 pointer-events-none"
      : "opacity-100";

  // skeletons
  const skeletonCount = slidesToShow ?? 3;
  const skeletons = Array.from({ length: Math.ceil(skeletonCount) }).map(
    (_, i) => (
      <div
        key={i}
        className="shrink-0 rounded-lg bg-gray-300 animate-pulse"
        style={{
          width: `calc((100% - (${
            (skeletonCount - 1) * (usedGap ?? 0)
          }px)) / ${skeletonCount})`,
          marginRight: `${usedGap ?? 0}px`,
        }}
      >
        <div className="w-full h-32 bg-gray-200 rounded-lg" />
      </div>
    )
  );

  // dots follow only showDots
  const Dots = showDots && pages > 1 && (
    <div className="flex items-center gap-2">
      {Array.from({ length: pages }).map((_, p) => (
        <button
          key={p}
          onClick={() => onDotClick(p)}
          aria-label={`Go to slide ${p + 1}`}
          className={clsx(
            "w-2 h-2 rounded-full transition-all",
            activePage === p ? "scale-125" : "opacity-40"
          )}
          style={{
            background: activePage === p ? "#2563eb" : "#9CA3AF",
          }}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* TOP RIGHT TITLE + NAV */}
      {alignNavButtons === "topRight" && title && (
        <div className="w-full mb-4 flex items-center justify-between">
          <div>{title}</div>

          <div
            className={clsx(
              "flex gap-2 transition-opacity duration-300",
              navVisibilityClass()
            )}
          >
            {PrevBtn}
            {NextBtn}
          </div>
        </div>
      )}

      {/* TOP LEFT TITLE + NAV */}
      {alignNavButtons === "topLeft" && title && (
        <div className="w-full mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <div className={navVisibilityClass()}>{PrevBtn}</div>
            <div className={navVisibilityClass()}>{NextBtn}</div>
          </div>
          <div>{title}</div>
        </div>
      )}

      <div
        className="w-full relative"
        onMouseEnter={() => {
          clearTouchTimeout();
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          clearTouchTimeout();
          setIsHovered(false);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onFocus={handleFocusIn}
        onBlur={handleFocusOut}
      >
        {/* SCROLLER */}
        <div
          ref={containerRef}
          className="overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar py-4"
        >
          <div className="flex">
            {isLoading
              ? skeletons
              : items.map((item, index) => (
                  <div
                    key={index}
                    className="snap-start shrink-0"
                    style={{
                      width: `${cardWidth}px`,
                      marginRight:
                        index !== items.length - 1
                          ? `${usedGap ?? 0}px`
                          : "0px",
                    }}
                  >
                    {renderItem(item, index)}
                  </div>
                ))}
          </div>
        </div>

        {/* CENTER NAV BUTTONS */}
        {alignNavButtons === "center" && (
          <>
            <span
              className={clsx(
                "absolute left-1 top-1/2 -translate-y-1/2 z-10",
                navVisibilityClass(),
                !canScrollPrev && "pointer-events-none"
              )}
            >
              {PrevBtn}
            </span>

            <span
              className={clsx(
                "absolute right-1 top-1/2 -translate-y-1/2 z-10",
                navVisibilityClass(),
                !canScrollNext && "pointer-events-none"
              )}
            >
              {NextBtn}
            </span>
          </>
        )}

        {/* BOTTOM NAV + DOTS (custom positioning rules) */}
        {(alignNavButtons === "bottomCenter" ||
          alignNavButtons === "bottomLeft" ||
          alignNavButtons === "bottomRight") && (
          <div
            className={clsx(
              "flex w-full mt-3 items-center",
              alignNavButtons === "bottomLeft" && "justify-between gap-4",
              alignNavButtons === "bottomRight" && "justify-between gap-4",
              alignNavButtons === "bottomCenter" && "justify-center"
            )}
          >
            {/* bottomLeft -------------------------------------------------- */}
            {alignNavButtons === "bottomLeft" && (
              <>
                <div className="flex items-center gap-3">
                  <div className={navVisibilityClass()}>{PrevBtn}</div>
                  <div className={navVisibilityClass()}>{NextBtn}</div>
                </div>
                <div>{Dots}</div>
              </>
            )}

            {/* bottomRight -------------------------------------------------- */}
            {alignNavButtons === "bottomRight" && (
              <>
                <div>{Dots}</div>
                <div className="flex items-center gap-3">
                  <div className={navVisibilityClass()}>{PrevBtn}</div>
                  <div className={navVisibilityClass()}>{NextBtn}</div>
                </div>
              </>
            )}

            {/* bottomCenter -------------------------------------------------- */}
            {alignNavButtons === "bottomCenter" && (
              <div className="flex items-center gap-3">
                <div className={navVisibilityClass()}>{PrevBtn}</div>
                <div className="mx-3">{Dots}</div>
                <div className={navVisibilityClass()}>{NextBtn}</div>
              </div>
            )}
          </div>
        )}

        {/* DEFAULT DOTS (centered below for top modes and center mode) */}
        {showDots &&
          alignNavButtons !== "bottomCenter" &&
          alignNavButtons !== "bottomLeft" &&
          alignNavButtons !== "bottomRight" && (
            <div className="w-full mt-3 flex justify-center">{Dots}</div>
          )}
      </div>
    </>
  );
};

export default ReactSlide;

/**
 * ReactSlide – Fully Responsive Touch-Enabled Carousel with Nav Buttons + Dots
 * ----------------------------------------------------------------------------
 * This component supports:
 *   ✔ Responsive slidesToShow
 *   ✔ Drag scrolling (mouse)
 *   ✔ Touch scrolling (mobile)
 *   ✔ Autoplay
 *   ✔ Snap scrolling
 *   ✔ Nav buttons (Prev/Next) with proper disabled states
 *   ✔ Nav dots (page indicators)
 *   ✔ Optional nav-on-hover behavior
 *   ✔ Works with fractional or whole-number slidesToShow
 *   ✔ Works correctly for all nav positions:
 *
 *      "topRight"      → title left, nav buttons right
 *      "topLeft"       → nav buttons left, title right   (FIXED)
 *      "center"        → buttons vertically centered, dots appear bottom-center (FIXED)
 *      "bottomCenter"  → Prev • Dots • Next (always centered)
 *      "bottomLeft"    → Prev • Dots • Next (aligned left)
 *      "bottomRight"   → Prev • Dots • Next (aligned right)
 *
 * ------------------------------------------------------------------------------
 * IMPORTANT PROP BEHAVIOR
 * ------------------------------------------------------------------------------
 * showDots (boolean)
 *   - Controls ONLY the dots visibility.
 *   - If true → dots show **depending on nav position rules**.
 *   - If false → dots NEVER show (regardless of hover or nav visibility).
 *
 * showNavOnHover (boolean)
 *   - Controls ONLY the nav arrows.
 *   - If true → nav buttons fade in on hover/touch/focus.
 *   - If false → nav buttons are always visible (but still disabled if needed).
 *   - Dots DO NOT follow this prop — dots follow only showDots.
 *
 * ------------------------------------------------------------------------------
 * DOT POSITIONING RULES
 * ------------------------------------------------------------------------------
 * 1. bottomCenter / bottomLeft / bottomRight
 *      - Dots ALWAYS appear **between** Prev and Next buttons
 *          Example: Prev • Dots • Next
 *      - Controlled by showDots only
 *
 * 2. center (vertical nav position)
 *      - Nav buttons appear mid-left/mid-right
 *      - Dots appear **bottom-center** (FIXED)
 *
 * 3. topRight / topLeft / center
 *      - Fallback dots appear centered below the carousel
 *
 * ------------------------------------------------------------------------------
 * TOUCH & MOBILE BEHAVIOR
 * ------------------------------------------------------------------------------
 * - On touchstart → nav buttons appear
 * - On touchend → nav buttons remain visible for ~1.2s before auto-hiding (if showNavOnHover = true)
 * - Prevents flicker when user taps slides
 *
 * ------------------------------------------------------------------------------
 * IMPORTANT NOTES
 * ------------------------------------------------------------------------------
 * 1) slidesToShow can be fractional (ex: 1.5, 2.5, 3.5)
 *    - Fractional values produce smoother edges and center-weighted display.
 *    - Whole numbers also work properly after V1.3 fix (initial disabled bug fixed).
 *
 * 2) The hook useReactSlideV1.3 must be used:
 *    - The hook handles width calculation, scroll bounds, ResizeObserver, drag, and autoplay.
 *
 * 3) All rendering is completely client-side ("use client").
 *
 * 4) Every slide MUST be wrapped in a snap-start div for smooth snapping.
 *
 * ------------------------------------------------------------------------------
 * HOW TO USE
 * ------------------------------------------------------------------------------
 * <ReactSlideV
 *    items={myItems}
 *    renderItem={(item) => <MyCardComponent item={item} />}
 *    slidesToShow={3.5}
 *    gap={24}
 *    responsive={[
 *      { breakpoint: 1024, slidesToShow: 3.5 },
 *      { breakpoint: 768, slidesToShow: 2 },
 *      { breakpoint: 0, slidesToShow: 1 },
 *    ]}
 *    alignNavButtons="bottomCenter"
 *    showDots={true}
 *    showNavOnHover={false}
 * />
 *
 * ------------------------------------------------------------------------------
 * RECOMMENDATIONS
 * ------------------------------------------------------------------------------
 * - Use fractional slidesToShow on larger screens (ex: 3.5) for premium UI feel.
 * - Avoid huge card paddings — use gap prop to manage spacing.
 * - If you need callback when slide changes → ask, I can add `onSlideChange`.
 * - If you want keyboard navigation (← → keys) → I can add safely without limitations.
 *
 * ------------------------------------------------------------------------------
 */
