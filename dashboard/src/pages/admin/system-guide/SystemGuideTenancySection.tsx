import { ICON_REGISTRY } from "@/configs/iconRegistry";

const {
  FiBriefcase,
  FiHome,
} = ICON_REGISTRY;

export function SystemGuideTenancySection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Multi-Tenancy & Properties
        </h1>
        <p className="mt-2 text-slate-500">
          Understanding how Rently isolates database workspaces for
          different brand environments and routes administrative scopes.
        </p>
      </div>

      <hr className="border-slate-100" />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-950">
          The Tenant vs Property Relationship
        </h3>
        <p className="text-sm text-slate-600">
          Rently isolates brand clients using a multi-tenant hierarchy.
          A **Tenant** represents the top-level organization/brand
          (e.g., "Grand Lodgings Group"), whereas a **Property** is a
          physical hotel, hostel, or apartment complex operated by that
          tenant (e.g., "Grand Lodgings - Downtown Express").
        </p>

        {/* Tenant Hierarchy CSS Block */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <FiBriefcase className="text-blue-600" />
              <span className="text-sm font-semibold text-slate-900">
                Tenant (Brand Client Sandbox)
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Attributes: Name, URL Slug, Primary Domain, Brand Colors,
              Default Currency, Default Timezone.
            </p>

            <div className="mt-3 pl-6 border-l-2 border-slate-200 space-y-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-md">
                <div className="flex items-center gap-2">
                  <FiHome className="text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-900">
                    Property A (e.g. Beach Resort)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Scopes: Inventory, Bookings, Local Pricing, Staff
                  Allocations
                </p>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-md">
                <div className="flex items-center gap-2">
                  <FiHome className="text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-900">
                    Property B (e.g. City Suites)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Scopes: Inventory, Bookings, Local Pricing, Staff
                  Allocations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Practical Example */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-950">
          Example: Onboarding a New Property
        </h3>
        <p className="text-sm text-slate-600">
          To open a new hotel location for a brand, follow this
          operational checklist:
        </p>
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="flex gap-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs shrink-0">
              1
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Super Admin creates the Property record
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Go to <strong>Properties</strong>, click{" "}
                <strong>Create Property</strong>, fill in the Name,
                City, State, and select the corresponding Tenant client
                owner.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs shrink-0">
              2
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Assign Administration Scope
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Go to <strong>Assignments</strong>, and grant
                administrative access to the specific local Admin or
                Manager by linking their account with the property.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs shrink-0">
              3
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Establish Local Settings
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                The designated local Admin can now configure pricing,
                upload image gallery items, and create inventory rooms
                scoped exclusively under this new location.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

