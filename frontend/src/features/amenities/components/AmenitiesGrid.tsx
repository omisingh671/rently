import {
  FiWifi,
  FiZap,
  FiArrowUp,
  FiTruck,
  FiDroplet,
  FiShield,
  FiWind,
  FiTool,
} from "react-icons/fi";

import FeatureCard from "@/components/ui/FeatureCard/FeatureCard";

const amenities = [
  {
    id: "wifi",
    icon: FiWifi,
    title: "High-Speed Wi-Fi",
    desc: "Reliable internet for work and streaming",
  },
  {
    id: "power",
    icon: FiZap,
    title: "Power Backup",
    desc: "Uninterrupted electricity",
  },
  {
    id: "lift",
    icon: FiArrowUp,
    title: "Lift Access",
    desc: "Easy access to all floors",
  },
  {
    id: "parking",
    icon: FiTruck,
    title: "Parking",
    desc: "Subject to availability",
  },
  {
    id: "water",
    icon: FiDroplet,
    title: "RO Water",
    desc: "Clean drinking water provided",
  },
  {
    id: "security",
    icon: FiShield,
    title: "Secure Premises",
    desc: "Safe and well-maintained property",
  },
  {
    id: "ac",
    icon: FiWind,
    title: "AC / Non-AC Options",
    desc: "Choose what suits your comfort",
  },
  {
    id: "maintenance",
    icon: FiTool,
    title: "Regular Maintenance",
    desc: "Professionally managed upkeep",
  },
];

export default function AmenitiesGrid() {
  return (
    <section className="section bg-white">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="heading heading-lg text-slate-700">
            Apartment Amenities
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted">
            Thoughtfully selected amenities to ensure a comfortable, hassle-free
            stay.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {amenities.map((item) => (
            <FeatureCard
              iconPosition="top"
              contentAlign="center"
              key={item.id}
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
