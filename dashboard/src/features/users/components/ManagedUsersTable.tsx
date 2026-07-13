import AdminTable from "@/components/admin-table/AdminTable";
import AdminTableCell from "@/components/admin-table/AdminTableCell";
import AdminTableContainer from "@/components/admin-table/AdminTableContainer";
import AdminTableEmpty from "@/components/admin-table/AdminTableEmpty";
import AdminTableError from "@/components/admin-table/AdminTableError";
import AdminTableHeader from "@/components/admin-table/AdminTableHeader";
import AdminTableLoadingOverlay from "@/components/admin-table/AdminTableLoadingOverlay";
import AdminTableRow from "@/components/admin-table/AdminTableRow";
import UserActionsDropdown, {
  type PendingActionType,
} from "@/features/users/components/UserActionsDropdown";
import type { AdminUser } from "@/features/users/types";
import { formatEnumLabel } from "@/utils/formatEnumLabel";

interface ManagedUsersTableProps {
  users: AdminUser[];
  currentUserId?: string;
  page: number;
  pageSize: number;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  isPendingAction: (userId: string, type: PendingActionType) => boolean;
  onEdit: (user: AdminUser) => void;
  onSendResetLink: (user: AdminUser) => void;
  onToggleForcePasswordChange: (user: AdminUser) => void;
  onForceLogout: (user: AdminUser) => void;
}

export default function ManagedUsersTable({
  users,
  currentUserId,
  page,
  pageSize,
  isPending,
  isFetching,
  isError,
  isPendingAction,
  onEdit,
  onSendResetLink,
  onToggleForcePasswordChange,
  onForceLogout,
}: ManagedUsersTableProps) {
  return (
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
              const isSelf = currentUserId === user.id;

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
                      onEdit={onEdit}
                      onSendResetLink={onSendResetLink}
                      onToggleForcePasswordChange={
                        onToggleForcePasswordChange
                      }
                      onForceLogout={onForceLogout}
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
  );
}
