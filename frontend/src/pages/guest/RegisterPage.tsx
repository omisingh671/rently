import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import RegisterForm from "@/features/auth/components/RegisterForm";
import RegisterSuccess from "@/features/auth/components/RegisterSuccess";
import { ROUTES } from "@/configs/routePaths";

export default function RegisterPage() {
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  /**
   * ✅ After successful registration
   * - User is authenticated
   * - Stay on /register
   * - Allow success UI ONCE (navigation state)
   */
  if (showSuccess) {
    return <RegisterSuccess />;
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">
        Create an account
      </h1>

      <p className="text-sm text-muted mb-6">
        Sign up to get started with Sucasa
      </p>

      <RegisterForm
        onSuccess={() => {
          navigate(".", {
            replace: true,
            state: { allowRegisterSuccess: true },
          });

          setShowSuccess(true);
        }}
      />

      <div className="text-center text-sm text-muted mt-6">
        Already have an account?{" "}
        <Link
          to={ROUTES.LOGIN}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </div>
    </>
  );
}
