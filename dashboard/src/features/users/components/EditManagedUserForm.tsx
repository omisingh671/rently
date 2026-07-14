import { useState, type FormEvent } from "react";

import Button from "@/components/ui/Button";
import type {
  AdminUser,
  MutableManagedUserRole,
} from "@/features/users/types";
import { normalizeApiError } from "@/utils/errors";
import { formatEnumLabel } from "@/utils/formatEnumLabel";

const mutableRoles: MutableManagedUserRole[] = ["ADMIN", "MANAGER", "GUEST"];

export interface EditUserFormState {
  fullName: string;
  role: MutableManagedUserRole;
  isActive: boolean;
}

interface EditManagedUserFormProps {
  user: AdminUser;
  isSelf: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: EditUserFormState) => Promise<void>;
}

export default function EditManagedUserForm({
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
