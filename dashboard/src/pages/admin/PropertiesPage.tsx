import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";

import { useAdminProperties } from "@/features/properties/hooks/useAdminProperties";
import PropertiesTable from "@/features/properties/components/PropertiesTable";
import PropertiesFilters from "@/features/properties/components/PropertiesFilters";
import PropertyAmenityAssignmentForm from "@/features/properties/components/PropertyAmenityAssignmentForm";

import Pagination from "@/components/common/Pagination";
import PageSizeSelector from "@/components/common/PageSizeSelector";

import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { useAuthStore } from "@/stores/authStore";
import { useActiveAmenities } from "@/features/amenities/hooks/useActiveAmenities";
import { usePropertyAmenityAssignments } from "@/features/amenities/hooks/usePropertyAmenityAssignments";
import { normalizeApiError } from "@/utils/errors";

import type { AdminProperty, PropertyStatus } from "@/features/properties/types";

type Filters = {
  search: string;
  status: PropertyStatus | "";
  isActive: "" | "true" | "false";
};

const sortIds = (ids: string[]) => [...ids].sort();

export default function PropertiesPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAdmin = user?.role === "ADMIN";
  const canManageAmenities = isSuperAdmin || isAdmin;
  const propertyLinkMode = isSuperAdmin ? "edit" : isAdmin ? "view" : "none";

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
  const [amenityProperty, setAmenityProperty] = useState<AdminProperty | null>(
    null,
  );
  const [assignmentDraft, setAssignmentDraft] = useState<string[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.isActive, setPage]);

  const { data, isPending, isFetching, isError, updateProperty, isUpdating } =
    useAdminProperties(page, pageSize, {
      search: debouncedSearch,
      status: filters.status,
      isActive: filters.isActive,
    });
  const {
    data: activeAmenities = [],
    isPending: isLoadingActiveAmenities,
  } = useActiveAmenities();
  const {
    data: propertyAssignments,
    isLoading: isLoadingAssignments,
    saveAssignments,
    isSaving,
  } = usePropertyAmenityAssignments(amenityProperty?.id ?? "");
  const visiblePagination =
    data?.pagination && data.pagination.total > pageSize
      ? data.pagination
      : null;

  useEffect(() => {
    setAssignmentDraft(propertyAssignments?.amenityIds ?? []);
    setAssignmentError(null);
  }, [amenityProperty?.id, propertyAssignments?.amenityIds]);

  const sortedDraftAmenityIds = useMemo(
    () => sortIds(assignmentDraft),
    [assignmentDraft],
  );
  const sortedAssignedAmenityIds = useMemo(
    () => sortIds(propertyAssignments?.amenityIds ?? []),
    [propertyAssignments?.amenityIds],
  );
  const isAssignmentDirty =
    sortedDraftAmenityIds.join("|") !== sortedAssignedAmenityIds.join("|");

  const handleCloseAmenityModal = () => {
    setAmenityProperty(null);
    setAssignmentDraft([]);
    setAssignmentError(null);
  };

  const toggleAssignedAmenity = (amenityId: string) => {
    setAssignmentDraft((prev) =>
      prev.includes(amenityId)
        ? prev.filter((id) => id !== amenityId)
        : [...prev, amenityId],
    );
  };

  const handleSaveAssignments = () => {
    if (!amenityProperty) return;

    setAssignmentError(null);
    saveAssignments({ amenityIds: assignmentDraft })
      .then(() => handleCloseAmenityModal())
      .catch((error) => {
        setAssignmentError(normalizeApiError(error).message);
      });
  };

  if (isError) {
    return (
      <div className="rounded border border-rose-300 bg-rose-50 p-4 text-rose-700">
        Failed to load properties
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col-reverse gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:justify-between">
        <PropertiesFilters {...filters} onChange={(next) => setFilters(next)} />

        {isSuperAdmin && (
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
        canManage={isSuperAdmin}
        canManageAmenities={canManageAmenities}
        propertyLinkMode={propertyLinkMode}
        onUpdate={updateProperty}
        onManageAmenities={setAmenityProperty}
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

      <Modal
        isOpen={!!amenityProperty}
        onClose={handleCloseAmenityModal}
        disableBackdropClose
        disableEscapeClose
        title="Assign Amenity to Property"
        size="xl"
      >
        {amenityProperty && (
          <PropertyAmenityAssignmentForm
            property={amenityProperty}
            amenities={activeAmenities}
            selectedAmenityIds={assignmentDraft}
            error={assignmentError}
            isLoading={isLoadingAssignments || isLoadingActiveAmenities}
            isSaving={isSaving}
            isDirty={isAssignmentDirty}
            onToggle={toggleAssignedAmenity}
            onReset={() => {
              setAssignmentDraft(propertyAssignments?.amenityIds ?? []);
              setAssignmentError(null);
            }}
            onCancel={handleCloseAmenityModal}
            onSave={handleSaveAssignments}
          />
        )}
      </Modal>
    </div>
  );
}
