import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiImage } from "react-icons/fi";
import { API_BASE_URL } from "@/configs/appConfig";

export type SliderImage =
  | string
  | {
      src?: string;
      url?: string;
      caption?: string;
      altText?: string;
    };

export interface NormalizedSliderImage {
  src: string;
  caption?: string;
}

interface ImageSliderProps {
  images: SliderImage[];
  onImageClick?: (index: number) => void;
}

export const resolveImageUrl = (url: string) => {
  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  return url;
};

const DEFAULT_IMAGE = resolveImageUrl("/uploads/hah/building-placeholder.png");

export const normalizeSliderImages = (
  images: SliderImage[],
): NormalizedSliderImage[] => {
  const normalized = images
    .map((image) => {
      if (typeof image === "string") {
        return {
          src: resolveImageUrl(image),
        };
      }

      const rawSrc = image.url ?? image.src;
      if (!rawSrc) {
        return null;
      }

      const caption = image.caption ?? image.altText;

      return {
        src: resolveImageUrl(rawSrc),
        ...(caption !== undefined && { caption }),
      };
    })
    .filter((image): image is NormalizedSliderImage => image !== null);

  return normalized.length > 0 ? normalized : [{ src: DEFAULT_IMAGE }];
};

export const ImageSlider = ({ images, onImageClick }: ImageSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slides = normalizeSliderImages(images);

  useEffect(() => {
    if (currentIndex > slides.length - 1) {
      setCurrentIndex(0);
    }
  }, [currentIndex, slides.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative group w-full h-48 overflow-hidden rounded-xl bg-slate-100 border border-slate-100 shadow-inner">
      {/* Slides */}
      <img
        src={slides[currentIndex]?.src ?? DEFAULT_IMAGE}
        alt={slides[currentIndex]?.caption ?? `Room view ${currentIndex + 1}`}
        className={`w-full h-full object-cover transition-all duration-500 ease-out ${
          onImageClick ? "cursor-zoom-in" : ""
        }`}
        onClick={() => onImageClick?.(currentIndex)}
        onError={(e) => {
          (e.target as HTMLImageElement).src = DEFAULT_IMAGE;
        }}
      />

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-xs opacity-0 group-hover:opacity-100 transition duration-200 hover:bg-white active:scale-95"
            aria-label="Previous image"
          >
            <FiChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-xs opacity-0 group-hover:opacity-100 transition duration-200 hover:bg-white active:scale-95"
            aria-label="Next image"
          >
            <FiChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Image Count Indicator */}
      <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-xs tracking-wider">
        <FiImage className="h-3 w-3" />
        {currentIndex + 1}/{slides.length}
      </div>

      {/* Bottom Dot Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((slide, idx) => (
            <button
              key={`${slide.src}-${idx}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
