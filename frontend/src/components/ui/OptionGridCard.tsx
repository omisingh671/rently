import { useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCheckCircle,
  FiChevronRight,
  FiSunrise,
  FiUsers,
  FiWind,
} from "react-icons/fi";
import type { AvailabilityOption } from "@/features/availability/domain";
import { OptionPricePanel } from "@/components/ui/OptionPricePanel";
import { ImageSlider } from "@/components/ui/ImageSlider";
import {
  normalizeSliderImages,
  type SliderImage,
} from "@/components/ui/imageSliderUtils";
import Lightbox, { type LightboxImage } from "@/components/ui/Lightbox/Lightbox";
import { OptionDetailsModal } from "@/components/ui/OptionDetailsModal";

interface OptionGridCardProps {
  option: AvailabilityOption;
  onBook: (option: AvailabilityOption) => void;
  isBooking: boolean;
  formatPrice: (price: number) => string;
}

const getSliderImages = (option: AvailabilityOption): SliderImage[] =>
  option.images.length > 0 ? option.images : option.propertyImages;

const hasGalleryImages = (option: AvailabilityOption) =>
  option.images.length > 0 || option.propertyImages.length > 0;

const getLightboxImages = (images: SliderImage[]): LightboxImage[] =>
  images.length > 0
    ? normalizeSliderImages(images).map((image) => ({
        src: image.src,
        ...(image.caption !== undefined && { caption: image.caption }),
      }))
    : [];

export const OptionGridCard = ({
  option,
  onBook,
  isBooking,
  formatPrice,
}: OptionGridCardProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const sliderImages = useMemo(() => getSliderImages(option), [option]);
  const canOpenLightbox = hasGalleryImages(option);
  const lightboxImages = useMemo(
    () => getLightboxImages(sliderImages),
    [sliderImages],
  );

  return (
    <article className="flex min-h-[22rem] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
      <div className="mb-4">
        <ImageSlider
          images={sliderImages}
          onImageClick={
            canOpenLightbox
              ? (index) => {
                  setLightboxIndex(index);
                  setIsLightboxOpen(true);
                }
              : undefined
          }
        />
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <FiCheckCircle />
                {option.itemCount} item{option.itemCount === 1 ? "" : "s"}
              </div>

              <div
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                  option.comfortOption === "AC"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {option.comfortOption === "AC" ? <FiWind /> : <FiSunrise />}
                {option.comfortOption === "AC" ? "AC" : "Non-AC"}
              </div>
            </div>
            <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900">
              {option.title}
            </h2>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <FiUsers className="mt-0.5 shrink-0 text-slate-400" />
            <span className="block font-semibold text-slate-700">
              Fits up to {option.totalCapacity} guests
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <FiBookOpen className="mt-0.5 shrink-0 text-slate-400" />
            <span className="block font-semibold text-slate-700">
              {option.guestSplit} guest allocation
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDetailsOpen(true)}
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 transition hover:text-indigo-800"
        >
          View details & amenities
          <FiChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-3">
        <div className="mb-4">
          <OptionPricePanel option={option} formatPrice={formatPrice} />
        </div>

        <button
          type="button"
          disabled={isBooking}
          onClick={() => onBook(option)}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.01] hover:bg-indigo-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBooking ? "Booking..." : "Continue"}
        </button>
      </div>

      <Lightbox
        images={lightboxImages}
        visible={isLightboxOpen}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
      />

      <OptionDetailsModal
        option={option}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        formatPrice={formatPrice}
      />
    </article>
  );
};
