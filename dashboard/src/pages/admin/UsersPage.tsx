import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useState } from "react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import UsersTable from "@/features/users/components/UsersTable";
import UsersFilters from "@/features/users/components/UsersFilters";
import { useAdminUsers } from "@/features/users/hooks/useAdminUsers";
import UserForm from "@/features/users/components/UserForm/UserForm";

import PageSizeSelector from "@/components/common/PageSizeSelector";
import Pagination from "@/components/common/Pagination";

import { useAdminListState } from "@/hooks/admin/useAdminListState";
import type { AdminUserScope } from "@/features/users/types";
import { ADMIN_ROUTES } from "@/configs/routePathsAdmin";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";
import type { AdminUser } from "@/features/users/types";

type Filters = {
  search: string;
  isActive: "" | "true" | "false";
};

const UsersPage = () => {
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.user);
  const scope: AdminUserScope = location.pathname.includes(ADMIN_ROUTES.ADMINS)
    ? "admins"
    : location.pathname.includes(ADMIN_ROUTES.STAFF)
      ? "staff"
      : "managers";
  const [staffRole, setStaffRole] = useState<"FRONT_DESK" | "ACCOUNTANT">(
    "FRONT_DESK",
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

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

  useEffect(() => {
    setPage(1);
  }, [filters.isActive, setPage]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    updateUser,
    isUpdating,
    createUser,
    isCreating,
  } = useAdminUsers(scope, page, pageSize, {
    search: debouncedSearch,
    isActive: filters.isActive,
    ...(scope === "staff" && { role: staffRole }),
  });

  const users = data?.items ?? [];
  const pagination = data?.pagination;
  const visiblePagination =
    pagination && pagination.total > pageSize ? pagination : null;
  const canCreate =
    (scope === "admins" && currentUser?.role === "SUPER_ADMIN") ||
    (scope === "managers" && currentUser?.role === "ADMIN") ||
    (scope === "staff" && currentUser?.role === "ADMIN");
  const scopeLabel =
    scope === "admins"
      ? "Admin"
      : scope === "managers"
        ? "Manager"
        : staffRole === "FRONT_DESK"
          ? "Front Desk Staff"
          : "Accountant";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-start lg:justify-between">
          <UsersFilters {...filters} onChange={(next) => setFilters(next)} />

          {scope === "staff" && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <span className="font-medium">Staff role</span>
              <select
                value={staffRole}
                onChange={(event) => {
                  setStaffRole(event.target.value as "FRONT_DESK" | "ACCOUNTANT");
                  setPage(1);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="FRONT_DESK">Front Desk</option>
                <option value="ACCOUNTANT">Accountant</option>
              </select>
            </label>
          )}

          {canCreate && (
            <Button onClick={() => setIsCreateOpen(true)}>
              Create {scopeLabel}
            </Button>
          )}
        </div>

        <UsersTable
          users={users}
          page={page}
          pageSize={pageSize}
          search={debouncedSearch}
          isPending={isPending}
          isFetching={isFetching}
          isError={isError}
          isUpdating={isUpdating}
          onEditUser={setEditingUser}
          onUpdateUser={updateUser}
        />
      </div>

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
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        disableBackdropClose
        disableEscapeClose
        title={`Create ${scopeLabel}`}
      >
        <UserForm
          submitLabel={`Create ${scopeLabel}`}
          isSubmitting={isCreating}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={async (values, setServerError) => {
            try {
              await createUser({
                fullName: values.fullName,
                email: values.email,
                password: values.password,
                ...(values.contactNumber && {
                  countryCode: "+91",
                  contactNumber: values.contactNumber,
                }),
                ...(scope === "staff" && { role: staffRole }),
              });
              setIsCreateOpen(false);
            } catch (error) {
              setServerError(normalizeApiError(error).message);
            }
          }}
        />
      </Modal>

      <Modal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        disableBackdropClose
        disableEscapeClose
        title={`Edit ${scopeLabel}`}
      >
        {editingUser && (
          <UserForm
            mode="edit"
            submitLabel={`Save ${scopeLabel}`}
            isSubmitting={isUpdating}
            initialValues={{
              fullName: editingUser.fullName,
              email: editingUser.email,
              contactNumber: editingUser.contactNumber ?? "",
            }}
            onCancel={() => setEditingUser(null)}
            onSubmit={async (values, setServerError) => {
              try {
                await updateUser({
                  userId: editingUser.id,
                  payload: {
                    fullName: values.fullName,
                    ...(values.contactNumber
                      ? {
                          countryCode: "+91",
                          contactNumber: values.contactNumber,
                        }
                      : {}),
                  },
                });
                setEditingUser(null);
              } catch (error) {
                setServerError(normalizeApiError(error).message);
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default UsersPage;
