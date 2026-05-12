import { useParams, Link } from "react-router-dom";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";
import { ROUTES } from "@/configs/routePaths";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return (
      <p className="text-sm text-danger">Invalid or missing reset token.</p>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold mb-1">Reset password</h1>

      <p className="text-sm text-muted mb-6">
        Choose a new password for your account.
      </p>

      <ResetPasswordForm token={token} />

      <div className="mt-6 text-sm">
        <Link to={ROUTES.LOGIN} className="text-primary hover:underline">
          Back to login
        </Link>
      </div>
    </>
  );
}
