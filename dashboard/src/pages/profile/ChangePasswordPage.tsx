import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

import { adminPath, ADMIN_ROUTES } from "@/configs/routePathsAdmin";
import ChangePasswordForm from "@/features/profile/components/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div className="space-y-5">
      <Link
        to={adminPath(ADMIN_ROUTES.SETTINGS)}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <FiArrowLeft size={16} />
        Back to settings
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm max-w-md overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-sm font-semibold text-slate-900">Change Password</h1>
          <p className="text-xs text-slate-500 mt-1">
            Update your password security for dashboard access.
          </p>
        </div>
        <div className="p-6">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
