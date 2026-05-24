import { useNavigate } from "react-router-dom";

import Button from "@/components/ui/Button";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { useAdminProperty } from "../hooks/useAdminProperty";
import PropertyStatusBadge from "./PropertyStatusBadge";

type Props = {
  id: string;
};

const detailRows = (
  property: NonNullable<ReturnType<typeof useAdminProperty>["data"]>,
) => [
  { label: "Property Name", value: property.name },
  { label: "Tenant", value: property.tenantName },
  { label: "Address", value: property.address },
  { label: "City", value: property.city },
  { label: "State", value: property.state },
  { label: "Enabled", value: property.isActive ? "Yes" : "No" },
];

export default function PropertyDetails({ id }: Props) {
  const navigate = useNavigate();
  const { data: property, isLoading, isError } = useAdminProperty(id);

  if (isLoading) {
    return <div className="text-slate-500">Loading property...</div>;
  }

  if (isError || !property) {
    return <div className="text-rose-600">Property not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {property.name}
          </h2>
          <p className="text-sm text-slate-500">
            {property.city}, {property.state}
          </p>
        </div>
        <PropertyStatusBadge status={property.status} />
      </div>

      <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {detailRows(property).map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <dt className="text-xs font-semibold uppercase text-slate-500">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex border-t border-slate-200 pt-4">
        <Button
          type="button"
          variant="dark"
          onClick={() => navigate(adminPath(ADMIN_ROUTES.PROPERTIES))}
        >
          Back to Properties
        </Button>
      </div>
    </div>
  );
}
