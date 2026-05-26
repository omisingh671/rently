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

export const resolveImageUrl = (url: string) => {
  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  return url;
};

export const DEFAULT_SLIDER_IMAGE = resolveImageUrl(
  "/uploads/hah/building-placeholder.png",
);

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

  return normalized.length > 0 ? normalized : [{ src: DEFAULT_SLIDER_IMAGE }];
};
