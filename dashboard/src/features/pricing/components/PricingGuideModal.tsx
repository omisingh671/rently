import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { Tab } from "@/features/pricing/pricingPage.helpers";

interface PricingGuide {
  title: string;
  intro: string;
  sections: Array<{
    heading: string;
    items: string[];
  }>;
}

const pricingGuides: Record<Tab, PricingGuide> = {
  products: {
    title: "Rate Product Guide",
    intro:
      "Rate products are reusable sellable pricing types. Create these first, then attach prices to them from Price Rules / Rates.",
    sections: [
      {
        heading: "Common examples",
        items: ["Single Non-AC", "Double AC", "Dorm Bed", "Whole Unit AC"],
      },
      {
        heading: "Fields",
        items: [
          "Rate Product Name is the internal product guests will be priced against.",
          "Occupancy is the number of guests this product covers.",
          "AC rate product marks whether this product is for AC or Non-AC inventory.",
          "Product Category groups the product as nightly, long stay, or corporate.",
        ],
      },
    ],
  },
  rates: {
    title: "Price Rule Guide",
    intro:
      "Price rules are the actual pricing engine. They decide what amount is used for quote and booking calculations.",
    sections: [
      {
        heading: "How to use",
        items: [
          "Start with a property-wide nightly rate for each rate product.",
          "Use unit or room overrides only when one unit or room has different pricing.",
          "Weekly and monthly rates support longer stay pricing without creating duplicate products.",
        ],
      },
      {
        heading: "Tax inclusive",
        items: [
          "Tax inclusive means the entered price already includes tax.",
          "Backend only extracts or applies tax when an active matching tax exists.",
          "If matching taxes are disabled, no tax is applied even when Tax inclusive is checked.",
        ],
      },
    ],
  },
  taxes: {
    title: "Tax Guide",
    intro:
      "Taxes are calculated by the backend during quote and booking creation. Use slabs for accommodation GST and flat rules for booking-level charges.",
    sections: [
      {
        heading: "Normal GST setup",
        items: [
          "Create GST 5% with Category GST, Scope Accommodation, Calculation Slab by nightly tariff, Min 0, Max 7500.",
          "Create GST 18% with Category GST, Scope Accommodation, Calculation Slab by nightly tariff, Min 7500, Max empty.",
          "Only one GST slab applies to each booking item, and multi-room bookings sum item-wise tax.",
        ],
      },
      {
        heading: "Flat and fixed examples",
        items: [
          "Booking-level flat tax: use Scope Booking and Calculation Flat rule.",
          "Platform fee Rs. 5: use Tax Type Fixed, Rate / Amount 5, Scope Booking, Calculation Flat rule.",
          "Generic percentage service tax: use Tax Type Percentage, Scope Booking or Accommodation, Calculation Flat rule.",
        ],
      },
      {
        heading: "Important fields",
        items: [
          "Percentage uses the rate as a percent. Fixed uses the rate as an INR amount.",
          "Min Tariff and Max Tariff are only for slab by nightly tariff.",
          "Priority controls ordering when rules need deterministic selection.",
          "Disabled taxes are not applied to quotes or bookings.",
          "Coupons reduce taxable value before tax.",
        ],
      },
    ],
  },
  coupons: {
    title: "Coupon Guide",
    intro:
      "Coupons reduce the booking amount before tax when they match the guest booking.",
    sections: [
      {
        heading: "Discount setup",
        items: [
          "Percentage discount uses Discount Value as a percent, such as 10 for 10%.",
          "Fixed discount uses Discount Value as an INR amount.",
          "Minimum nights and minimum booking amount restrict when the coupon can apply.",
        ],
      },
      {
        heading: "Usage controls",
        items: [
          "Maximum uses limits total redemptions.",
          "Once per User prevents the same guest account from reusing the coupon.",
          "Valid From and Valid To control the booking date window.",
          "Disabled coupons are ignored by public quote and booking calculations.",
        ],
      },
    ],
  },
};

interface PricingGuideModalProps {
  topic: Tab | null;
  onClose: () => void;
}

export function PricingGuideModal({ topic, onClose }: PricingGuideModalProps) {
  const guide = topic ? pricingGuides[topic] : null;

  return (
    <Modal
      isOpen={guide !== null}
      onClose={onClose}
      title={guide?.title}
      size="lg"
    >
      {guide && (
        <>
          <div className="space-y-5 text-sm text-slate-600">
            <p>{guide.intro}</p>
            {guide.sections.map((section) => (
              <section key={section.heading} className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {section.heading}
                </h3>
                <ul className="list-disc space-y-1 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
