import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

import UnitsTable from "@/features/units/components/UnitsTable";
import UnitsFilters from "@/features/units/components/UnitsFilters";
import UnitForm from "@/features/units/components/UnitForm/UnitForm";

import Pagination from "@/components/common/Pagination";
import PageSizeSelector from "@/components/common/PageSizeSelector";

import { useAdminUnits } from "@/features/units/hooks/useAdminUnits";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";

import { useAdminListState } from "@/hooks/admin/useAdminListState";

import type { AdminUnit, UnitStatus } from "@/features/units/types";

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
    properties,
    selectedPropertyId,
    setSelectedPropertyId,
    isLoading: isLoadingProperties,
    isError: isPropertiesError,
  } = useCurrentProperty();

  useEffect(() => {
    if (selectedPropertyId && filters.propertyId !== selectedPropertyId) {
      setFilters((prev) => ({
        ...prev,
        propertyId: selectedPropertyId,
      }));
      return;
    }

    if (!selectedPropertyId && filters.propertyId) {
      setFilters((prev) => ({
        ...prev,
        propertyId: "",
      }));
    }
  }, [filters.propertyId, selectedPropertyId, setFilters]);

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
  const visiblePagination =
    data?.pagination && data.pagination.total > pageSize
      ? data.pagination
      : null;

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
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:justify-between">
        <UnitsFilters
          properties={properties}
          propertyId={filters.propertyId}
          search={filters.search}
          status={filters.status}
          isActive={filters.isActive}
          onChange={(next) => {
            if (next.propertyId) {
              setSelectedPropertyId(next.propertyId);
            }
            setFilters(next);
          }}
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
