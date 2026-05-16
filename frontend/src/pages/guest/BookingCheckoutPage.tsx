import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  FiArrowLeft,
  FiCalendar,
  FiCreditCard,
  FiMail,
  FiPhone,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import CountryDialCodeInput from "@/components/inputs/CountryDialCodeInput";
import Button from "@/components/ui/Button";
import { ROUTES } from "@/configs/routePaths";
import {
  clearBookingCheckoutDraft,
  getBookingCheckoutDraft,
} from "@/features/bookings/bookingCheckoutDraft";
import { useCreateBooking } from "@/features/bookings/hooks";
import { useProfile } from "@/features/profile/hooks";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";
import type { CreateBookingPayload } from "@/features/bookings/api";

const guestInfoSchema = z.object({
  name: z.string().trim().min(1, "Guest name is required").max(120),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(190)
    .transform((value) => value.toLowerCase()),
  countryCode: z.string().min(1, "Country code is required"),
  contactNumber: z
    .string()
    .trim()
    .min(5, "Mobile number is required")
    .max(40),
});

type GuestInfoFormValues = z.input<typeof guestInfoSchema>;
type GuestInfoSubmitValues = z.output<typeof guestInfoSchema>;

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const buildReturnHref = (location: {
  pathname: string;
  search: string;
  hash: string;
}) => `${location.pathname}${location.search}${location.hash}`;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

export default function BookingCheckoutPage() {
  const navigate = useNavigate();
  const draft = useMemo(() => getBookingCheckoutDraft(), []);
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated" && user !== null;
  const profileQuery = useProfile(isAuthenticated);
  const createBookingMutation = useCreateBooking();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const profile = profileQuery.data;
  const profileDefaults = useMemo<GuestInfoFormValues>(() => {
    const fullPhone = profile?.contactNumber ?? "";
    const [code, ...numParts] = fullPhone.includes("-")
      ? fullPhone.split("-")
      : ["+91", fullPhone];

    return {
      name: profile?.fullName ?? user?.fullName ?? "",
      email: profile?.email ?? user?.email ?? "",
      countryCode: code || "+91",
      contactNumber: numParts.join("-") || fullPhone,
    };
  }, [profile, user]);

  const form = useForm<GuestInfoFormValues, undefined, GuestInfoSubmitValues>({
    resolver: zodResolver(guestInfoSchema),
    defaultValues: profileDefaults,
    values: isAuthenticated ? profileDefaults : undefined,
    mode: "onTouched",
  });

  if (!draft) {
    return <Navigate to={ROUTES.SPACES} replace />;
  }

  const returnHref = buildReturnHref(draft.returnTo);
  const summary = draft.summary;

  const onSubmit = async (values: GuestInfoSubmitValues) => {
    const payload: CreateBookingPayload = {
      ...draft.payload,
      guestDetails: {
        name: values.name,
        email: values.email,
        contactNumber: `${values.countryCode}-${values.contactNumber}`,
      },
    };

    try {
      setSubmitError(null);
      const booking = await createBookingMutation.mutateAsync(payload);
      clearBookingCheckoutDraft();
      navigate(ROUTES.BOOKING_PAYMENT(booking.id), { replace: true });
    } catch (error: unknown) {
      setSubmitError(normalizeApiError(error).message);
    }
  };

  return (
    <section className="section bg-surface min-h-screen">
      <div className="container max-w-4xl">
        <Link
          to={returnHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to selection
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FiUser className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Guest Information
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {isAuthenticated
                    ? "Profile details are prefilled. Complete any missing field before continuing."
                    : "Enter the contact details for this booking."}
                </p>
              </div>
            </div>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-1 flex-col space-y-5"
              noValidate
            >
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <FiUser className="h-3.5 w-3.5" />
                  Name
                </span>
                <input
                  type="text"
                  autoComplete="name"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  {...form.register("name")}
                />
                <FieldError message={form.formState.errors.name?.message} />
              </label>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <FiMail className="h-3.5 w-3.5" />
                    Email
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    {...form.register("email")}
                  />
                  <FieldError message={form.formState.errors.email?.message} />
                </label>

                <div className="block">
                  <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <FiPhone className="h-3.5 w-3.5" />
                    Mobile number
                  </span>
                  <div
                    className={`input-group h-11 !rounded-lg ${
                      form.formState.errors.contactNumber ? "error" : ""
                    }`}
                  >
                    <div className="pre-input">
                      <CountryDialCodeInput
                        name="countryCode"
                        control={form.control}
                        renderSelectOnly={false}
                        useNativeSelectOnMobile={false}
                        selectClass="w-full h-full bg-transparent"
                      />
                    </div>
                    <div className="main-input">
                      <input
                        type="tel"
                        autoComplete="tel"
                        className="w-full bg-transparent text-sm text-slate-900 outline-none"
                        {...form.register("contactNumber")}
                        placeholder="9876543210"
                      />
                    </div>
                  </div>
                  <FieldError
                    message={form.formState.errors.contactNumber?.message}
                  />
                </div>
              </div>

              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="mt-auto pt-4">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={createBookingMutation.isPending}
                  icon={<FiCreditCard />}
                  className={
                    createBookingMutation.isPending
                      ? "cursor-wait opacity-70"
                      : undefined
                  }
                >
                  {createBookingMutation.isPending
                    ? "Creating booking..."
                    : "Continue to payment"}
                </Button>
              </div>
            </form>
          </div>

          <aside className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Booking Summary
            </h2>
            <p className="mt-1 text-sm text-slate-500">{summary.spaceName}</p>

            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FiCalendar />
                </span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Stay dates
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(summary.from)} - {formatDate(summary.to)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FiUsers />
                </span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Guests
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {summary.guestCount} guest
                    {summary.guestCount === 1 ? "" : "s"} ·{" "}
                    {summary.comfortOption === "AC" ? "AC" : "Non-AC"}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-auto pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Nightly rate</span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(summary.nightlyTotal)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-base font-bold text-slate-900">
                  Total stay
                </span>
                <span className="text-xl font-bold text-indigo-600">
                  {formatPrice(summary.stayTotal)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
