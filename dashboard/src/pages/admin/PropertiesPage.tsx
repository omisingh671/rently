import { useEffect } from "react";
import { Link } from "react-router-dom";

import Button from "@/components/ui/Button";

import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";

import { useAdminProperties } from "@/features/properties/hooks/useAdminProperties";
import PropertiesTable from "@/features/properties/components/PropertiesTable";
import PropertiesFilters from "@/features/properties/components/PropertiesFilters";

import Pagination from "@/components/common/Pagination";
import PageSizeSelector from "@/components/common/PageSizeSelector";

import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { useAuthStore } from "@/stores/authStore";

import type { PropertyStatus } from "@/features/properties/types";

type Filters = {
  search: string;
  status: PropertyStatus | "";
  isActive: "" | "true" | "false";
};

export default function PropertiesPage() {
  const user = useAuthStore((state) => state.user);
  const canManage = user?.role === "SUPER_ADMIN";

  const {
    page,
    pageSize,
    filters,
    debouncedSearch,
    setPage,
    setPageSize,
    setFilters,
  } = useAdminListState<Filters>({
    search: "",
    status: "",
    isActive: "",
  });

  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.isActive, setPage]);

  const { data, isPending, isFetching, isError, updateProperty, isUpdating } =
    useAdminProperties(page, pageSize, {
      search: debouncedSearch,
      status: filters.status,
      isActive: filters.isActive,
    });

  if (isError) {
    return (
      <div className="rounded border border-rose-300 bg-rose-50 p-4 text-rose-700">
        Failed to load properties
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col-reverse lg:flex-row justify-between gap-4">
        <PropertiesFilters {...filters} onChange={(next) => setFilters(next)} />

        {canManage && (
          <Link to={adminPath(ADMIN_ROUTES.PROPERTIES, "create")}>
            <Button>Create Property</Button>
          </Link>
        )}
      </div>

      {/* Table */}
      <PropertiesTable
        search={debouncedSearch}
        items={data?.items ?? []}
        page={page}
        pageSize={pageSize}
        isPending={isPending}
        isFetching={isFetching}
        isUpdating={isUpdating}
        canManage={canManage}
        onUpdate={updateProperty}
      />

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <PageSizeSelector value={pageSize} onChange={setPageSize} />

          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
