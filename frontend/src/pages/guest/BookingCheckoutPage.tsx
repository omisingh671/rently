import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  FiArrowLeft,
  FiArrowRight,
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
  getBookingCheckoutDraft,
  saveBookingCheckoutDraftCreatedBooking,
} from "@/features/bookings/bookingCheckoutDraft";
import {
  useBooking,
  useBookingCheckoutQuote,
  useBookingQuote,
  useCreateBooking,
  useUpdateBookingCheckout,
} from "@/features/bookings/hooks";
import { useProfile } from "@/features/profile/hooks";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";
import type { CreateBookingPayload } from "@/features/bookings/api";
import type { Booking, BookingQuote } from "@/features/bookings/types";

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

const splitContactNumber = (value: string | null | undefined) => {
  const fullPhone = value ?? "";
  const [code, ...numParts] = fullPhone.includes("-")
    ? fullPhone.split("-")
    : ["+91", fullPhone];

  return {
    countryCode: code || "+91",
    contactNumber: numParts.join("-") || fullPhone,
  };
};

const buildBookingFormValues = (booking: Booking): GuestInfoFormValues => ({
  name: booking.guestName,
  email: booking.guestEmail,
  ...splitContactNumber(booking.guestContactNumber),
});

const buildBookingSummary = (booking: Booking) => ({
  title: booking.title,
  spaceName: booking.spaceName,
  from: booking.from,
  to: booking.to,
  guestCount: booking.guestCount,
  comfortOption: booking.comfortOption,
  nightlyTotal: booking.pricePerNight,
  stayTotal: booking.subtotalAmount || booking.totalPrice + booking.discountAmount,
});

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

export default function BookingCheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draft = useMemo(() => getBookingCheckoutDraft(), []);
  const editBookingId = searchParams.get("bookingId") ?? undefined;
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated" && user !== null;
  const editBookingQuery = useBooking(editBookingId, editBookingId !== undefined);
  const profileQuery = useProfile(isAuthenticated);
  const createBookingMutation = useCreateBooking();
  const updateBookingCheckoutMutation = useUpdateBookingCheckout();
  const quoteMutation = useBookingQuote();
  const checkoutQuoteMutation = useBookingCheckoutQuote();
  const {
    data: quote,
    error: rawQuoteError,
    mutate: requestQuote,
    mutateAsync: requestQuoteAsync,
  } = quoteMutation;
  const {
    data: checkoutQuote,
    error: rawCheckoutQuoteError,
    mutate: requestCheckoutQuote,
    mutateAsync: requestCheckoutQuoteAsync,
  } = checkoutQuoteMutation;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [hydratedCouponBookingId, setHydratedCouponBookingId] = useState<
    string | null
  >(null);

  const profile = profileQuery.data;
  const profileDefaults = useMemo<GuestInfoFormValues>(() => {
    return {
      name: profile?.fullName ?? user?.fullName ?? "",
      email: profile?.email ?? user?.email ?? "",
      ...splitContactNumber(profile?.contactNumber),
    };
  }, [profile, user]);
  const editBooking = editBookingQuery.data;
  const isEditingCheckout = editBookingId !== undefined;
  const editToken =
    draft && draft.createdBookingId === editBookingId
      ? draft.payload.inventoryLockToken
      : undefined;
  const formValues =
    isEditingCheckout && editBooking
      ? buildBookingFormValues(editBooking)
      : isAuthenticated
        ? profileDefaults
        : undefined;

  const form = useForm<GuestInfoFormValues, undefined, GuestInfoSubmitValues>({
    resolver: zodResolver(guestInfoSchema),
    defaultValues: profileDefaults,
    values: formValues,
    mode: "onTouched",
  });

  const quotePayload = useMemo<CreateBookingPayload | null>(
    () =>
      draft && !isEditingCheckout
        ? {
            ...draft.payload,
            couponCode: couponCode.trim() || undefined,
          }
        : null,
    [couponCode, draft, isEditingCheckout],
  );
  const checkoutQuotePayload = useMemo(
    () =>
      editBookingId
        ? {
            bookingId: editBookingId,
            payload: {
              couponCode: couponCode.trim() || null,
              ...(editToken !== undefined && { editToken }),
            },
          }
        : null,
    [couponCode, editBookingId, editToken],
  );
  const activeQuote: BookingQuote | undefined = isEditingCheckout
    ? checkoutQuote
    : quote;
  const quoteError = rawQuoteError
    ? normalizeApiError(rawQuoteError).message
    : rawCheckoutQuoteError
      ? normalizeApiError(rawCheckoutQuoteError).message
      : null;

  useEffect(() => {
    if (!editBooking || hydratedCouponBookingId === editBooking.id) return;

    setCouponCode(editBooking.couponCode ?? "");
    setHydratedCouponBookingId(editBooking.id);
  }, [editBooking, hydratedCouponBookingId]);

  useEffect(() => {
    if (!quotePayload && !checkoutQuotePayload) return;

    const timeout = window.setTimeout(() => {
      if (quotePayload) {
        requestQuote(quotePayload);
      } else if (checkoutQuotePayload) {
        requestCheckoutQuote(checkoutQuotePayload);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [checkoutQuotePayload, quotePayload, requestCheckoutQuote, requestQuote]);

  if (!draft && !isEditingCheckout) {
    return <Navigate to={ROUTES.SPACES} replace />;
  }

  if (isEditingCheckout && editBookingQuery.status === "pending") {
    return (
      <section className="section bg-surface min-h-[60vh]">
        <div className="container max-w-2xl text-center">
          <p className="font-medium text-slate-500">Loading checkout...</p>
        </div>
      </section>
    );
  }

  if (isEditingCheckout && editBookingQuery.status === "error") {
    return (
      <section className="section bg-surface">
        <div className="container max-w-2xl text-center">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-8">
            <h1 className="text-xl font-bold text-red-900">
              Checkout edit unavailable
            </h1>
            <p className="mt-2 text-red-700">
              {editBookingQuery.error.message}
            </p>
            {editBookingId && (
              <Button className="mt-6" to={ROUTES.BOOKING_PAYMENT(editBookingId)}>
                Back to payment
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const returnHref =
    isEditingCheckout && editBookingId
      ? ROUTES.BOOKING_PAYMENT(editBookingId)
      : draft
        ? buildReturnHref(draft.returnTo)
        : ROUTES.SPACES;
  const summary =
    isEditingCheckout && editBooking
      ? buildBookingSummary(editBooking)
      : draft?.summary;

  if (!summary) {
    return <Navigate to={ROUTES.SPACES} replace />;
  }

  const onSubmit = async (values: GuestInfoSubmitValues) => {
    const guestDetails = {
      name: values.name,
      email: values.email,
      contactNumber: `${values.countryCode}-${values.contactNumber}`,
    };

    if (isEditingCheckout && editBookingId) {
      try {
        setSubmitError(null);
        const checkoutPayload = {
          couponCode: couponCode.trim() || null,
          ...(editToken !== undefined && { editToken }),
        };
        await requestCheckoutQuoteAsync({
          bookingId: editBookingId,
          payload: checkoutPayload,
        });
        await updateBookingCheckoutMutation.mutateAsync({
          bookingId: editBookingId,
          payload: {
            ...checkoutPayload,
            guestDetails,
          },
        });
        navigate(ROUTES.BOOKING_PAYMENT(editBookingId), { replace: true });
      } catch (error: unknown) {
        setSubmitError(normalizeApiError(error).message);
      }
      return;
    }

    if (!quotePayload) return;

    const payload: CreateBookingPayload = {
      ...quotePayload,
      guestDetails: {
        ...guestDetails,
      },
    };

    try {
      setSubmitError(null);
      await requestQuoteAsync(quotePayload);
      const booking = await createBookingMutation.mutateAsync(payload);
      saveBookingCheckoutDraftCreatedBooking(booking.id);
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
          {isEditingCheckout ? (
            <FiArrowRight className="h-4 w-4" />
          ) : (
            <FiArrowLeft className="h-4 w-4" />
          )}
          {isEditingCheckout ? "Back to payment" : "Back to selection"}
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FiUser className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {isEditingCheckout ? "Edit Guest Information" : "Guest Information"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {isEditingCheckout
                    ? "Update contact details or coupon before completing payment."
                    : isAuthenticated
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
              {quoteError && !submitError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {quoteError}
                </div>
              )}

              <div className="mt-auto pt-4">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={
                    createBookingMutation.isPending ||
                    updateBookingCheckoutMutation.isPending
                  }
                  icon={<FiCreditCard />}
                  className={
                    createBookingMutation.isPending ||
                    updateBookingCheckoutMutation.isPending
                      ? "cursor-wait opacity-70"
                      : undefined
                  }
                >
                  {createBookingMutation.isPending ||
                  updateBookingCheckoutMutation.isPending
                    ? isEditingCheckout
                      ? "Saving changes..."
                      : "Creating booking..."
                    : isEditingCheckout
                      ? "Save and return to payment"
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
              <div className="mb-6">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Coupon Code
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER CODE"
                      className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold uppercase tracking-wider text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Nightly rate</span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(activeQuote?.items.reduce((total, item) => total + item.pricePerNight, 0) ?? summary.nightlyTotal)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">Stay subtotal</span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(activeQuote?.subtotalAmount ?? summary.stayTotal)}
                </span>
              </div>
              {(activeQuote?.discountAmount ?? 0) > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-emerald-700">
                    Coupon{activeQuote?.couponCode ? ` (${activeQuote.couponCode})` : ""}
                  </span>
                  <span className="font-bold text-emerald-700">
                    -{formatPrice(activeQuote?.discountAmount ?? 0)}
                  </span>
                </div>
              )}
              {(activeQuote?.taxBreakdown.length ?? 0) > 0 && (
                <div className="mt-3 space-y-2">
                  {activeQuote?.taxBreakdown.map((tax) => (
                    <div
                      key={`${tax.taxId}-${tax.included ? "in" : "ex"}`}
                      className="flex items-center justify-between text-xs text-slate-500"
                    >
                      <span>
                        {tax.name} {tax.included ? "(included)" : ""}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {formatPrice(tax.taxAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-base font-bold text-slate-900">
                  Final total
                </span>
                <span className="text-xl font-bold text-indigo-600">
                  {formatPrice(activeQuote?.totalAmount ?? summary.stayTotal)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-indigo-50 px-3 py-3 text-xs">
                <div>
                  <div className="font-bold uppercase tracking-wider text-indigo-500">
                    Due now
                  </div>
                  <div className="mt-1 font-bold text-indigo-900">
                    {formatPrice(activeQuote?.upfrontAmount ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wider text-slate-400">
                    At check-in
                  </div>
                  <div className="mt-1 font-bold text-slate-700">
                    {formatPrice(activeQuote?.remainingPayAtCheckIn ?? 0)}
                  </div>
                </div>
              </div>
              {activeQuote?.policy.guestPolicyText && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-900">
                  <div className="font-bold uppercase tracking-wider text-amber-700">
                    Booking policy
                  </div>
                  <p className="mt-1">{activeQuote.policy.guestPolicyText}</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
