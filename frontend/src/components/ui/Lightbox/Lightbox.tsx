import { useEffect, useRef } from "react";
import {
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
} from "react-icons/fi";

export type LightboxImage = {
  src: string;
  caption?: string;
};

type LightboxProps = {
  images: LightboxImage[];
  visible: boolean;
  index: number;
  onIndexChange: (nextIndex: number) => void;
  onClose: () => void;
  className?: string;
};

export default function Lightbox({
  images,
  visible,
  index,
  onIndexChange,
  onClose,
  className = "",
}: LightboxProps) {
  const count = images.length;
  const current = images[index];

  const thumbsRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* swipe start */
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  const minSwipeDistance = 50; // px

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const distance = touchStart.current - touchEnd.current;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0 && index < count - 1) {
        // Swipe Left → Next
        onIndexChange(index + 1);
      }
      if (distance < 0 && index > 0) {
        // Swipe Right → Prev
        onIndexChange(index - 1);
      }
    }
  };

  /* keyboard navigation start */
  useEffect(() => {
    if (!visible) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < count - 1) onIndexChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, index, count, onIndexChange, onClose]);

  /* lock background scroll */
  useEffect(() => {
    if (!visible) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [visible]);

  /* preload next/prev images  */
  useEffect(() => {
    if (!visible) return;
    const preload = (src?: string) => {
      if (!src) return;
      const img = new Image();
      img.src = src;
    };
    preload(images[index + 1]?.src);
    preload(images[index - 1]?.src);
  }, [visible, index, images]);

  /* auto-scroll thumbnail into view  */
  useEffect(() => {
    const el = thumbsRef.current;
    const thumb = thumbRefs.current[index];
    if (!el || !thumb) return;

    thumb.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index]);

  if (!visible || !current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery"
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 max-w-[1200px] w-[95%] md:w-[90%] lg:w-[80%]">
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close gallery"
          className="absolute top-4 right-4 z-20 rounded-md bg-white/90 p-2 shadow-md hover:opacity-95"
        >
          <FiX className="text-xl" />
        </button>

        {/* Prev */}
        <button
          onClick={() => index > 0 && onIndexChange(index - 1)}
          aria-label="Previous image"
          disabled={index === 0}
          className={`absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full p-2 shadow-md 
            ${
              index === 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-white/90 hover:opacity-95 cursor-pointer"
            }
          `}
        >
          <FiChevronLeft className="text-2xl" />
        </button>

        {/* Next */}
        <button
          onClick={() => index < count - 1 && onIndexChange(index + 1)}
          aria-label="Next image"
          disabled={index === count - 1}
          className={`absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full p-2 shadow-md 
            ${
              index === count - 1
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-white/90 hover:opacity-95 cursor-pointer"
            }
          `}
        >
          <FiChevronRight className="text-2xl" />
        </button>

        <div className="rounded-2xl bg-surface-2/50 p-4">
          <div
            className="flex items-center justify-center"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={current.src}
              alt={current.caption ?? `Gallery image ${index + 1}`}
              className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-lg select-none"
              draggable={false}
            />
          </div>

          {/* Info */}
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {index + 1} / {count}
              </div>

              <button
                onClick={() => window.open(current.src, "_blank")}
                className="flex items-center gap-1 text-sm underline text-slate-600 hover:text-emerald-300 cursor-pointer"
              >
                <FiExternalLink /> Open Original
              </button>
            </div>

            {current.caption && (
              <p className="text-sm text-slate-800 leading-snug">
                {current.caption}
              </p>
            )}
          </div>

          {/* Thumbnails */}
          <div
            ref={thumbsRef}
            className="mt-4 flex gap-2 overflow-x-auto pb-2 scroll-smooth snap-center scrollbar-thin"
          >
            {images.map((img, i) => (
              <button
                key={`${img.src}-${i}`}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                onClick={() => onIndexChange(i)}
                className={`shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                  i === index
                    ? "border-primary shadow-md"
                    : "border-transparent hover:border-surface-500/50"
                }`}
              >
                <img
                  src={img.src}
                  alt="Thumbnail"
                  className="h-8 md:h-16 w-12 md:w-28 object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
