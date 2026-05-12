import React from "react";
import Button from "@/components/ui/Button";
import { FiArrowRight } from "react-icons/fi";

import Lightbox, {
  type LightboxImage,
} from "@/components/ui/Lightbox/Lightbox";

const IMAGES: LightboxImage[] = [
  {
    src: "/assets/images/sucasa-homes/gallery/1.jpg",
    caption: "Bright living room with natural light.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/2.jpg",
    caption: "Warm and welcoming lobby area.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/3.jpg",
    caption: "Spacious apartment with modern finishes.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/4.jpg",
    caption: "Comfortable bedroom with premium furnishings.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/5.jpg",
    caption: "Elegant seating area for relaxation.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/6.jpg",
    caption: "Well-lit interiors with clean design.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/7.jpg",
    caption: "Thoughtfully designed common space.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/8.jpg",
    caption: "Minimal and calming room aesthetics.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/9.jpg",
    caption: "Fully furnished bedroom with storage.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/10.jpg",
    caption: "Modern dining area with ample space.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/11.jpg",
    caption: "Clean and airy apartment layout.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/12.jpg",
    caption: "Relaxing lounge with soft lighting.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/13.jpg",
    caption: "Functional workspace inside the apartment.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/14.jpg",
    caption: "Tastefully designed interiors throughout.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/15.jpg",
    caption: "Comfort-focused room arrangement.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/16.jpg",
    caption: "Open and uncluttered living area.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/17.jpg",
    caption: "Premium fittings and clean finishes.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/18.jpg",
    caption: "Inviting space ideal for long stays.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/19.jpg",
    caption: "Balanced lighting and neutral tones.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/20.jpg",
    caption: "Well-maintained and modern interiors.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/21.jpg",
    caption: "Comfortable shared living space.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/22.jpg",
    caption: "Designed for everyday convenience.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/23.jpg",
    caption: "Calm and relaxing bedroom setup.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/24.jpg",
    caption: "Simple, elegant, and functional design.",
  },
  {
    src: "/assets/images/sucasa-homes/gallery/25.jpg",
    caption: "A welcoming home-like environment.",
  },
];

const THUMBNAILS = IMAGES.slice(0, 4);

export default function Gallery() {
  const [visible, setVisible] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  function openAt(i: number) {
    setIndex(i);
    setVisible(true);
  }

  return (
    <section className="section bg-white">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 items-start justify-between gap-6">
          <div>
            <div className="kicker">Gallery</div>
            <h2 className="heading heading-lg mb-6">
              See Your Space Before You Book
            </h2>
            <p className="text-muted text-lg max-w-xl mb-8">
              Browse images of our apartments, common areas, and neighborhood to
              pick a place that fits your needs.
            </p>
          </div>

          <div className="sm:justify-self-end">
            <Button
              to="/gallery"
              variant="primary"
              size="md"
              outline
              iconRight={<FiArrowRight />}
              className="w-full sm:w-max sm:inline-flex"
            >
              View Full Gallery
            </Button>
          </div>
        </div>

        {/* Thumbnails */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {THUMBNAILS.map((img, i) => (
            <button
              key={`${img.src}-${i}`}
              onClick={() => openAt(i)}
              aria-label={`Open image ${i + 1}`}
              className="group relative overflow-hidden rounded-2xl focus:outline-none cursor-pointer"
              title={img.caption}
            >
              {/* Aspect-ratio wrapper to prevent CLS */}
              <div className="relative w-full aspect-4/3 bg-surface-3 rounded-2xl overflow-hidden">
                <img
                  src={img.src}
                  alt={img.caption ?? `Gallery ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {img.caption && (
                <div className="absolute bottom-0 hidden group-hover:block rounded-md bg-black/60 px-3 py-2 text-xs text-white backdrop-blur-sm text-left">
                  {img.caption}
                </div>
              )}

              {/* Optional "+ more" indicator */}
              {IMAGES.length > 4 && i === 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-lg font-semibold">
                  +{IMAGES.length - 4} more
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <Lightbox
        images={IMAGES}
        visible={visible}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setVisible(false)}
      />
    </section>
  );
}
