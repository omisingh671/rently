import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/common/Pagination";
import PageSizeSelector from "@/components/common/PageSizeSelector";
import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import MaintenanceFilters from "@/features/maintenance/components/MaintenanceFilters";
import MaintenanceForm from "@/features/maintenance/components/MaintenanceForm/MaintenanceForm";
import type { MaintenanceFormValues } from "@/features/maintenance/components/MaintenanceForm/maintenance.schema";
import MaintenanceTable from "@/features/maintenance/components/MaintenanceTable";
import { useAdminMaintenance } from "@/features/maintenance/hooks/useAdminMaintenance";
import type {
  AdminMaintenanceBlock,
  MaintenanceTargetType,
} from "@/features/maintenance/types";

type Filters = {
  propertyId: string;
  search: string;
  targetType: MaintenanceTargetType | "";
};

const toDateInputValue = (value: string) => value.slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toInclusiveEndDateInputValue = (value: string) =>
  addDays(new Date(value), -1).toISOString().slice(0, 10);

const toExclusiveEndDateValue = (value: string) =>
  addDays(new Date(`${value}T00:00:00.000Z`), 1).toISOString().slice(0, 10);

export default function MaintenancePage() {
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
    targetType: "",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] =
    useState<AdminMaintenanceBlock | null>(null);

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
  }, [filters.propertyId, filters.targetType, setPage]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAdminMaintenance(filters.propertyId, page, pageSize, {
    search: debouncedSearch,
    targetType: filters.targetType,
  });
  const visiblePagination =
    data?.pagination && data.pagination.total > pageSize
      ? data.pagination
      : null;

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBlock(null);
  };

  const maintenanceFormDefaults = useMemo<MaintenanceFormValues>(
    () =>
      editingBlock
        ? {
            propertyId: editingBlock.propertyId,
            targetType: editingBlock.targetType,
            unitId: editingBlock.unitId ?? "",
            roomId: editingBlock.roomId ?? "",
            reason: editingBlock.reason ?? "",
            status: editingBlock.status,
            priority: editingBlock.priority,
            resolutionNote: editingBlock.resolutionNote ?? "",
            emergencyOverride: false,
            emergencyReason: "",
            startDate: toDateInputValue(editingBlock.startDate),
            endDate: toInclusiveEndDateInputValue(editingBlock.endDate),
          }
        : {
            propertyId: filters.propertyId,
            targetType: "PROPERTY",
            unitId: "",
            roomId: "",
            reason: "",
            status: "SCHEDULED",
            priority: "MEDIUM",
            resolutionNote: "",
            emergencyOverride: false,
            emergencyReason: "",
            startDate: "",
            endDate: "",
          },
    [editingBlock, filters.propertyId],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row">
        <MaintenanceFilters
          properties={properties}
          propertyId={filters.propertyId}
          search={filters.search}
          targetType={filters.targetType}
          onChange={(next) => {
            if (next.propertyId) {
              setSelectedPropertyId(next.propertyId);
            }
            setFilters(next);
          }}
        />

        <Button
          disabled={!filters.propertyId || isLoadingProperties || isPropertiesError}
          onClick={() => {
            setEditingBlock(null);
            setIsModalOpen(true);
          }}
        >
          Create Block
        </Button>
      </div>

      <MaintenanceTable
        items={data?.items}
        page={page}
        pageSize={pageSize}
        search={debouncedSearch}
        isPending={Boolean(filters.propertyId) && isPending}
        isFetching={isFetching}
        isError={isError}
        emptyMessage={
          !filters.propertyId
            ? "No accessible properties found."
            : "No maintenance blocks found for this property."
        }
        isDeleting={isDeleting}
        onEdit={(block) => {
          setEditingBlock(block);
          setIsModalOpen(true);
        }}
        onDelete={(block) => {
          void deleteMaintenance(block.id);
        }}
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

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        disableBackdropClose
        disableEscapeClose
        title={editingBlock ? "Edit Maintenance Block" : "Create Maintenance Block"}
        size="xl"
      >
        <MaintenanceForm
          properties={properties}
          submitLabel={editingBlock ? "Save Changes" : "Create Block"}
          isEditing={!!editingBlock}
          defaultValues={maintenanceFormDefaults}
          isSubmitting={isCreating || isUpdating}
          onSubmit={(values, setServerError) => {
            const payload = {
              ...values,
              endDate: toExclusiveEndDateValue(values.endDate),
              reason: values.reason || undefined,
              unitId:
                values.targetType === "UNIT" ? values.unitId || undefined : undefined,
              roomId:
                values.targetType === "ROOM" ? values.roomId || undefined : undefined,
              emergencyReason: values.emergencyOverride
                ? values.emergencyReason
                : undefined,
              resolutionNote:
                values.status === "RESOLVED"
                  ? values.resolutionNote
                  : undefined,
            };

            const action = editingBlock
              ? updateMaintenance({
                  maintenanceId: editingBlock.id,
                  payload,
                })
              : createMaintenance({
                  propertyId: payload.propertyId,
                  targetType: payload.targetType,
                  unitId: payload.unitId,
                  roomId: payload.roomId,
                  reason: payload.reason,
                  priority: payload.priority,
                  emergencyOverride: payload.emergencyOverride,
                  emergencyReason: payload.emergencyReason,
                  startDate: payload.startDate,
                  endDate: payload.endDate,
                });

            action
              .then(() => handleCloseModal())
              .catch(() => {
                setServerError(
                  editingBlock
                    ? "Failed to update maintenance block"
                    : "Failed to create maintenance block",
                );
              });
          }}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
