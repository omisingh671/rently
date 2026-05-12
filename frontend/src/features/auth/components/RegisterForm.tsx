import { useEffect } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import { InputField } from "@/components/inputs/InputField/InputField";
import { ErrorSummary } from "@/components/inputs/ErrorSummary";
import CountryDialCodeInput from "@/components/inputs/CountryDialCodeInput";

import { useRegister } from "@/features/auth/hooks";
import type { RegisterPayload } from "@/features/auth/types";
import { registerSchema, type RegisterFormValues } from "./register.schema";

type RegisterFormProps = {
  onSuccess: () => void;
};

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const registerMutation = useRegister();

  const methods = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      countryCode: "+91",
      contactNumber: "",
    },
  });

  const {
    handleSubmit,
    setError,
    clearErrors,
    control,
    register,
    formState: { errors },
  } = methods;

  const onSubmit = (data: RegisterFormValues) => {
    clearErrors("root.server");

    const payload: RegisterPayload = {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      ...(data.countryCode &&
        data.contactNumber && {
          countryCode: data.countryCode,
          contactNumber: data.contactNumber,
        }),
    };

    registerMutation.mutate(payload, {
      onError: (error) => {
        setError("root.server", {
          type: "server",
          message: error.message,
        });
      },
    });
  };

  /* 🔹 Clear server error on ANY input change */
  const fullName = useWatch({ control, name: "fullName" });
  const email = useWatch({ control, name: "email" });
  const contactNumber = useWatch({ control, name: "contactNumber" });
  const password = useWatch({ control, name: "password" });
  const confirmPassword = useWatch({ control, name: "confirmPassword" });

  useEffect(() => {
    clearErrors("root.server");
  }, [fullName, email, contactNumber, password, confirmPassword, clearErrors]);

  /* 🔹 Notify page on success */
  useEffect(() => {
    if (registerMutation.isSuccess) {
      onSuccess();
    }
  }, [registerMutation.isSuccess, onSuccess]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <ErrorSummary />

        <InputField id="fullName" name="fullName" label="Full name" required />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField
            id="name"
            name="email"
            label="Email"
            type="email"
            required
          />

          <div>
            <label className="form-label">Contact number</label>

            <div
              className={`input-group text-gray-700 ${errors.contactNumber ? "error" : ""}`}
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
                  id="contactNumber"
                  {...register("contactNumber")}
                  placeholder="9876543210"
                  inputMode="tel"
                />
              </div>
            </div>

            {errors.contactNumber && (
              <p className="form-error">{errors.contactNumber.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField
            id="password"
            name="password"
            label="Password"
            type="password"
            required
          />

          <InputField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm password"
            type="password"
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </FormProvider>
  );
}
