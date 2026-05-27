import { useEffect, useState } from "react";
import { AxiosError } from "axios";

import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import BookingPolicyForm from "@/features/booking-policy/components/BookingPolicyForm";
import {
  emptyBookingPolicyForm,
  mapFormToPayload,
  mapPolicyToForm,
} from "@/features/booking-policy/bookingPolicy.helpers";
import { useBookingPolicy } from "@/features/booking-policy/hooks/useBookingPolicy";
import type { BookingPolicyForm as BookingPolicyFormState } from "@/features/booking-policy/types";

export default function BookingPolicyPage() {
  const user = useAuthStore((state) => state.user);
  const isManager = user?.role === "MANAGER";
  const {
    properties,
    selectedPropertyId,
    setSelectedPropertyId,
    isLoading: isLoadingProperties,
    hasProperties,
  } = useCurrentProperty();
  const {
    policy,
    isLoading: isLoadingPolicy,
    isFetching,
    isError,
    updatePolicy,
    isUpdating,
  } = useBookingPolicy(selectedPropertyId || undefined);

  const [form, setForm] =
    useState<BookingPolicyFormState>(emptyBookingPolicyForm);
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (policy) {
      setForm(mapPolicyToForm(policy));
      setServerError(null);
      setSavedMessage(null);
    }
  }, [policy]);

  const handleSave = async () => {
    setServerError(null);
    setSavedMessage(null);

    try {
      await updatePolicy(mapFormToPayload(form));
      setSavedMessage("Booking policy saved.");
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.error?.message ?? "Failed to save policy"
          : error instanceof Error
            ? error.message
            : "Failed to save policy";
      setServerError(message);
    }
  };

  if (!isLoadingProperties && !hasProperties) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
        No accessible properties found.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Booking & Cancellation Policy
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isManager
                ? "Manager view is read-only."
                : "Policy changes apply only to new bookings."}
            </p>
          </div>
          <label className="block min-w-[260px] text-sm font-semibold text-slate-700">
            Property
            <select
              value={selectedPropertyId}
              disabled={isLoadingProperties || properties.length === 0}
              onChange={(event) =>
                setSelectedPropertyId(event.target.value || null)
              }
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
            >
              <option value="">
                {isLoadingProperties ? "Loading properties..." : "Select property"}
              </option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {serverError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {serverError}
        </div>
      )}

      {savedMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          {savedMessage}
        </div>
      )}

      {isError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          Failed to load booking policy.
        </div>
      ) : isLoadingPolicy || !policy ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
          Loading booking policy...
        </div>
      ) : (
        <>
          {isFetching && (
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Refreshing policy
            </div>
          )}
          <BookingPolicyForm
            form={form}
            readOnly={isManager}
            isSaving={isUpdating}
            onChange={setForm}
            onSubmit={handleSave}
          />
          {isManager && (
            <div className="flex justify-end">
              <Button type="button" disabled>
                Read-only
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
