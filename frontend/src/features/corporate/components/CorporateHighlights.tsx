import FeatureCard from "@/components/ui/FeatureCard/FeatureCard";

const HIGHLIGHTS = [
  {
    id: 1,
    title: "Flexible Terms",
    desc: "Customized lease agreements tailored to your corporate needs",
  },
  {
    id: 2,
    title: "Multiple Sizes",
    desc: "Options from studios to 3BHK for teams of any size",
  },
  {
    id: 3,
    title: "Quick Check-in",
    desc: "Streamlined onboarding process for fast occupancy",
  },
  {
    id: 4,
    title: "24/7 Support",
    desc: "Dedicated support team available round the clock",
  },
];

export default function CorporateHighlights() {
  return (
    <section className="section bg-white">
      <div className="container s-lg">
        <div className="mb-8">
          <span className="kicker uppercase tracking-wider text-amber-500">
            Corporate Solutions
          </span>

          <h2 className="heading heading-lg text-slate-800">
            Perfect for Corporate Teams
          </h2>

          <p className="text-muted max-w-4xl mt-3">
            Sucasa Homes is the ideal choice for companies looking to house
            employees on extended assignments. From relocation packages to team
            accommodations, we provide professional, comfortable living spaces.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HIGHLIGHTS.map((item) => (
            <FeatureCard
              key={item.id}
              iconPosition="left"
              icon={
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200 text-amber-800 text-base font-bold">
                  {item.id}
                </span>
              }
              title={item.title}
              description={item.desc}
              iconBg="bg-amber-200"
              iconColor="text-amber-800"
              cardBg="bg-amber-50/60"
              borderClass="border border-amber-200/60"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
