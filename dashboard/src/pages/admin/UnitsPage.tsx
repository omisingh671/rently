import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

import UnitsTable from "@/features/admin/units/components/UnitsTable";
import UnitsFilters from "@/features/admin/units/components/UnitsFilters";
import UnitForm from "@/features/admin/units/components/UnitForm/UnitForm";

import Pagination from "@/components/common/Pagination";
import PageSizeSelector from "@/components/common/PageSizeSelector";

import { useAdminUnits } from "@/features/admin/units/hooks/useAdminUnits";
import { useAdminProperties } from "@/features/admin/properties/hooks/useAdminProperties";

import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/admin/config/queryLimits";

import type { AdminUnit, UnitStatus } from "@/features/admin/units/types";

type Filters = {
  propertyId: string;
  search: string;
  status: "" | UnitStatus;
  isActive: "" | "true" | "false";
};

export default function UnitsPage() {
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
    status: "",
    isActive: "",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<AdminUnit | null>(null);

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
  }, [properties, filters.propertyId, setFilters]);

  useEffect(() => {
    setPage(1);
  }, [filters.propertyId, filters.status, filters.isActive, setPage]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    createUnit,
    updateUnit,
    isCreating,
    isUpdating,
  } = useAdminUnits(filters.propertyId, page, pageSize, {
    search: debouncedSearch,
    status: filters.status,
    isActive: filters.isActive,
  });

  const handleCreate = () => {
    setEditingUnit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (unit: AdminUnit) => {
    setEditingUnit(unit);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUnit(null);
  };

  return (
    <div className="space-y-4">
      {/* Header + Filters */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <UnitsFilters
          properties={properties}
          propertyId={filters.propertyId}
          search={filters.search}
          status={filters.status}
          isActive={filters.isActive}
          onChange={(next) => setFilters(next)}
        />

        <Button
          disabled={!filters.propertyId || isLoadingProperties || isPropertiesError}
          onClick={handleCreate}
        >
          Create Unit
        </Button>
      </div>

      {/* Table */}
      <UnitsTable
        items={data?.items}
        page={page}
        pageSize={pageSize}
        search={debouncedSearch}
        isPending={Boolean(filters.propertyId) && isPending}
        isFetching={isFetching}
        isError={isError}
        emptyMessage={
          !filters.propertyId
            ? "Select a property to view units."
            : "No units found for this property."
        }
        isUpdating={isUpdating}
        onUpdate={(args) => {
          void updateUnit(args);
        }}
        onEdit={handleEdit}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        disableBackdropClose
        disableEscapeClose
        title={editingUnit ? "Edit Unit" : "Create Unit"}
        size="xl"
      >
        <UnitForm
          properties={properties}
          submitLabel={editingUnit ? "Save Changes" : "Create Unit"}
          defaultValues={
            editingUnit
              ? {
                  propertyId: editingUnit.propertyId,
                  unitNumber: editingUnit.unitNumber,
                  floor: editingUnit.floor,
                  status: editingUnit.status,
                  isActive: editingUnit.isActive,
                  amenityIds: editingUnit.amenityIds ?? [],
                }
              : {
                  propertyId: filters.propertyId,
                  unitNumber: "",
                  floor: 1,
                  status: "ACTIVE",
                  isActive: true,
                  amenityIds: [],
                }
          }
          isSubmitting={isCreating || isUpdating}
          onSubmit={(values, setServerError) => {
            if (editingUnit) {
              updateUnit({ unitId: editingUnit.id, payload: values })
                .then(() => handleCloseModal())
                .catch(() => setServerError("Failed to update unit"));
            } else {
              createUnit(values)
                .then(() => handleCloseModal())
                .catch(() => setServerError("Failed to create unit"));
            }
          }}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
