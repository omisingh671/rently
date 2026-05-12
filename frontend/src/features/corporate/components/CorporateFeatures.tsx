import {
  RiLineChartLine,
  RiBrushLine,
  RiFileList3Line,
  RiUserStarLine,
} from "react-icons/ri";

import FeatureCard from "@/components/ui/FeatureCard/FeatureCard";

const FEATURES = [
  {
    icon: RiLineChartLine,
    title: "Predictable Monthly Pricing",
    desc: "Clear, transparent rates with no hidden charges perfect for budgeting",
  },
  {
    icon: RiBrushLine,
    title: "Regular Housekeeping",
    desc: "Professional cleaning and maintenance included in every stay",
  },
  {
    icon: RiFileList3Line,
    title: "GST-Compliant Billing",
    desc: "Proper invoicing for seamless corporate reimbursement",
  },
  {
    icon: RiUserStarLine,
    title: "Dedicated Relationship Manager",
    desc: "Personal point of contact for all your needs and requests",
  },
];

export default function CorporateFeatures() {
  return (
    <section className="section bg-surface-1">
      <div className="container s-lg">
        <div>
          <span className="kicker uppercase tracking-wider text-indigo-600">
            Extended Stay Essentials
          </span>

          <h2 className="heading heading-lg text-slate-800">
            Why Choose Sucasa for Long Stays
          </h2>

          <p className="mt-4 text-sm sm:text-base text-muted max-w-2xl">
            Everything you need for an extended, hassle-free stay
          </p>
        </div>

        <div className="grid grid-fit gap-8">
          {FEATURES.map((item) => (
            <FeatureCard
              key={item.title}
              iconPosition="top"
              contentAlign="center"
              icon={item.icon}
              title={item.title}
              description={item.desc}
              cardBg="bg-white"
              borderClass="border border-slate-200"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
