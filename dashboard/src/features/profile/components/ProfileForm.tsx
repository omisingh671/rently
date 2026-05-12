import { useEffect } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { ErrorSummary } from "@/components/inputs";

import Button from "@/components/ui/Button";
import { InputField } from "@/components/inputs/InputField/InputField";
import CountryDialCodeInput from "@/components/inputs/CountryDialCodeInput";

import { useProfile, useUpdateProfile } from "@/features/profile/hooks";

/* ------------------------------------------------------------------
   Validation schema (profile-friendly, soft validation)
------------------------------------------------------------------- */
const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .optional()
    .or(z.literal("")),

  countryCode: z.string().trim().optional().or(z.literal("")),

  contactNumber: z
    .string()
    .trim()
    .regex(/^\d+$/, "Contact number must contain digits only")
    .min(7, "Contact number is too short")
    .max(15, "Contact number is too long")
    .optional()
    .or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const { data: user, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const methods = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: "",
      countryCode: "+91",
      contactNumber: "",
    },
  });

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty, isValid },
    setError,
    clearErrors,
  } = methods;

  /* Populate form when profile loads */
  useEffect(() => {
    if (!user) return;

    reset({
      fullName: user.fullName ?? "",
      countryCode: user.countryCode ?? "+91",
      contactNumber: user.contactNumber ?? "",
    });
  }, [user, reset]);

  const onSubmit = (values: ProfileFormValues) => {
    clearErrors("root.server");

    updateProfile.mutate(
      {
        fullName: values.fullName || undefined,
        countryCode: values.contactNumber ? values.countryCode : undefined,
        contactNumber: values.contactNumber || undefined,
      },
      {
        onError: (error) => {
          setError("root.server", {
            type: "server",
            message: error.message,
          });
        },
      },
    );
  };

  /**
   * Auto-clear server error when user edits inputs
   * (watch primitives only — no infinite loops)
   **/
  const fullName = useWatch({ control, name: "fullName" });
  const countryCode = useWatch({ control, name: "countryCode" });
  const contactNumber = useWatch({ control, name: "contactNumber" });

  useEffect(() => {
    clearErrors("root.server");
  }, [fullName, countryCode, contactNumber, clearErrors]);

  if (isLoading) {
    return <div className="text-slate-500">Loading profile…</div>;
  }

  if (!user) {
    return <div className="text-slate-500">Unable to load profile.</div>;
  }

  return (
    <>
      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 max-w-xl"
          noValidate
        >
          <ErrorSummary />

          {/* Full Name (standardized InputField) */}
          <InputField
            name="fullName"
            label="Full Name"
            placeholder="Your full name"
          />

          {/* Contact Number (compound input – intentionally custom) */}
          <div>
            <label className="form-label">Contact number</label>

            <div
              className={`input-group ${errors.contactNumber ? "error" : ""}`}
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
                  {...methods.register("contactNumber")}
                  placeholder="9876543210"
                  inputMode="tel"
                />
              </div>
            </div>

            {errors.contactNumber && (
              <p className="form-error">{errors.contactNumber.message}</p>
            )}
          </div>

          {/* Read-only info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-300">
            <div>
              <div className="text-xs text-slate-500">Email</div>
              <div className="font-medium text-slate-900">{user.email}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Role</div>
              <div className="font-medium text-slate-900 capitalize">
                {user.role}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <Button
              type="submit"
              disabled={!isDirty || !isValid || updateProfile.isPending}
            >
              {updateProfile.isPending ? "Saving…" : "Save Changes"}
            </Button>

            {updateProfile.isSuccess && (
              <span className="text-sm text-green-600">
                Profile updated successfully
              </span>
            )}
          </div>
        </form>
      </FormProvider>
    </>
  );
}
