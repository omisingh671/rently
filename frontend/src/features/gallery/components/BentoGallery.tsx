"use client";

import { useState } from "react";
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

export default function BentoGallery() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  return (
    <section className="section bg-white">
      <div className="container">
        <div className="columns-2 md:columns-4 gap-4">
          {IMAGES.map((img, i) => (
            <button
              key={img.src}
              onClick={() => {
                setIndex(i);
                setVisible(true);
              }}
              className="group mb-4 block w-full break-inside-avoid relative overflow-hidden rounded-2xl bg-surface-3 focus:outline-none focus:ring-2 focus:ring-accent cursor-zoom-in"
            >
              <img
                src={img.src}
                alt={img.caption}
                loading="lazy"
                className="w-full h-auto object-cover transition-all duration-300 brightness-90 group-hover:brightness-100 group-hover:contrast-105  group-hover:saturate-105 group-hover:scale-[1.3]"
              />
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
