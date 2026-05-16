import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";

import AmenitiesTable from "@/features/amenities/components/AmenitiesTable";
import AmenitiesFilters from "@/features/amenities/components/AmenitiesFilters";
import AmenityForm from "@/features/amenities/components/AmenityForm/AmenityForm";

import PageSizeSelector from "@/components/common/PageSizeSelector";
import Pagination from "@/components/common/Pagination";

import { useAdminAmenities } from "@/features/amenities/hooks/useAdminAmenities";
import { useAdminProperties } from "@/features/properties/hooks/useAdminProperties";
import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";

import type { Amenity } from "@/features/amenities/types";

type Filters = {
  propertyId: string;
  search: string;
  isActive: "" | "true" | "false";
};

export default function AmenitiesPage() {
  const {
    page,
    pageSize,
    filters,
    debouncedSearch,
    setPage,
    setPageSize,
    setFilters,
  } = useAdminListState<Filters>({
    propertyId: "",
    search: "",
    isActive: "",
  });

  const [modalState, setModalState] = useState<
    { type: "create" } | { type: "edit"; amenity: Amenity } | null
  >(null);

  const {
    data: propertiesData,
    isPending: isLoadingProperties,
    isError: isPropertiesError,
  } = useAdminProperties(1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    status: "",
    isActive: "true",
  });

  const properties = useMemo(
    () => propertiesData?.items ?? [],
    [propertiesData?.items],
  );

  useEffect(() => {
    if (!filters.propertyId && properties.length > 0) {
      setFilters((prev) => ({
        ...prev,
        propertyId: properties[0].id,
      }));
    }
  }, [filters.propertyId, properties, setFilters]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    createAmenity,
    updateAmenity,
    isCreating,
    isUpdating,
  } = useAdminAmenities(filters.propertyId, page, pageSize, {
    search: debouncedSearch,
    isActive: filters.isActive,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const handleCreate = (
    values: { name: string; icon?: string },
    setServerError: (message: string) => void,
  ) => {
    if (!filters.propertyId) {
      setServerError("Select a property before creating an amenity.");
      return;
    }

    createAmenity(values)
      .then(() => setModalState(null))
      .catch(() => setServerError("Failed to create amenity"));
  };

  const handleEdit = (amenity: Amenity) => {
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
      .catch(() => setServerError("Failed to update amenity"));
  };

  const handleToggle = (args: {
    amenityId: string;
    payload: { isActive?: boolean };
  }) => {
    void updateAmenity(args);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col-reverse lg:flex-row justify-between gap-4">
        <AmenitiesFilters
          properties={properties}
          propertyId={filters.propertyId}
          search={filters.search}
          isActive={filters.isActive}
          onChange={(next) => setFilters(next)}
        />

        <Button
          disabled={!filters.propertyId || isLoadingProperties || isPropertiesError}
          onClick={() => setModalState({ type: "create" })}
        >
          + Create Amenity
        </Button>
      </div>

      <AmenitiesTable
        items={items}
        page={page}
        pageSize={pageSize}
        search={debouncedSearch}
        isPending={Boolean(filters.propertyId) && isPending}
        isFetching={isFetching}
        isError={isError}
        emptyMessage={
          !filters.propertyId
            ? "Select a property to view amenities."
            : "No amenities found for this property."
        }
        isUpdating={isUpdating}
        onUpdate={handleToggle}
        onEdit={handleEdit}
      />

      <div className="flex items-center justify-between">
        <PageSizeSelector value={pageSize} onChange={setPageSize} />

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {modalState && (
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
