import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

import PropertyForm from "./PropertyForm";
import type { PropertyFormValues } from "./propertyForm.schema";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { useAdminProperty } from "../hooks/useAdminProperty";
import { useActiveTenants } from "@/features/admin/tenants/hooks/useAdminTenants";

export default function EditPropertyForm({ id }: { id: string }) {
  const navigate = useNavigate();

  const {
    data: property,
    isLoading,
    updateProperty,
    isUpdating,
  } = useAdminProperty(id);
  const { data: tenants = [], isLoading: isLoadingTenants } = useActiveTenants();

  if (isLoading || isLoadingTenants) {
    return <div className="text-slate-500">Loading property…</div>;
  }

  if (!property) {
    return <div className="text-rose-600">Property not found</div>;
  }

  const handleSubmit = (
    values: PropertyFormValues,
    setServerError: (msg: string) => void,
  ) => {
    updateProperty(
      {
        tenantId: values.tenantId,
        name: values.name,
        address: values.address,
        city: values.city,
        state: values.state,
        status: values.status,
        isActive: values.isActive === "true",
      },
      {
        onSuccess: () => {
          navigate(adminPath(ADMIN_ROUTES.PROPERTIES));
        },
        onError: (err) => {
          const message =
            (err as AxiosError<{ error?: { message?: string } }>)?.response
              ?.data?.error?.message ?? "Failed to update property";

          setServerError(message);
        },
      },
    );
  };

  return (
    <PropertyForm
      submitLabel="Save Changes"
      isSubmitting={isUpdating}
      tenantOptions={tenants}
      defaultValues={{
        tenantId: property.tenantId,
        name: property.name,
        address: property.address,
        city: property.city,
        state: property.state,
        status: property.status,
        isActive: property.isActive ? "true" : "false",
      }}
      onSubmit={handleSubmit}
      onCancel={() => navigate(adminPath(ADMIN_ROUTES.PROPERTIES))}
    />
  );
}
