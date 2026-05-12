import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

import PropertyForm from "./PropertyForm";
import type { PropertyFormValues } from "./propertyForm.schema";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { useAdminProperties } from "../hooks/useAdminProperties";
import { useActiveTenants } from "@/features/admin/tenants/hooks/useAdminTenants";

export default function CreatePropertyForm() {
  const navigate = useNavigate();

  const { createProperty, isCreating } = useAdminProperties(1, 10, {
    search: "",
    status: "",
    isActive: "",
  });
  const { data: tenants = [], isLoading: isLoadingTenants } = useActiveTenants();

  const handleSubmit = (
    values: PropertyFormValues,
    setServerError: (msg: string) => void,
  ) => {
    createProperty(
      {
        tenantId: values.tenantId,
        name: values.name,
        address: values.address,
        city: values.city,
        state: values.state,
        status: values.status,
      },
      {
        onSuccess: () => {
          navigate(adminPath(ADMIN_ROUTES.PROPERTIES));
        },
        onError: (err) => {
          const message =
            (err as AxiosError<{ error?: { message?: string } }>)?.response
              ?.data?.error?.message ?? "Failed to create property";

          setServerError(message);
        },
      },
    );
  };

  return (
    <PropertyForm
      submitLabel="Create Property"
      tenantOptions={tenants}
      isSubmitting={isCreating || isLoadingTenants}
      onSubmit={handleSubmit}
      onCancel={() => navigate(adminPath(ADMIN_ROUTES.PROPERTIES))}
    />
  );
}
