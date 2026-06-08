import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  FiChevronDown,
  FiEdit2,
  FiLogOut,
  FiMail,
  FiRefreshCcw,
  FiShield,
} from "react-icons/fi";
import { createPortal } from "react-dom";

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
import { formatEnumLabel } from "@/utils/formatEnumLabel";
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

type PendingActionType = "password" | "reset" | "logout";

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

function InlineSpinner() {
  return (
    <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

type UserActionsDropdownProps = {
  user: AdminUser;
  isPendingAction: (userId: string, type: PendingActionType) => boolean;
  onEdit: (user: AdminUser) => void;
  onSendResetLink: (user: AdminUser) => void;
  onToggleForcePasswordChange: (user: AdminUser) => void;
  onForceLogout: (user: AdminUser) => void;
};

function UserActionsDropdown({
  user,
  isPendingAction,
  onEdit,
  onSendResetLink,
  onToggleForcePasswordChange,
  onForceLogout,
}: UserActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isResetPending = isPendingAction(user.id, "reset");
  const isPasswordPending = isPendingAction(user.id, "password");
  const isLogoutPending = isPendingAction(user.id, "logout");
  const isAnyPending = isResetPending || isPasswordPending || isLogoutPending;

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeMenu = () => setOpen(false);

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [open]);

  const toggleOpen = () => {
    const nextOpen = !open;
    if (nextOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }

    setOpen(nextOpen);
  };

  const runAndClose = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div ref={ref} className="inline-flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        disabled={isAnyPending}
        onClick={toggleOpen}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isAnyPending ? <InlineSpinner /> : <FiShield />}
        Actions
        <FiChevronDown size={14} />
      </button>

      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          className="fixed z-50 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => runAndClose(() => onEdit(user))}
            >
              <FiEdit2 />
              Edit User
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={isResetPending}
              className={itemClass}
              onClick={() => runAndClose(() => onSendResetLink(user))}
            >
              {isResetPending ? <InlineSpinner /> : <FiMail />}
              Send Reset Link
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={isPasswordPending}
              className={itemClass}
              onClick={() =>
                runAndClose(() => onToggleForcePasswordChange(user))
              }
            >
              {isPasswordPending ? <InlineSpinner /> : <FiShield />}
              {user.mustChangePassword
                ? "Clear Force Change Password"
                : "Force Change Password"}
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={isLogoutPending}
              className={`${itemClass} text-red-700 hover:bg-red-50`}
              onClick={() => runAndClose(() => onForceLogout(user))}
            >
              {isLogoutPending ? <InlineSpinner /> : <FiLogOut />}
              Force Logout
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

type EditUserFormState = {
  fullName: string;
  role: MutableManagedUserRole;
  isActive: boolean;
};

type EditManagedUserFormProps = {
  user: AdminUser;
  isSelf: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: EditUserFormState) => Promise<void>;
};

function EditManagedUserForm({
  user,
  isSelf,
  isSubmitting,
  onCancel,
  onSubmit,
}: EditManagedUserFormProps) {
  const [values, setValues] = useState<EditUserFormState>({
    fullName: user.fullName,
    role: user.role === "SUPER_ADMIN" ? "ADMIN" : user.role,
    isActive: user.isActive,
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const canEditRole = user.role !== "SUPER_ADMIN" && !isSelf;
  const canEditStatus = !isSelf;

  useEffect(() => {
    setValues({
      fullName: user.fullName,
      role: user.role === "SUPER_ADMIN" ? "ADMIN" : user.role,
      isActive: user.isActive,
    });
    setServerError(null);
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const fullName = values.fullName.trim();
    if (fullName.length < 2) {
      setServerError("Full name must be at least 2 characters.");
      return;
    }

    try {
      await onSubmit({ ...values, fullName });
    } catch (error) {
      setServerError(normalizeApiError(error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {serverError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="managed-user-full-name"
          className="text-sm font-medium text-slate-700"
        >
          Full Name
        </label>
        <input
          id="managed-user-full-name"
          type="text"
          value={values.fullName}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              fullName: event.target.value,
            }))
          }
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          value={user.email}
          readOnly
          className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="managed-user-role"
            className="text-sm font-medium text-slate-700"
          >
            Role
          </label>
          <select
            id="managed-user-role"
            value={values.role}
            disabled={!canEditRole}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                role: event.target.value as MutableManagedUserRole,
              }))
            }
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-50 disabled:text-slate-500"
          >
            {mutableRoles.map((role) => (
              <option key={role} value={role}>
                {formatEnumLabel(role)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="managed-user-status"
            className="text-sm font-medium text-slate-700"
          >
            Status
          </label>
          <select
            id="managed-user-status"
            value={values.isActive ? "active" : "inactive"}
            disabled={!canEditStatus}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                isActive: event.target.value === "active",
              }))
            }
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save User"}
        </Button>
      </div>
    </form>
  );
}

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

      <AdminTableContainer>
        <AdminTableLoadingOverlay visible={isFetching} />
        {isError && <AdminTableError message="Failed to load users." />}

        <AdminTable>
          <AdminTableHeader>
            <tr>
              <AdminTableCell as="th">#</AdminTableCell>
              <AdminTableCell as="th">User</AdminTableCell>
              <AdminTableCell as="th">Role</AdminTableCell>
              <AdminTableCell as="th">Created</AdminTableCell>
              <AdminTableCell as="th" align="right">
                Actions
              </AdminTableCell>
              <AdminTableCell as="th" align="right">
                Status
              </AdminTableCell>
            </tr>
          </AdminTableHeader>

          <tbody className={isFetching ? "opacity-70" : ""}>
            {isPending && users.length === 0 ? (
              <AdminTableEmpty colSpan={6} message="Loading users..." />
            ) : users.length === 0 ? (
              <AdminTableEmpty colSpan={6} message="No users found." />
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
                      <span className="text-sm font-medium text-slate-700">
                        {formatEnumLabel(user.role)}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </AdminTableCell>
                    <AdminTableCell align="right">
                      <UserActionsDropdown
                        user={user}
                        isPendingAction={isPendingAction}
                        onEdit={setEditingUser}
                        onSendResetLink={requestPasswordReset}
                        onToggleForcePasswordChange={requestForcePasswordChange}
                        onForceLogout={requestForceLogout}
                      />
                    </AdminTableCell>
                    <AdminTableCell align="right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isSelf
                          ? "Current User"
                          : user.isActive
                            ? "Active"
                            : "Inactive"}
                      </span>
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

      <Modal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        disableBackdropClose
        disableEscapeClose
        title="Edit User"
      >
        {editingUser && (
          <EditManagedUserForm
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
