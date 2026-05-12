import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { LuLoader, LuSearch, LuRotateCcw } from "react-icons/lu";

import BookingFormSchema, {
  type BookingFormValues,
  type BookingFormParsedValues,
} from "./formSchema";

import {
  InputField,
  InputControl,
  RadioGroupField,
  CompositeField,
  ErrorSummary,
  FormMetaFields,
  CountryDialCodeInput,
} from "@/components/inputs";

import Button from "@/components/ui/Button";

interface BookingFormProps {
  className?: string;
  formTitleIntro?: string;
  onSubmit: (values: BookingFormParsedValues) => Promise<void>;
  isSubmitting?: boolean;
  serverError?: unknown;
}

export default function BookingForm({
  className,
  formTitleIntro,
  onSubmit,
  isSubmitting = false,
  serverError,
}: BookingFormProps) {
  const methods = useForm<BookingFormValues>({
    resolver: zodResolver(BookingFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      countryCode: "+91",
      contactNumber: "",
      checkIn: "",
      checkOut: "",
      guests: 1,
      occupancyType: "single",
    },
  });

  const { handleSubmit, setError, reset, control } = methods;

  useEffect(() => {
    if (!serverError) return;

    let message = "Failed to check availability.";

    if (serverError instanceof Error && serverError.message) {
      message = serverError.message;
    }

    setError("root", {
      type: "server",
      message,
    });
  }, [serverError, setError]);

  const submit = (values: BookingFormValues) => {
    const parsed = BookingFormSchema.parse(values);
    return onSubmit(parsed);
  };

  return (
    <div className={className}>
      <div className="p-4 sm:p-6">
        {formTitleIntro && (
          <p className="mb-4 text-sm text-slate-700">{formTitleIntro}</p>
        )}

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(submit)} noValidate>
            <ErrorSummary />

            {/* <input type="hidden" {...register("source")} /> */}
            <FormMetaFields source="homepage-hero" campaign="spring-sale" />

            <InputField
              name="name"
              label="Name"
              placeholder="Your full name"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                name="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                required
              />

              <CompositeField name="contactNumber" label="Contact number">
                <div className="input-group">
                  <div className="pre-input">
                    <CountryDialCodeInput
                      name="countryCode"
                      control={control}
                    />
                  </div>

                  <div className="main-input">
                    <InputControl
                      name="contactNumber"
                      type="tel"
                      placeholder="1234567890"
                      inputMode="tel"
                    />
                  </div>
                </div>
              </CompositeField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                name="checkIn"
                label="Check-in"
                type="date"
                required
              />
              <InputField
                name="checkOut"
                label="Check-out"
                type="date"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                name="guests"
                label="Guests"
                type="number"
                min={1}
                step={1}
                required
              />

              <RadioGroupField
                layout="horizontal"
                name="occupancyType"
                label="Occupancy type"
                options={[
                  { label: "Single", value: "single" },
                  { label: "Double", value: "double" },
                ]}
              />
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <LuLoader className="h-4 w-4 animate-spin" />
                    Checking...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <LuSearch className="h-4 w-4" />
                    Check availability
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="dark"
                size="md"
                onClick={() => reset()}
              >
                <LuRotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
