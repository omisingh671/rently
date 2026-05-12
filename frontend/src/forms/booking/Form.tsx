import { useEffect } from "react";
import { useForm, FormProvider, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  LuLoader,
  LuRotateCcw,
  LuCalendar,
  LuUsers,
  LuBed,
} from "react-icons/lu";

import BookingFormSchema, {
  type BookingFormValues,
  type BookingFormParsedValues,
} from "./formSchema";

import { InputField, ErrorSummary } from "@/components/inputs";
import Button from "@/components/ui/Button";

/* ─────────────────────────────────────────────
   Inline Occupancy Toggle — styled pill chips
───────────────────────────────────────────── */
function OccupancyToggle() {
  const { register, setValue, control } = useFormContext<BookingFormValues>();
  const selected = useWatch({ control, name: "occupancyType" });

  const options: { label: string; value: BookingFormValues["occupancyType"] }[] = [
    { label: "Single", value: "single" },
    { label: "Double", value: "double" },
  ];

  return (
    <div className="form-group">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-200">
        <LuBed className="h-3.5 w-3.5 opacity-70" />
        Occupancy type
      </p>

      {/* Hidden real input keeps RHF in sync */}
      <input type="hidden" {...register("occupancyType")} />

      <div className="flex gap-2">
        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                setValue("occupancyType", opt.value, { shouldValidate: true })
              }
              className={[
                "flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer",
                active
                  ? "border-indigo-400 bg-indigo-500/30 text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                  : "border-indigo-300/20 bg-white/5 text-indigo-200/70 hover:bg-white/10 hover:border-indigo-300/40 hover:text-indigo-100",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main BookingForm
───────────────────────────────────────────── */
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

    setError("root", { type: "server", message });
  }, [serverError, setError]);

  const submit = (values: BookingFormValues) => {
    const parsed = BookingFormSchema.parse(values);
    return onSubmit(parsed);
  };

  return (
    <div className={className}>
      {/* Gradient glow border wrapper */}
      <div
        className="relative rounded-2xl p-px"
        style={{
          background:
            "linear-gradient(135deg, rgba(129,140,248,0.5) 0%, rgba(99,102,241,0.18) 50%, rgba(129,140,248,0.4) 100%)",
        }}
      >
        <div className="rounded-[calc(1rem-1px)] bg-[#1a1461] p-[43px] sm:p-[51px]">


          {/* ── Form ── */}
          <FormProvider {...methods}>
            <form
              onSubmit={handleSubmit(submit)}
              className={[
                /* Override form-control input colours for dark surface */
                "[&_.form-control_input]:border-indigo-300/20",
                "[&_.form-control_input]:bg-[#1e1880]",
                "[&_.form-control_input]:text-indigo-50",
                "[&_.form-control_input]:placeholder:text-indigo-300/40",
                "[&_.form-control_input]:focus-visible:border-indigo-400",
                "[&_.form-control_input]:focus-visible:ring-indigo-400/40",
                "[&_.form-control_input]:rounded-xl",
                "[&_.form-control_input]:py-3",
                /* Make the native calendar/clock icons visible on dark bg */
                "[&_.form-control_input[type=date]]:[color-scheme:dark]",
                "[&_.form-control_input[type=date]]:text-indigo-100",
                /* Remove default label styles (replaced inline) */
                "[&_.form-group]:mb-0",
                "[&_.form-label]:hidden",
              ].join(" ")}
              noValidate
            >
              <ErrorSummary />

              <div className="flex flex-col gap-4">

                {/* Date row — side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-200">
                      <LuCalendar className="h-3.5 w-3.5 opacity-70" />
                      Check-in
                    </p>
                    <InputField name="checkIn" type="date" required />
                  </div>
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-200">
                      <LuCalendar className="h-3.5 w-3.5 opacity-70" />
                      Check-out
                    </p>
                    <InputField name="checkOut" type="date" required />
                  </div>
                </div>

                {/* Guests */}
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-200">
                    <LuUsers className="h-3.5 w-3.5 opacity-70" />
                    Guests
                  </p>
                  <InputField
                    name="guests"
                    type="number"
                    min={1}
                    step={1}
                    required
                  />
                </div>

                {/* Occupancy pill toggle */}
                <OccupancyToggle />
              </div>

              {/* ── Actions ── */}
              <div className="mt-5 flex flex-col gap-2.5 border-t border-indigo-300/15 pt-5 sm:flex-row">
                <Button
                  type="submit"
                  variant="accent"
                  size="md"
                  fullWidth
                  disabled={isSubmitting}
                  className="h-11 rounded-xl text-sm font-semibold tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.38)] hover:shadow-[0_0_28px_rgba(245,158,11,0.58)] transition-shadow"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <LuLoader className="h-4 w-4 animate-spin" />
                      Checking…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Check Availability
                    </span>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => reset()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-300/20 bg-white/5 px-5 text-sm font-medium text-indigo-200 transition-all hover:bg-white/10 hover:border-indigo-300/40 hover:text-indigo-100 cursor-pointer sm:w-auto sm:shrink-0"
                >
                  <LuRotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
