import {
  FiTv,
  FiCoffee,
  FiGrid,
  FiMoon,
  FiDroplet,
  FiWind,
} from "react-icons/fi";

import CardSplit from "@/components/ui/ApartmentCard/Card";
const imgBase = "/assets/images/sucasa-homes/";
const features = [
  {
    id: "living",
    icon: FiTv,
    title: "Living Room",
    subtitle: "With Sofa & TV",
    description:
      "Comfortable shared living space with sofa seating and television for relaxation and entertainment.",
    image: imgBase + "living-area.jpg",
    imageSide: "left" as const,
  },
  {
    id: "dining",
    icon: FiCoffee,
    title: "Dining Space",
    subtitle: "For 4-6 Guests",
    description:
      "Dedicated dining area suitable for family meals and small gatherings.",
    image: imgBase + "dining-area.jpg",
    imageSide: "right" as const,
  },
  {
    id: "kitchen",
    icon: FiGrid,
    title: "Kitchen",
    subtitle: "Fully Equipped",
    description:
      "Functional kitchen with essential appliances and storage for everyday cooking needs.",
    image: imgBase + "kitchen.jpg",
    imageSide: "left" as const,
  },
  {
    id: "bedrooms",
    icon: FiMoon,
    title: "Bedrooms",
    subtitle: "Three Furnished Rooms",
    description:
      "Well-furnished bedrooms designed for privacy, comfort, and restful sleep.",
    image: imgBase + "single-occupancy-mobile.jpg",
    imageSide: "right" as const,
  },
  {
    id: "bathrooms",
    icon: FiDroplet,
    title: "Bathrooms",
    subtitle: "2-3 Attached Bathrooms",
    description:
      "Clean and modern bathrooms with essential fittings and regular maintenance.",
    image: imgBase + "bathroom.jpg",
    imageSide: "left" as const,
  },
  {
    id: "balcony",
    icon: FiWind,
    title: "Balcony",
    subtitle: "Available in Select Units",
    description:
      "Private balcony space in select apartments for ventilation and outdoor relaxation.",
    image: imgBase + "balcony.jpg",
    imageSide: "right" as const,
  },
];

export default function ApartmentFeatures() {
  return (
    <section className="section bg-surface-1">
      <div className="container space-y-8">
        {features.map((f, idx) => {
          const Icon = f.icon;

          return (
            <div key={f.id}>
              <CardSplit
                imageSide={f.imageSide}
                image={f.image}
                aspectRatio="16/9"
              >
                <div>
                  {/* Icon header */}
                  <div className="flex items-center gap-3 text-primary">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="kicker">{f.title}</span>
                  </div>

                  <h3 className="heading-md mt-3">{f.subtitle}</h3>

                  <p className="text-sm mt-4 text-muted max-w-md">
                    {f.description}
                  </p>

                  <div className="mt-6 text-xs text-muted flex items-center gap-2">
                    <span className="inline-block w-8 h-0.5 bg-primary" />
                    Premium Amenity
                  </div>
                </div>
              </CardSplit>

              {/* mobile divider */}
              {idx !== features.length - 1 && (
                <div className="mt-8 block lg:hidden">
                  <div className="h-px w-full bg-slate-200" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
