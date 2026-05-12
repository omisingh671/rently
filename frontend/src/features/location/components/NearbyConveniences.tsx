import {
  RiBuilding2Line,
  RiHospitalLine,
  RiTrainLine,
  RiRestaurantLine,
  RiShoppingCartLine,
} from "react-icons/ri";

import FeatureCard from "@/components/ui/FeatureCard/FeatureCard";

const loactionConveniences = [
  {
    icon: RiBuilding2Line,
    title: "Business Hubs",
    desc: "Close proximity to major corporate parks and business districts",
  },
  {
    icon: RiHospitalLine,
    title: "Hospitals",
    desc: "Quality healthcare facilities within easy reach",
  },
  {
    icon: RiTrainLine,
    title: "Metro & Public Transport",
    desc: "Well-connected by metro and public transportation networks",
  },
  {
    icon: RiRestaurantLine,
    title: "Restaurants & Cafés",
    desc: "Diverse dining options for every taste and occasion",
  },
  {
    icon: RiShoppingCartLine,
    title: "Grocery & Essentials",
    desc: "Supermarkets and convenience stores nearby",
  },
];

export default function NearbyConveniences() {
  return (
    <section className="section bg-white">
      <div className="container s-lg">
        <h2 className="heading heading-lg">Nearby Conveniences</h2>
        <p className="mt-4 text-sm sm:text-base text-muted">
          Everything you need is right at your doorstep
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {loactionConveniences.map((item) => (
            <FeatureCard
              contentAlign="left"
              key={item.title}
              icon={item.icon}
              title={item.title}
              description={item.desc}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
