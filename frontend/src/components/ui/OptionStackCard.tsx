import { useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCheckCircle,
  FiChevronRight,
  FiSunrise,
  FiUsers,
  FiWind,
} from "react-icons/fi";
import type {
  AvailabilityComfortVariant,
  AvailabilityOption,
  ComfortOption,
} from "@/features/availability/domain";
import { OptionPricePanel } from "@/components/ui/OptionPricePanel";
import { ImageSlider } from "@/components/ui/ImageSlider";
import {
  normalizeSliderImages,
  type SliderImage,
} from "@/components/ui/imageSliderUtils";
import Lightbox, {
  type LightboxImage,
} from "@/components/ui/Lightbox/Lightbox";
import { OptionDetailsModal } from "@/components/ui/OptionDetailsModal";

interface OptionStackCardProps {
  option: AvailabilityOption;
  comfortVariants: AvailabilityComfortVariant[];
  selectedComfort: ComfortOption;
  onSelectComfort: (comfortOption: ComfortOption) => void;
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

const formatAllocation = (guestSplit: string) =>
  guestSplit.includes("+")
    ? `Allocated as ${guestSplit} guests`
    : `Allocated for ${guestSplit} guest${guestSplit === "1" ? "" : "s"}`;

export const OptionStackCard = ({
  option,
  comfortVariants,
  selectedComfort,
  onSelectComfort,
  onBook,
  isBooking,
  formatPrice,
}: OptionStackCardProps) => {
  const { propertyLabel } = option;
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
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="w-full md:w-56 md:shrink-0">
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

        <div className="min-w-0 flex-1">
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

          {propertyLabel && (
            <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900">
              {option.title}
            </h2>
          )}
          <p
            className={`${propertyLabel ? "mt-1 text-sm font-semibold text-slate-500" : "mt-3 text-lg font-bold leading-snug text-slate-900"}`}
          >
            {propertyLabel}
          </p>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <FiUsers className="shrink-0 text-slate-400" />
              <span className="font-semibold text-slate-700">
                Total capacity {option.totalCapacity} guests
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <FiBookOpen className="shrink-0 text-slate-400" />
              <span className="font-semibold text-slate-700">
                {formatAllocation(option.guestSplit)}
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

        <div className="flex w-full flex-col justify-between self-stretch md:w-72 md:shrink-0 md:border-l md:border-slate-100 md:pl-6">
          {comfortVariants.length > 1 && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {comfortVariants.map((variant) => (
                <button
                  key={variant.comfortOption}
                  type="button"
                  onClick={() => onSelectComfort(variant.comfortOption)}
                  className={`rounded-lg border px-2.5 py-2 text-left transition ${
                    selectedComfort === variant.comfortOption
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wide">
                    {variant.label}
                  </span>
                  <span className="mt-0.5 block text-xs font-bold">
                    {variant.priceLabel}
                  </span>
                </button>
              ))}
            </div>
          )}
          <OptionPricePanel
            option={option}
            formatPrice={formatPrice}
            totalClassName="text-indigo-600"
          />
          <div className="mt-4 md:mt-0">
            <button
              type="button"
              disabled={isBooking}
              onClick={() => onBook(option)}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.01] hover:bg-indigo-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBooking ? "Booking..." : "Continue"}
            </button>
          </div>
        </div>
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
