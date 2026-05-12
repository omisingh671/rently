import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold mb-1">Forgot password</h1>

      <p className="text-sm text-muted mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <ForgotPasswordForm />
    </>
  );
}
