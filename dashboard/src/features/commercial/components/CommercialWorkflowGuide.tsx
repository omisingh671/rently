import { FiBriefcase, FiCheckCircle, FiHome, FiUsers } from "react-icons/fi";

const steps = [
  {
    number: "01",
    title: "Add a company",
    description: "Optional. Save a reusable corporate billing and tax identity.",
    icon: FiBriefcase,
  },
  {
    number: "02",
    title: "Create a group stay",
    description: "Set stay dates, expected rooms and guests, and who will be billed.",
    icon: FiUsers,
  },
  {
    number: "03",
    title: "Hold and assign rooms",
    description: "Reserve exact rooms, then pick each room up into a guest booking.",
    icon: FiHome,
  },
  {
    number: "04",
    title: "Operate and close",
    description: "Track the rooming list and folio, release rooms, and complete the group.",
    icon: FiCheckCircle,
  },
];

export default function CommercialWorkflowGuide() {
  return (
    <section
      aria-labelledby="commercial-workflow-title"
      className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm"
    >
      <div className="border-b border-indigo-100 bg-indigo-50/70 px-5 py-3">
        <h2 id="commercial-workflow-title" className="text-sm font-semibold text-indigo-950">
          Group booking workflow
        </h2>
        <p className="mt-0.5 text-xs text-indigo-700">
          Follow these steps from company setup to final group closure.
        </p>
      </div>
      <ol className="grid divide-y divide-slate-100 md:grid-cols-4 md:divide-x md:divide-y-0">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.number} className="flex items-start gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Icon aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <span className="block text-[10px] font-bold uppercase leading-4 tracking-wider text-indigo-500">
                  Step {step.number}
                </span>
                <h3 className="mt-0.5 text-sm font-semibold leading-5 text-slate-900">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
