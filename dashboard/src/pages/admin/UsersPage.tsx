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
    : "managers";
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
  });

  const users = data?.items ?? [];
  const pagination = data?.pagination;
  const canCreate =
    (scope === "admins" && currentUser?.role === "SUPER_ADMIN") ||
    (scope === "managers" && currentUser?.role === "ADMIN");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <UsersFilters {...filters} onChange={(next) => setFilters(next)} />

          {canCreate && (
            <Button onClick={() => setIsCreateOpen(true)}>
              {scope === "admins" ? "Create Admin" : "Create Manager"}
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

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        disableBackdropClose
        disableEscapeClose
        title={scope === "admins" ? "Create Admin" : "Create Manager"}
      >
        <UserForm
          submitLabel={scope === "admins" ? "Create Admin" : "Create Manager"}
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
        title={scope === "admins" ? "Edit Admin" : "Edit Manager"}
      >
        {editingUser && (
          <UserForm
            mode="edit"
            submitLabel={scope === "admins" ? "Save Admin" : "Save Manager"}
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
