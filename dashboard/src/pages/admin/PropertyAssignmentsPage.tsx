import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import PageSizeSelector from "@/components/common/PageSizeSelector";
import Pagination from "@/components/common/Pagination";
import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";
import { useAdminProperties } from "@/features/properties/hooks/useAdminProperties";
import { useAdminUsers } from "@/features/users/hooks/useAdminUsers";
import { useDashboardContext } from "@/features/dashboard/hooks";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";
import AssignmentForm from "@/features/assignments/components/AssignmentForm/AssignmentForm";
import AssignmentsFilters from "@/features/assignments/components/AssignmentsFilters";
import AssignmentsTable from "@/features/assignments/components/AssignmentsTable";
import { usePropertyAssignments } from "@/features/assignments/hooks/usePropertyAssignments";
import type {
  AdminPropertyAssignment,
  PropertyAssignmentRole,
} from "@/features/assignments/types";
import type { AssignmentPropertyOption } from "@/features/assignments/components/AssignmentForm/AssignmentForm";

type Filters = {
  search?: string;
  propertyId: string;
};

export default function PropertyAssignmentsPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] =
    useState<AdminPropertyAssignment | null>(null);
  const {
    page,
    pageSize,
    filters,
    setPage,
    setPageSize,
    setFilters,
  } = useAdminListState<Filters>({ search: "", propertyId: "" });

  const assignmentRole: PropertyAssignmentRole =
    currentUser?.role === "SUPER_ADMIN" ? "ADMIN" : "MANAGER";
  const userScope = assignmentRole === "ADMIN" ? "admins" : "managers";

  const { data: dashboardContext } = useDashboardContext();
  const { data: propertiesData } = useAdminProperties(1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    status: "",
    isActive: "",
  });
  const {
    data: usersData,
    isPending: isLoadingUsers,
    isError: isUsersError,
  } = useAdminUsers(userScope, 1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    isActive: "",
  });

  const propertyMap = new Map<string, AssignmentPropertyOption>();
  for (const property of dashboardContext?.properties ?? []) {
    propertyMap.set(property.id, {
      id: property.id,
      name: property.name,
    });
  }
  for (const property of propertiesData?.items ?? []) {
    propertyMap.set(property.id, {
      id: property.id,
      name: property.name,
    });
  }

  const properties = Array.from(propertyMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const users = usersData?.items ?? [];

  useEffect(() => {
    setPage(1);
  }, [filters.propertyId, setPage]);

  const {
    data,
    isPending,
    isFetching,
    createAssignment,
    isCreating,
    deleteAssignment,
    isDeleting,
  } = usePropertyAssignments(page, pageSize, {
    ...(filters.propertyId && { propertyId: filters.propertyId }),
    role: assignmentRole,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <AssignmentsFilters
          properties={properties}
          propertyId={filters.propertyId}
          onChange={(next) => setFilters(next)}
        />

        <Button onClick={() => setIsCreateOpen(true)}>
          {assignmentRole === "ADMIN"
            ? "Assign Property to Admin"
            : "Assign Manager to Property"}
        </Button>
      </div>

      <AssignmentsTable
        items={data?.items}
        page={page}
        pageSize={pageSize}
        isPending={isPending}
        isFetching={isFetching}
        isDeleting={isDeleting}
        onDelete={setAssignmentToRemove}
      />

      <div className="flex items-center justify-between">
        <PageSizeSelector value={pageSize} onChange={setPageSize} />

        {data?.pagination && data.pagination.totalPages > 1 && (
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        disableBackdropClose
        disableEscapeClose
      >
        <AssignmentForm
          role={assignmentRole}
          properties={properties}
          users={users}
          defaultPropertyId={filters.propertyId || properties[0]?.id}
          isLoadingUsers={isLoadingUsers}
          isUsersError={isUsersError}
          isSubmitting={isCreating}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={async (values, setServerError) => {
            try {
              await createAssignment({
                propertyId: values.propertyId,
                userId: values.userId,
                role: assignmentRole,
              });
              setIsCreateOpen(false);
            } catch (error) {
              setServerError(normalizeApiError(error).message);
            }
          }}
        />
      </Modal>

      <Modal
        isOpen={assignmentToRemove !== null}
        onClose={() => setAssignmentToRemove(null)}
        disableBackdropClose
        title="Remove Assignment"
        size="sm"
      >
        {assignmentToRemove && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              Remove {assignmentToRemove.userName} from{" "}
              {assignmentToRemove.propertyName}? This will remove their access
              to that property.
            </p>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-900">
                {assignmentToRemove.userName}
              </div>
              <div className="text-slate-500">
                {assignmentToRemove.userEmail}
              </div>
              <div className="mt-2 text-slate-700">
                Property: {assignmentToRemove.propertyName}
              </div>
              <div className="text-slate-700">
                Role: {assignmentToRemove.role}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row">
              <Button
                type="button"
                variant="dark"
                onClick={() => setAssignmentToRemove(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={isDeleting}
                onClick={async () => {
                  await deleteAssignment(assignmentToRemove.id);
                  setAssignmentToRemove(null);
                }}
              >
                {isDeleting ? "Removing..." : "Remove Assignment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
