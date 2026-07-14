import { useEffect, useState } from "react";
import { FiRefreshCcw } from "react-icons/fi";

import PageSizeSelector from "@/components/common/PageSizeSelector";
import Pagination from "@/components/common/Pagination";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuthStore } from "@/stores/authStore";
import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { normalizeApiError } from "@/utils/errors";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import UserForm from "@/features/users/components/UserForm/UserForm";
import { type PendingActionType } from "@/features/users/components/UserActionsDropdown";
import EditManagedUserForm, {
  type EditUserFormState,
} from "@/features/users/components/EditManagedUserForm";
import ManagedUsersTable from "@/features/users/components/ManagedUsersTable";
import EmailDeliveryFailuresPanel from "@/features/email-deliveries/components/EmailDeliveryFailuresPanel";
import { useManagedUsers } from "@/features/users/hooks/useAdminUsers";
import type {
  AdminUser,
  ManagedUserRole,
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

const toBool = (value: "" | "true" | "false") =>
  value === "" ? undefined : value === "true";

type PendingAction = {
  userId: string;
  type: PendingActionType;
};

type ConfirmationAction = {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: "primary" | "warning" | "danger";
  pending: PendingAction;
  action: () => Promise<unknown>;
  success: string;
};

const getPendingActionKey = ({ userId, type }: PendingAction) =>
  `${userId}:${type}`;

export default function UserManagementPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingActionKeys, setPendingActionKeys] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmation, setConfirmation] =
    useState<ConfirmationAction | null>(null);

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
    updateDetails,
    updateStatus,
    updateRole,
    triggerPasswordReset,
    updateForcePasswordChange,
    revokeSessions,
    isCreatingAdmin,
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

  const runAction = async (
    pending: PendingAction,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    const pendingKey = getPendingActionKey(pending);
    if (pendingActionKeys.includes(pendingKey)) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setPendingActionKeys((keys) => [...keys, pendingKey]);
    try {
      await action();
      setActionSuccess(success);
    } catch (error) {
      setActionError(normalizeApiError(error).message);
    } finally {
      setPendingActionKeys((keys) => keys.filter((key) => key !== pendingKey));
    }
  };

  const isPendingAction = (userId: string, type: PendingActionType) =>
    pendingActionKeys.includes(getPendingActionKey({ userId, type }));

  const requestConfirmation = (action: ConfirmationAction) => {
    setActionError(null);
    setActionSuccess(null);
    setConfirmation(action);
  };

  const confirmPendingAction = async () => {
    if (!confirmation) {
      return;
    }

    const confirmedAction = confirmation;
    setConfirmation(null);
    await runAction(
      confirmedAction.pending,
      confirmedAction.action,
      confirmedAction.success,
    );
  };

  const requestPasswordReset = (user: AdminUser) =>
    requestConfirmation({
      title: "Send Reset Link",
      message: `Send a password reset link to ${user.fullName} at ${user.email}?`,
      confirmLabel: "Send Reset Link",
      confirmVariant: "primary",
      pending: { userId: user.id, type: "reset" },
      action: () => triggerPasswordReset(user.id),
      success: "Password reset email triggered.",
    });

  const requestForcePasswordChange = (user: AdminUser) =>
    requestConfirmation({
      title: user.mustChangePassword
        ? "Clear Force Change Password"
        : "Force Change Password",
      message: user.mustChangePassword
        ? `Allow ${user.fullName} to log in without changing their password next time?`
        : `Require ${user.fullName} to change their password on next login?`,
      confirmLabel: user.mustChangePassword
        ? "Clear Requirement"
        : "Force Change Password",
      confirmVariant: user.mustChangePassword ? "warning" : "primary",
      pending: { userId: user.id, type: "password" },
      action: () =>
        updateForcePasswordChange({
          userId: user.id,
          mustChangePassword: !user.mustChangePassword,
        }),
      success: user.mustChangePassword
        ? "Password-change requirement cleared."
        : "Password change will be required on next login.",
    });

  const requestForceLogout = (user: AdminUser) =>
    requestConfirmation({
      title: "Force Logout",
      message: `Terminate all active sessions for ${user.fullName}?`,
      confirmLabel: "Force Logout",
      confirmVariant: "danger",
      pending: { userId: user.id, type: "logout" },
      action: () => revokeSessions(user.id),
      success: "User sessions revoked.",
    });

  const saveEditedUser = async (
    user: AdminUser,
    values: EditUserFormState,
  ) => {
    setActionError(null);
    setActionSuccess(null);
    setIsSavingEdit(true);

    try {
      if (values.fullName !== user.fullName) {
        await updateDetails({
          userId: user.id,
          fullName: values.fullName,
        });
      }

      if (user.role !== "SUPER_ADMIN" && values.role !== user.role) {
        await updateRole({
          userId: user.id,
          role: values.role,
        });
      }

      if (values.isActive !== user.isActive && currentUser?.id !== user.id) {
        await updateStatus({
          userId: user.id,
          isActive: values.isActive,
        });
      }

      setEditingUser(null);
      setActionSuccess("User updated.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const resetFilters = () =>
    setFilters({
      search: "",
      role: "",
      isActive: "",
      mustChangePassword: "",
    });

  return (
    <div className="space-y-6">
      {currentUser?.role === "SUPER_ADMIN" && <EmailDeliveryFailuresPanel />}

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
                  {formatEnumLabel(role)}
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

      <ManagedUsersTable
        users={users}
        currentUserId={currentUser?.id}
        page={page}
        pageSize={pageSize}
        isPending={isPending}
        isFetching={isFetching}
        isError={isError}
        isPendingAction={isPendingAction}
        onEdit={setEditingUser}
        onSendResetLink={requestPasswordReset}
        onToggleForcePasswordChange={requestForcePasswordChange}
        onForceLogout={requestForceLogout}
      />

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

      <Modal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        disableBackdropClose
        disableEscapeClose
        title="Edit User"
      >
        {editingUser && (
          <EditManagedUserForm
            key={editingUser.id}
            user={editingUser}
            isSelf={currentUser?.id === editingUser.id}
            isSubmitting={isSavingEdit}
            onCancel={() => setEditingUser(null)}
            onSubmit={(values) => saveEditedUser(editingUser, values)}
          />
        )}
      </Modal>

      <Modal
        isOpen={confirmation !== null}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title}
        size="sm"
      >
        {confirmation && (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              {confirmation.message}
            </p>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmation.confirmVariant}
                onClick={confirmPendingAction}
              >
                {confirmation.confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
