import {
  useForm,
  FormProvider,
  useWatch,
  type SubmitHandler,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import { LuLoader, LuSend, LuRotateCcw } from "react-icons/lu";

import CountryDialCodeInput from "@/components/inputs/CountryDialCodeInput";
import Button from "@/components/ui/Button";
import { ErrorSummary } from "@/components/inputs/ErrorSummary";
import { normalizeApiError } from "@/utils/errors";

import EnquiryFormSchema, { type EnquiryFormValues } from "./formSchema";

const resolver = zodResolver(EnquiryFormSchema) as unknown as Resolver<
  EnquiryFormValues,
  unknown
>;

interface EnquiryFormProps {
  title?: string;
  description?: React.ReactNode;
  className?: string;
  onSubmit: (
    data: EnquiryFormValues & { fullContactNumber: string },
  ) => Promise<void>;
  disabled?: boolean;
  resetOnSuccess?: boolean;
  variant?: "light" | "dark";
  onInputChange?: () => void;
}

export default function EnquiryForm({
  title = "Send an Enquiry",
  description,
  className,
  onSubmit,
  disabled = false,
  resetOnSuccess = false,
  variant = "light",
  onInputChange,
}: EnquiryFormProps) {
  const styles =
    variant === "dark"
      ? {
          title: "text-slate-100",
          desc: "text-slate-300",
          label: "text-slate-200",
          error: "text-red-400",
        }
      : {
          title: "text-slate-800",
          desc: "text-slate-500",
          label: "text-slate-700",
          error: "text-red-600",
        };

  const methods = useForm<EnquiryFormValues>({
    mode: "onBlur",
    reValidateMode: "onChange",
    resolver,
    defaultValues: {
      name: "",
      email: "",
      countryCode: "+91",
      contactNumber: "",
      message: "",
    },
  });

  const {
    handleSubmit,
    register,
    control,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = methods;

  // watch primitive fields only
  const name = useWatch({ control, name: "name" });
  const email = useWatch({ control, name: "email" });
  const contactNumber = useWatch({ control, name: "contactNumber" });
  const message = useWatch({ control, name: "message" });

  /**
   * Auto-clear SERVER ERROR on input change
   */
  useEffect(() => {
    clearErrors("root.server");
    onInputChange?.();
  }, [name, email, contactNumber, message, clearErrors, onInputChange]);

  /**
   * Reset form fields on successful submit
   */
  useEffect(() => {
    if (resetOnSuccess) {
      reset();
    }
  }, [resetOnSuccess, reset]);

  const submit: SubmitHandler<EnquiryFormValues> = async (vals) => {
    try {
      const fullContactNumber = `${vals.countryCode}-${vals.contactNumber}`;
      await onSubmit({ ...vals, fullContactNumber });
    } catch (error) {
      setError("root.server", {
        type: "server",
        message:
          normalizeApiError(error).message ||
          "Failed to send enquiry. Please try again.",
      });
    }
  };

  return (
    <div className={className}>
      <div className="sm:p-6 p-4">
        {title && (
          <h3 className={`heading-sm font-semibold mb-2 ${styles.title}`}>
            {title}
          </h3>
        )}

        {description && (
          <p className={`text-sm mb-4 ${styles.desc}`}>{description}</p>
        )}

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(submit)} noValidate>
            <ErrorSummary />

            {/* Name */}
            <div className="form-group">
              <label className={`form-label ${styles.label}`}>Name</label>
              <div className="form-control">
                <input {...register("name")} placeholder="Your full name" />
              </div>
              {errors.name && (
                <p className={`form-error ${styles.error}`}>
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email + Phone */}
            <div className="form-group grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`form-label ${styles.label}`}>Email</label>
                <div className="form-control">
                  <input {...register("email")} placeholder="you@example.com" />
                </div>
                {errors.email && (
                  <p className={`form-error ${styles.error}`}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className={`form-label ${styles.label}`}>
                  Contact number
                </label>

                <div
                  className={`input-group ${
                    errors.contactNumber ? "error" : ""
                  }`}
                >
                  <div className="pre-input">
                    <CountryDialCodeInput
                      name="countryCode"
                      control={control}
                      renderSelectOnly={false}
                      useNativeSelectOnMobile={false}
                      selectClass="w-full h-full bg-transparent"
                    />
                  </div>

                  <div className="main-input">
                    <input
                      {...register("contactNumber")}
                      placeholder="9876543210"
                      inputMode="tel"
                    />
                  </div>
                </div>

                {errors.contactNumber && (
                  <p className={`form-error ${styles.error}`}>
                    {errors.contactNumber.message}
                  </p>
                )}
              </div>
            </div>

            {/* Message */}
            <div className="form-group">
              <label className={`form-label ${styles.label}`}>Message</label>
              <div className="form-control">
                <textarea
                  {...register("message")}
                  rows={4}
                  placeholder="Tell us about your stay requirements..."
                />
              </div>
              {errors.message && (
                <p className={`form-error ${styles.error}`}>
                  {errors.message.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="form-actions flex gap-3 mt-4">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={disabled || isSubmitting}
              >
                {disabled || isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <LuLoader className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <LuSend className="h-4 w-4" />
                    Send Message
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="dark"
                size="md"
                onClick={() => reset()}
                disabled={disabled}
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
