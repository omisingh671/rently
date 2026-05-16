import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/common/Pagination";
import PageSizeSelector from "@/components/common/PageSizeSelector";
import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { useAdminProperties } from "@/features/properties/hooks/useAdminProperties";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";
import MaintenanceFilters from "@/features/maintenance/components/MaintenanceFilters";
import MaintenanceForm from "@/features/maintenance/components/MaintenanceForm/MaintenanceForm";
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBlock(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row">
        <MaintenanceFilters
          properties={properties}
          propertyId={filters.propertyId}
          search={filters.search}
          targetType={filters.targetType}
          onChange={(next) => setFilters(next)}
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
            ? "Select a property to view maintenance blocks."
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
          defaultValues={
            editingBlock
              ? {
                  propertyId: editingBlock.propertyId,
                  targetType: editingBlock.targetType,
                  unitId: editingBlock.unitId ?? "",
                  roomId: editingBlock.roomId ?? "",
                  reason: editingBlock.reason ?? "",
                  startDate: toDateInputValue(editingBlock.startDate),
                  endDate: toDateInputValue(editingBlock.endDate),
                }
              : {
                  propertyId: filters.propertyId,
                  targetType: "PROPERTY",
                  unitId: "",
                  roomId: "",
                  reason: "",
                  startDate: "",
                  endDate: "",
                }
          }
          isSubmitting={isCreating || isUpdating}
          onSubmit={(values, setServerError) => {
            const payload = {
              ...values,
              reason: values.reason || undefined,
              unitId:
                values.targetType === "UNIT" ? values.unitId || undefined : undefined,
              roomId:
                values.targetType === "ROOM" ? values.roomId || undefined : undefined,
            };

            const action = editingBlock
              ? updateMaintenance({
                  maintenanceId: editingBlock.id,
                  payload,
                })
              : createMaintenance(payload);

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
