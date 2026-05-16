import { Link } from "react-router-dom";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
const { FiKey, FiUser } = ICON_REGISTRY;

import { adminPath, ADMIN_ROUTES } from "@/configs/routePathsAdmin";
import { useDashboardContext } from "@/features/dashboard/hooks";

export default function AdminSettingsPage() {
  const { data: context, isLoading, isError } = useDashboardContext();

  return (
    <div className="space-y-6">
      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Failed to load settings context.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Link
          to={adminPath(ADMIN_ROUTES.PROFILE)}
          className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-slate-100 p-2 text-slate-600">
              <FiUser size={20} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update your name and contact details.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to={adminPath(ADMIN_ROUTES.CHANGE_PASSWORD)}
          className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-slate-100 p-2 text-slate-600">
              <FiKey size={20} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Security</h2>
              <p className="mt-1 text-sm text-slate-500">
                Change your password for dashboard access.
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Access Scope
          </h2>
        </div>

        <div className="grid gap-6 px-6 py-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Role
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {isLoading ? "..." : (context?.user.role ?? "Unknown")}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Enabled Modules
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {isLoading ? "..." : (context?.modules.length ?? 0)}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Accessible Properties
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(context?.properties ?? []).length === 0 ? (
              <span className="text-sm text-slate-500">
                No properties assigned yet.
              </span>
            ) : (
              (context?.properties ?? []).map((property) => (
                <span
                  key={property.id}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {property.name}
                </span>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
