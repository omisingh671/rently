import { useNavigate } from "react-router-dom";

import VerticalStepsJourney, {
  type RawStep,
} from "@/components/ui/VerticalStepsJourney";
import { FiCalendar, FiUsers, FiCheckCircle } from "react-icons/fi";

import BookingForm from "@/forms/booking/Form";
import type { BookingFormParsedValues } from "@/forms/booking/formSchema";
import { ROUTES } from "@/configs/routePaths";

const steps: RawStep[] = [
  {
    id: 1,
    title: "1. Select Your Dates",
    subtitle: "Choose check-in and check-out days.",
    media: "calendar",
  },
  {
    id: 2,
    title: "2. Choose Occupancy Type",
    subtitle: "Single or double occupancy.",
    media: "users",
  },
  {
    id: 3,
    title: "3. Confirm & Pay",
    subtitle: "Instant confirmation on email and WhatsApp.",
    media: "confirm",
  },
];

const iconMap = {
  calendar: <FiCalendar className="w-6 h-6" />,
  users: <FiUsers className="w-6 h-6" />,
  confirm: <FiCheckCircle className="w-6 h-6" />,
};

const darkIndigoPalette = {
  line: "#3C3791",
  border: "#3C3791",
  nodeBorder: "#4B45B8",
  nodeBg: "#2D2972",
  cardBg: "#2D2972",
  iconBg: "#4B45B8",
  iconColor: "#C7D2FE",
  titleColor: "#EEF2FF",
  subtitleColor: "#D1D5F0",
};

export default function BookingJourney() {
  const navigate = useNavigate();

  const handleBookingSubmit = (values: BookingFormParsedValues) => {
    const searchParams = new URLSearchParams({
      from: values.checkIn,
      to: values.checkOut,
      guests: String(values.guests),
      occupancy: values.occupancyType,
      ac: values.comfortOption === "AC" ? "true" : "false",
    });

    navigate(`${ROUTES.SPACES}?${searchParams.toString()}`);
    return Promise.resolve();
  };

  return (
    <section className="section bg-[#120b49]">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="heading heading-lg text-white mb-8">
              Booking Process
            </h2>
            <VerticalStepsJourney
              data={steps}
              iconMap={iconMap}
              className="max-w-3xl"
              palette={darkIndigoPalette}
            />
          </div>

          <aside className="w-full">
            <BookingForm
              className="rounded-2xl"
              formTitleIntro="Quickly check available rooms and prices."
              onSubmit={handleBookingSubmit}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}
