import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import PageSizeSelector from "@/components/common/PageSizeSelector";
import Pagination from "@/components/common/Pagination";

import AmenitiesTable from "@/features/amenities/components/AmenitiesTable";
import AmenitiesFilters from "@/features/amenities/components/AmenitiesFilters";
import AmenityForm from "@/features/amenities/components/AmenityForm/AmenityForm";

import { useAdminAmenities } from "@/features/amenities/hooks/useAdminAmenities";
import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";

import type { Amenity } from "@/features/amenities/types";

type Filters = {
  search: string;
  isActive: "" | "true" | "false";
};

export default function AmenitiesPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

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
    isActive: "",
  });

  const [modalState, setModalState] = useState<
    { type: "create" } | { type: "edit"; amenity: Amenity } | null
  >(null);

  useEffect(() => {
    setPage(1);
  }, [filters.isActive, setPage]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    createAmenity,
    updateAmenity,
    isCreating,
    isUpdating,
  } = useAdminAmenities(page, pageSize, {
    search: debouncedSearch,
    isActive: filters.isActive,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const visiblePagination =
    pagination && pagination.total > pageSize ? pagination : null;

  const handleCreate = (
    values: { name: string; icon?: string },
    setServerError: (message: string) => void,
  ) => {
    createAmenity(values)
      .then(() => setModalState(null))
      .catch((error) => setServerError(normalizeApiError(error).message));
  };

  const handleEdit = (amenity: Amenity) => {
    if (!isSuperAdmin) return;
    setModalState({ type: "edit", amenity });
  };

  const handleUpdate = (
    values: { name?: string; icon?: string },
    setServerError: (message: string) => void,
  ) => {
    if (modalState?.type !== "edit") return;

    updateAmenity({
      amenityId: modalState.amenity.id,
      payload: values,
    })
      .then(() => setModalState(null))
      .catch((error) => setServerError(normalizeApiError(error).message));
  };

  const handleToggle = (args: {
    amenityId: string;
    payload: { isActive?: boolean };
  }) => {
    if (!isSuperAdmin) return;
    void updateAmenity(args);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col-reverse gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:justify-between">
        <AmenitiesFilters
          search={filters.search}
          isActive={filters.isActive}
          onChange={(next) => setFilters(next)}
        />

        {isSuperAdmin && (
          <Button onClick={() => setModalState({ type: "create" })}>
            + Create Amenity
          </Button>
        )}
      </div>

      <AmenitiesTable
        items={items}
        page={page}
        pageSize={pageSize}
        search={debouncedSearch}
        isPending={isPending}
        isFetching={isFetching}
        isError={isError}
        emptyMessage="No amenities found."
        isUpdating={isUpdating}
        canManageCatalog={isSuperAdmin}
        onUpdate={handleToggle}
        onEdit={handleEdit}
      />

      {visiblePagination && (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <PageSizeSelector value={pageSize} onChange={setPageSize} />

          <Pagination
            page={visiblePagination.page}
            totalPages={visiblePagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {modalState && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">
              {modalState.type === "create" ? "Create Amenity" : "Edit Amenity"}
            </h2>

            <AmenityForm
              defaultValues={
                modalState.type === "edit"
                  ? {
                      name: modalState.amenity.name,
                      icon: modalState.amenity.icon ?? undefined,
                    }
                  : undefined
              }
              onSubmit={
                modalState.type === "create" ? handleCreate : handleUpdate
              }
              isSubmitting={isCreating || isUpdating}
              onCancel={() => setModalState(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
