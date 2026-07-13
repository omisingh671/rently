import { ICON_REGISTRY } from "@/configs/iconRegistry";

const {
  FiLink,
} = ICON_REGISTRY;

export function SystemGuidePermissionsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Access Control & Role Matrix
        </h1>
        <p className="mt-2 text-slate-500">
          Understand dashboard permissions, route guards, and action
          restrictions configured for Super Admins, Admins, and
          Managers.
        </p>
      </div>

      <hr className="border-slate-100" />

      {/* Role Permissions Matrix Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-3 font-semibold text-slate-700">
                Module Capability
              </th>
              <th className="p-3 font-semibold text-slate-700 text-center">
                Super Admin
              </th>
              <th className="p-3 font-semibold text-slate-700 text-center">
                Admin
              </th>
              <th className="p-3 font-semibold text-slate-700 text-center">
                Manager
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="p-3 text-slate-900 font-medium">
                Tenant & Brand Setup
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Full Global)
              </td>
              <td className="p-3 text-center text-slate-400">—</td>
              <td className="p-3 text-center text-slate-400">—</td>
            </tr>
            <tr>
              <td className="p-3 text-slate-900 font-medium">
                User Management (Staff Creation)
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Full Global)
              </td>
              <td className="p-3 text-center text-slate-400">—</td>
              <td className="p-3 text-center text-slate-400">—</td>
            </tr>
            <tr>
              <td className="p-3 text-slate-900 font-medium">
                Property Configurations
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Create/Edit)
              </td>
              <td className="p-3 text-center text-slate-400">—</td>
              <td className="p-3 text-center text-slate-400">—</td>
            </tr>
            <tr>
              <td className="p-3 text-slate-900 font-medium">
                Local Manager Creation
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Full Global)
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Only for assigned property)
              </td>
              <td className="p-3 text-center text-slate-400">—</td>
            </tr>
            <tr>
              <td className="p-3 text-slate-900 font-medium">
                Inventory (Units, Rooms, Gallery)
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Full)
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Scoped Property)
              </td>
              <td className="p-3 text-center text-slate-400">—</td>
            </tr>
            <tr>
              <td className="p-3 text-slate-900 font-medium">
                Pricing Configurations & Rules
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Full)
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Scoped Property)
              </td>
              <td className="p-3 text-center text-slate-400">—</td>
            </tr>
            <tr>
              <td className="p-3 text-slate-900 font-medium">
                Maintenance Blocks
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Full)
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Scoped Property)
              </td>
              <td className="p-3 text-center text-slate-400">—</td>
            </tr>
            <tr>
              <td className="p-3 text-slate-900 font-medium">
                Operations (Bookings, CRM, Quotes)
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Global)
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Scoped Property)
              </td>
              <td className="p-3 text-center text-emerald-600 font-bold">
                ✓ (Scoped Property)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Explaining PropertyAssignment scoping */}
      <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 text-blue-950 space-y-2">
        <h4 className="font-semibold flex items-center gap-2">
          <FiLink className="text-blue-600" />
          <span>Property Scoping Mechanism</span>
        </h4>
        <p className="text-sm text-blue-900/85">
          How does property restriction work? When an Admin or Manager
          logs in, the backend queries the{" "}
          <code>PropertyAssignment</code> table. If a user is not linked
          to a specific Property ID via a PropertyAssignment record,
          they will receive a <code>403 Forbidden</code> when attempting
          to fetch inventory, pricing, or bookings for that property.
        </p>
      </div>
    </div>
  );
}

