import { useEffect, useState } from "react";
import { FiMail, FiRefreshCcw, FiUsers } from "react-icons/fi";

import AdminTable from "@/components/admin-table/AdminTable";
import AdminTableCell from "@/components/admin-table/AdminTableCell";
import AdminTableContainer from "@/components/admin-table/AdminTableContainer";
import AdminTableEmpty from "@/components/admin-table/AdminTableEmpty";
import AdminTableError from "@/components/admin-table/AdminTableError";
import AdminTableHeader from "@/components/admin-table/AdminTableHeader";
import AdminTableLoadingOverlay from "@/components/admin-table/AdminTableLoadingOverlay";
import AdminTableRow from "@/components/admin-table/AdminTableRow";
import PageSizeSelector from "@/components/common/PageSizeSelector";
import Pagination from "@/components/common/Pagination";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuthStore } from "@/stores/authStore";
import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { normalizeApiError } from "@/utils/errors";
import UserForm from "@/features/users/components/UserForm/UserForm";
import { useManagedUsers } from "@/features/users/hooks/useAdminUsers";
import type {
  AdminUser,
  ManagedUserRole,
  MutableManagedUserRole,
} from "@/features/users/types";

type Filters = {
  search: string;
  role: ManagedUserRole | "";
  isActive: "" | "true" | "false";
  mustChangePassword: "" | "true" | "false";
};

const roleOptions: ManagedUserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "GUEST",
];

const mutableRoles: MutableManagedUserRole[] = ["ADMIN", "MANAGER", "GUEST"];

const toBool = (value: "" | "true" | "false") =>
  value === "" ? undefined : value === "true";

export default function UserManagementPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
    role: "",
    isActive: "",
    mustChangePassword: "",
  });

  useEffect(() => {
    setPage(1);
  }, [filters.role, filters.isActive, filters.mustChangePassword, setPage]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    createAdmin,
    updateStatus,
    updateRole,
    triggerPasswordReset,
    updateForcePasswordChange,
    revokeSessions,
    isCreatingAdmin,
    isUpdatingStatus,
    isUpdatingRole,
    isTriggeringPasswordReset,
    isUpdatingForcePasswordChange,
    isRevokingSessions,
  } = useManagedUsers(page, pageSize, {
    search: debouncedSearch,
    ...(filters.role && { role: filters.role }),
    ...(filters.isActive && { isActive: toBool(filters.isActive) }),
    ...(filters.mustChangePassword && {
      mustChangePassword: toBool(filters.mustChangePassword),
    }),
  });

  const users = data?.items ?? [];
  const pagination = data?.pagination;
  const visiblePagination =
    pagination && pagination.total > pageSize ? pagination : null;
  const isBusy =
    isUpdatingStatus ||
    isUpdatingRole ||
    isTriggeringPasswordReset ||
    isUpdatingForcePasswordChange ||
    isRevokingSessions;

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await action();
      setActionSuccess(success);
    } catch (error) {
      setActionError(normalizeApiError(error).message);
    }
  };

  const canChangeRole = (user: AdminUser) =>
    user.role !== "SUPER_ADMIN" && currentUser?.id !== user.id;

  const resetFilters = () =>
    setFilters({
      search: "",
      role: "",
      isActive: "",
      mustChangePassword: "",
    });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              placeholder="Search name or email"
              className="h-10 w-64 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />

            <select
              value={filters.role}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  role: event.target.value as ManagedUserRole | "",
                }))
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <select
              value={filters.isActive}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  isActive: event.target.value as Filters["isActive"],
                }))
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <select
              value={filters.mustChangePassword}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  mustChangePassword: event.target
                    .value as Filters["mustChangePassword"],
                }))
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All password states</option>
              <option value="true">Change required</option>
              <option value="false">No change required</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {currentUser?.role === "SUPER_ADMIN" && (
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                Add Admin
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              icon={<FiRefreshCcw />}
              onClick={resetFilters}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {(actionError || actionSuccess) && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            actionError
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {actionError ?? actionSuccess}
        </div>
      )}

      <AdminTableContainer>
        <AdminTableLoadingOverlay visible={isFetching} />
        {isError && <AdminTableError message="Failed to load users." />}

        <AdminTable>
          <AdminTableHeader>
            <tr>
              <AdminTableCell as="th">#</AdminTableCell>
              <AdminTableCell as="th">User</AdminTableCell>
              <AdminTableCell as="th">Role</AdminTableCell>
              <AdminTableCell as="th">Status</AdminTableCell>
              <AdminTableCell as="th">Password Change</AdminTableCell>
              <AdminTableCell as="th">Created</AdminTableCell>
              <AdminTableCell as="th" align="right">
                Actions
              </AdminTableCell>
            </tr>
          </AdminTableHeader>

          <tbody className={isFetching ? "opacity-70" : ""}>
            {isPending && users.length === 0 ? (
              <AdminTableEmpty colSpan={7} message="Loading users..." />
            ) : users.length === 0 ? (
              <AdminTableEmpty colSpan={7} message="No users found." />
            ) : (
              users.map((user, index) => {
                const isSelf = currentUser?.id === user.id;

                return (
                  <AdminTableRow key={user.id}>
                    <AdminTableCell className="font-medium text-slate-700">
                      {(page - 1) * pageSize + index + 1}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="font-medium text-slate-900">
                        {user.fullName}
                      </div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </AdminTableCell>
                    <AdminTableCell>
                      {canChangeRole(user) ? (
                        <select
                          value={user.role}
                          disabled={isBusy}
                          onChange={(event) =>
                            runAction(
                              () =>
                                updateRole({
                                  userId: user.id,
                                  role: event.target
                                    .value as MutableManagedUserRole,
                                }),
                              "User role updated.",
                            )
                          }
                          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                        >
                          {mutableRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm font-medium text-slate-700">
                          {user.role}
                        </span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant={user.isActive ? "success" : "secondary"}
                        disabled={isSelf || isBusy}
                        onClick={() =>
                          runAction(
                            () =>
                              updateStatus({
                                userId: user.id,
                                isActive: !user.isActive,
                              }),
                            user.isActive
                              ? "User disabled and sessions revoked."
                              : "User enabled.",
                          )
                        }
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Button>
                    </AdminTableCell>
                    <AdminTableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          user.mustChangePassword ? "warning" : "secondary"
                        }
                        disabled={isBusy}
                        onClick={() =>
                          runAction(
                            () =>
                              updateForcePasswordChange({
                                userId: user.id,
                                mustChangePassword:
                                  !user.mustChangePassword,
                              }),
                            user.mustChangePassword
                              ? "Password-change requirement cleared."
                              : "Password change will be required on next login.",
                          )
                        }
                      >
                        {user.mustChangePassword
                          ? "Change Required"
                          : "Force Change"}
                      </Button>
                    </AdminTableCell>
                    <AdminTableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </AdminTableCell>
                    <AdminTableCell align="right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          icon={<FiMail />}
                          disabled={isBusy}
                          title="Send a password reset link to this user's email address"
                          onClick={() =>
                            runAction(
                              () => triggerPasswordReset(user.id),
                              "Password reset email triggered.",
                            )
                          }
                        >
                          Send Reset Link
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          icon={<FiUsers />}
                          disabled={isBusy}
                          title="Force log out this user from all devices by terminating all of their active sessions"
                          onClick={() =>
                            runAction(
                              () => revokeSessions(user.id),
                              "User sessions revoked.",
                            )
                          }
                        >
                          Force Logout
                        </Button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })
            )}
          </tbody>
        </AdminTable>
      </AdminTableContainer>

      {visiblePagination && (
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
        title="Add Admin"
      >
        <UserForm
          submitLabel="Add Admin"
          isSubmitting={isCreatingAdmin}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={async (values, setServerError) => {
            try {
              setActionError(null);
              setActionSuccess(null);
              await createAdmin({
                fullName: values.fullName,
                email: values.email,
                password: values.password,
                ...(values.contactNumber && {
                  countryCode: values.countryCode,
                  contactNumber: values.contactNumber,
                }),
              });
              setIsCreateOpen(false);
              setActionSuccess("Admin user created.");
            } catch (error) {
              setServerError(normalizeApiError(error).message);
            }
          }}
        />
      </Modal>
    </div>
  );
}
