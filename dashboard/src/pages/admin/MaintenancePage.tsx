import { useEffect, useMemo, useState } from "react";
import { HiCalendarDays, HiWrenchScrewdriver } from "react-icons/hi2";
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
import PropertyClosuresPanel from "@/features/property-closures/PropertyClosuresPanel";
import { normalizeApiError } from "@/utils/errors";

type Filters = {
  propertyId: string;
  search: string;
  targetType: MaintenanceTargetType | "";
};

type AvailabilityControlView = "MAINTENANCE" | "CLOSURES";

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
  const [activeView, setActiveView] =
    useState<AvailabilityControlView>("MAINTENANCE");
  const [editingBlock, setEditingBlock] =
    useState<AdminMaintenanceBlock | null>(null);
  const [deletingBlock, setDeletingBlock] =
    useState<AdminMaintenanceBlock | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const selectedPropertyName =
    properties.find((property) => property.id === filters.propertyId)?.name ??
    "the selected property";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            What do you need to take out of sale?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose one workflow for each event. Do not create both records for the same dates and purpose.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveView("MAINTENANCE")}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
              activeView === "MAINTENANCE"
                ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className="rounded-lg bg-white p-2 text-indigo-600 shadow-sm">
              <HiWrenchScrewdriver className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900">Maintenance blocks</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">
                Repairs, inspections, safety faults, or equipment downtime. Target a property, unit, or room.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("CLOSURES")}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
              activeView === "CLOSURES"
                ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className="rounded-lg bg-white p-2 text-indigo-600 shadow-sm">
              <HiCalendarDays className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900">Property closures</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">
                Holidays or owner-requested sell stops. Always closes all public inventory for the property.
              </span>
            </span>
          </button>
        </div>
      </section>

      {activeView === "MAINTENANCE" ? (
        <>
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
              Create Maintenance Block
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
              setDeleteError(null);
              setDeletingBlock(block);
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
        </>
      ) : (
        <PropertyClosuresPanel
          key={filters.propertyId || "no-property"}
          propertyId={filters.propertyId}
        />
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

      <Modal
        isOpen={deletingBlock !== null}
        onClose={() => {
          if (!isDeleting) {
            setDeletingBlock(null);
            setDeleteError(null);
          }
        }}
        title="Delete Maintenance Block?"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">This permanently removes the record and reopens its inventory dates.</p>
            <p className="mt-1 text-rose-700">
              For an audit-friendly history, edit the block and set its status to Cancelled instead.
            </p>
          </div>
          {deletingBlock && (
            <dl className="grid gap-3 rounded-lg border border-slate-200 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Target</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {deletingBlock.roomLabel ?? deletingBlock.unitNumber ?? selectedPropertyName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Reason</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {deletingBlock.reason || "No reason recorded"}
                </dd>
              </div>
            </dl>
          )}
          {deleteError && (
            <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{deleteError}</p>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              disabled={isDeleting}
              onClick={() => {
                setDeletingBlock(null);
                setDeleteError(null);
              }}
            >
              Keep Block
            </Button>
            <Button
              variant="danger"
              disabled={!deletingBlock || isDeleting}
              onClick={() => {
                if (!deletingBlock) return;
                setDeleteError(null);
                void deleteMaintenance(deletingBlock.id)
                  .then(() => setDeletingBlock(null))
                  .catch((caughtError: unknown) => {
                    setDeleteError(normalizeApiError(caughtError).message);
                  });
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
