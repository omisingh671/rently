import { useEffect, useState } from "react";
import { AxiosError } from "axios";

import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import BillingSettingsSection from "@/features/billing/components/BillingSettingsSection";
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
  const canEditSettings = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
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
  const [hydratedPropertyId, setHydratedPropertyId] = useState<string | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (policy && (!isDirty || hydratedPropertyId !== policy.propertyId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(mapPolicyToForm(policy));
      setHydratedPropertyId(policy.propertyId);
      setIsDirty(false);
      setServerError(null);
      setSavedMessage(null);
    }
  }, [hydratedPropertyId, isDirty, policy]);

  const handleFormChange = (nextForm: BookingPolicyFormState) => {
    setForm(nextForm);
    setIsDirty(true);
    setSavedMessage(null);
  };

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId || null);
    setHydratedPropertyId(null);
    setIsDirty(false);
    setServerError(null);
    setSavedMessage(null);
  };

  const handleSave = async () => {
    if (isUpdating) return;

    setServerError(null);
    setSavedMessage(null);

    try {
      const savedPolicy = await updatePolicy(mapFormToPayload(form));
      setForm(mapPolicyToForm(savedPolicy));
      setHydratedPropertyId(savedPolicy.propertyId);
      setIsDirty(false);
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
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 shadow-sm">
        No accessible properties found.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">
                Booking & Cancellation Policy
              </h1>
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  isManager
                    ? "bg-slate-100 text-slate-600"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {isManager ? "Read-only" : "Editable"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Configure upfront payment, cancellation, refund, early checkout,
              and no-show rules for the selected property.
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {isManager
                ? "Manager view is read-only"
                : "Policy changes apply only to new bookings"}
            </p>
          </div>

          <label className="block w-full text-sm font-semibold text-slate-700 lg:w-[320px]">
            Property
            <select
              value={selectedPropertyId}
              disabled={isLoadingProperties || properties.length === 0}
              onChange={(event) =>
                handlePropertyChange(event.target.value)
              }
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
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
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
          {serverError}
        </div>
      )}

      {savedMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
          {savedMessage}
        </div>
      )}

      {isError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 shadow-sm">
          Failed to load booking policy.
        </div>
      ) : isLoadingPolicy || !policy ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
          Loading booking policy...
        </div>
      ) : (
        <>
          {isFetching && (
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 shadow-sm">
              Refreshing policy
            </div>
          )}
          <BookingPolicyForm
            form={form}
            readOnly={isManager}
            isSaving={isUpdating}
            onChange={handleFormChange}
            onSubmit={handleSave}
          />
          {isManager && (
            <div className="flex justify-end">
              <Button type="button" disabled>
                Read-only
              </Button>
            </div>
          )}
          <BillingSettingsSection
            propertyId={selectedPropertyId || undefined}
            canEdit={canEditSettings}
          />
        </>
      )}
    </div>
  );
}
