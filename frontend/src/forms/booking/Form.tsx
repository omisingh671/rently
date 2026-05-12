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
  RadioGroupField,
  ErrorSummary,
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
      checkIn: "",
      checkOut: "",
      guests: 1,
      occupancyType: "single",
    },
  });

  const { handleSubmit, setError, reset } = methods;

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
      <div className="rounded-2xl border border-indigo-300/20 bg-[#20196a] p-5 shadow-xl shadow-black/20 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-indigo-300/20 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
              Check availability
            </p>
            {formTitleIntro && (
              <p className="mt-1 text-sm leading-6 text-indigo-100/80">
                {formTitleIntro}
              </p>
            )}
          </div>

          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-400/20 text-indigo-100 sm:inline-flex">
            <LuSearch className="h-5 w-5" />
          </span>
        </div>

        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(submit)}
            className="[&_.form-control_input]:border-indigo-200/20 [&_.form-control_input]:bg-white/95 [&_.form-control_input]:focus-visible:border-indigo-300 [&_.form-control_input]:focus-visible:ring-indigo-300 [&_.form-group]:mb-0 [&_.form-label]:text-indigo-100"
            noValidate
          >
            <ErrorSummary />

            <div className="grid grid-cols-1 gap-4">
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

            <div className="mt-6 flex flex-col gap-3 border-t border-indigo-300/20 pt-5 sm:flex-row">
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                disabled={isSubmitting}
                className="h-11"
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
                fullWidth
                outline
                onClick={() => reset()}
                onDark
                className="h-11 sm:max-w-32"
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
