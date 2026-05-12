import { FiHome, FiUsers, FiBriefcase, FiShoppingCart } from "react-icons/fi";

import IconBadge from "@/components/ui/IconBadge";

const features = [
  {
    icon: FiHome,
    label: "3BHK Units",
    description:
      "Eight fully furnished 3BHK service apartments for comfortable living.",
    color: "text-indigo-600",
    bg: "bg-indigo-50 ring-indigo-100",
  },
  {
    icon: FiUsers,
    label: "Occupancy Options",
    description:
      "Single and double occupancy rooms suitable for all preferences.",
    color: "text-emerald-600",
    bg: "bg-emerald-50 ring-emerald-100",
  },
  {
    icon: FiBriefcase,
    label: "Long Stays",
    description:
      "Ideal for extended stays, corporate bookings, and relocations.",
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50 ring-fuchsia-100",
  },
  {
    icon: FiShoppingCart,
    label: "Online Booking",
    description: "A seamless and convenient online booking experience.",
    color: "text-orange-600",
    bg: "bg-orange-50 ring-orange-100",
  },
];

const propertySnapshot = "/assets/images/sucasa-homes/dining-area.jpg";

export default function PropertySnapshot() {
  return (
    <section className="py-16 lg:py-24 bg-surface-1">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* LEFT: Image with rounded corner and review card */}
          <div className="relative pr-4">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={propertySnapshot}
                alt="Interior preview of property"
                className="w-full h-[420px] md:h-[520px] object-cover block"
              />
            </div>

            {/* review card overlapping bottom-right */}
            <div className="absolute right-0 bottom-6 -translate-y-4">
              <div className="bg-white rounded-lg shadow-lg px-5 py-4 w-64 md:w-72">
                <div className="text-xl font-semibold font-heading text-slate-700">
                  "Better than a hotel."
                </div>
                <div className="mt-2 text-sm text-slate-600 italic">
                  - Recent Guest Review
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Title, description, stats, feature pills */}
          <div>
            <div className="kicker text-indigo-500 uppercase tracking-wider mb-3">
              Property Snapshot
            </div>

            <h2 className="heading heading-lg mb-4">
              Home Away from Home at Sucasa Homes
            </h2>

            <p className="text-slate-600 max-w-prose mb-8">
              Experience the comfort of staying in a fully furnished 3BHK
              apartment designed for working professionals, families, and
              long-stay guests. Choose your room, access shared living spaces,
              and enjoy a homely yet serviced experience in the heart of
              Hyderabad.
            </p>

            {/* Feature pills grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((f) => {
                return (
                  <div
                    key={f.label}
                    className="flex items-start gap-4 p-5 bg-white/95 border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <IconBadge
                      icon={f.icon}
                      layout="square"
                      color={f.color}
                      bg={f.bg}
                    />

                    <div className="flex flex-col">
                      <div className="text-base font-semibold text-slate-900">
                        {f.label}
                      </div>
                      {f.description && (
                        <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                          {f.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
