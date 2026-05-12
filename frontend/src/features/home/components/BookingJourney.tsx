import { useNavigate } from "react-router-dom";

import VerticalStepsJourney, {
  type RawStep,
} from "@/components/ui/VerticalStepsJourney";
import { FiCalendar, FiUsers, FiCheckCircle } from "react-icons/fi";

import { useCheckAvailability } from "@/features/availability/hooks";
import type { CheckAvailabilityPayload } from "@/features/availability/types";

import BookingForm from "@/forms/booking/Form";
import type { BookingFormParsedValues } from "@/forms/booking/formSchema";

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
  const checkAvailability = useCheckAvailability();

  const handleBookingSubmit = async (values: BookingFormParsedValues) => {
    const payload: CheckAvailabilityPayload = {
      ...values,
      fullContactNumber: `${values.countryCode}-${values.contactNumber}`,
    };

    console.log(payload);
    const result = await checkAvailability.mutateAsync(payload);

    if (result.available) {
      navigate("/availability-result", {
        state: {
          criteria: {
            checkIn: values.checkIn,
            checkOut: values.checkOut,
            guests: values.guests,
            occupancyType: values.occupancyType,
          },
          availability: result,
        },
      });
    }
  };

  return (
    <section className="section bg-[#120b49]">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
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
              className="bg-indigo-100 rounded-xl"
              formTitleIntro="Quickly check available rooms and prices."
              onSubmit={handleBookingSubmit}
              isSubmitting={checkAvailability.isPending}
              serverError={checkAvailability.error}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}
