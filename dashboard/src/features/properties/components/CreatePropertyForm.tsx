import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

import PropertyForm from "./PropertyForm";
import type { PropertyFormValues } from "./propertyForm.schema";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { useAdminProperties } from "../hooks/useAdminProperties";
import { useActiveTenants } from "@/features/tenants/hooks/useAdminTenants";

const optionalText = (value: string | undefined) =>
  value?.trim() ? value.trim() : null;

const optionalNumber = (value: string | undefined) =>
  value?.trim() ? Number(value) : null;

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

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
    setServerError: (
      msg: string,
      field?: keyof PropertyFormValues,
    ) => void,
  ) => {
    createProperty(
      {
        tenantId: values.tenantId,
        name: values.name,
        address: values.address,
        city: values.city,
        state: values.state,
        supportEmail: optionalText(values.supportEmail),
        supportPhone: optionalText(values.supportPhone),
        latitude: optionalNumber(values.latitude),
        longitude: optionalNumber(values.longitude),
        status: values.status,
      },
      {
        onSuccess: () => {
          navigate(adminPath(ADMIN_ROUTES.PROPERTIES));
        },
        onError: (err) => {
          const apiError = (err as AxiosError<ApiErrorResponse>).response?.data
            ?.error;
          const message = apiError?.message ?? "Failed to create property";

          setServerError(
            message,
            apiError?.code === "PROPERTY_EXISTS" ? "slug" : undefined,
          );
        },
      },
    );
  };

  return (
    <PropertyForm
      isCreateMode
      submitLabel="Create Property"
      tenantOptions={tenants}
      isSubmitting={isCreating || isLoadingTenants}
      onSubmit={handleSubmit}
      onCancel={() => navigate(adminPath(ADMIN_ROUTES.PROPERTIES))}
    />
  );
}
