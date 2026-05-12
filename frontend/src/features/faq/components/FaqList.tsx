import Accordion, {
  type AccordionItem,
} from "@/components/ui/Accordion/Accordion";

const FAQ_ITEMS: AccordionItem[] = [
  {
    id: "checkin",
    title: "What time is check-in/check-out?",
    content:
      "Check-in is from 12:00 PM and check-out is by 11:00 AM. Early check-in or late check-out may be available on request.",
  },
  {
    id: "cooking",
    title: "Is cooking allowed?",
    content:
      "Yes, guests have access to a fully equipped kitchen and are free to cook their own meals.",
  },
  {
    id: "visitors",
    title: "Are visitors allowed?",
    content:
      "Visitors are allowed during the day. Overnight stays may require prior approval from management.",
  },
  {
    id: "discounts",
    title: "Do you offer monthly discounts?",
    content:
      "Yes, we offer special pricing for long stays and corporate bookings. Please contact us for customized quotes.",
  },
  {
    id: "occupancy",
    title: "Is double occupancy same-gender only?",
    content:
      "Yes, for comfort and safety, double occupancy rooms are allocated on a same-gender basis.",
  },
];

export default function FaqList() {
  return (
    <section className="section bg-white">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <Accordion items={FAQ_ITEMS} variant="accent" />
        </div>
      </div>
    </section>
  );
}
