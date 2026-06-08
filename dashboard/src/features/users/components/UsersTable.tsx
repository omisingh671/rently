import type { AdminUser, UpdateUserVariables } from "../types";
import UserActions from "./UserActionsMenu";

import AdminTableContainer from "@/components/admin-table/AdminTableContainer";
import AdminTable from "@/components/admin-table/AdminTable";
import AdminTableHeader from "@/components/admin-table/AdminTableHeader";
import AdminTableRow from "@/components/admin-table/AdminTableRow";
import AdminTableCell from "@/components/admin-table/AdminTableCell";
import AdminTableEmpty from "@/components/admin-table/AdminTableEmpty";
import AdminTableLoadingOverlay from "@/components/admin-table/AdminTableLoadingOverlay";
import AdminTableError from "@/components/admin-table/AdminTableError";
import ActiveToggle from "@/components/common/ActiveToggle";

import { highlightText } from "@/utils/highlightText";
import { useAuthStore } from "@/stores/authStore";
import { formatEnumLabel } from "@/utils/formatEnumLabel";

type Props = {
  users: AdminUser[];
  page: number;
  pageSize: number;
  search: string;
  isPending?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  isUpdating: boolean;
  onEditUser: (user: AdminUser) => void;
  onUpdateUser: (vars: UpdateUserVariables) => void;
};

export default function UsersTable({
  users,
  page,
  pageSize,
  search,
  isPending,
  isFetching,
  isError,
  isUpdating,
  onEditUser,
  onUpdateUser,
}: Props) {
  const currentUser = useAuthStore((state) => state.user);
  const isInitialLoading = Boolean(isPending && users.length === 0);
  const isEmpty = !isInitialLoading && users.length === 0;

  return (
    <AdminTableContainer>
      {/* Refetch overlay */}
      <AdminTableLoadingOverlay visible={isFetching} />

      {/* Error */}
      {isError && <AdminTableError message="Failed to load users." />}

      <AdminTable>
        <AdminTableHeader>
          <tr>
            <AdminTableCell as="th">#</AdminTableCell>
            <AdminTableCell as="th">Name</AdminTableCell>
            <AdminTableCell as="th">Email</AdminTableCell>
            <AdminTableCell as="th">Role</AdminTableCell>
            <AdminTableCell as="th">Created</AdminTableCell>
            <AdminTableCell as="th" align="right">
              Actions
            </AdminTableCell>
            <AdminTableCell as="th" align="right">
              Active
            </AdminTableCell>
          </tr>
        </AdminTableHeader>

        <tbody className={isFetching ? "opacity-70" : ""}>
          {isInitialLoading ? (
            <AdminTableEmpty colSpan={7} message="Loading users..." />
          ) : isEmpty ? (
            <AdminTableEmpty colSpan={7} message="No users found." />
          ) : (
            users.map((user, index) => {
              const serial = (page - 1) * pageSize + index + 1;

              return (
                <AdminTableRow key={user.id}>
                  <AdminTableCell className="font-medium text-slate-700">
                    {serial}
                  </AdminTableCell>

                  <AdminTableCell className="font-medium text-slate-900">
                    {highlightText(user.fullName, search)}
                  </AdminTableCell>

                  <AdminTableCell className="text-slate-600">
                    {highlightText(user.email, search)}
                  </AdminTableCell>

                  <AdminTableCell>{formatEnumLabel(user.role)}</AdminTableCell>

                  <AdminTableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </AdminTableCell>

                  <AdminTableCell align="right">
                    <UserActions
                      user={user}
                      isUpdating={isUpdating}
                      onEdit={onEditUser}
                    />
                  </AdminTableCell>

                  <AdminTableCell align="right">
                    <ActiveToggle
                      checked={user.isActive}
                      disabled={currentUser?.id === user.id || isUpdating}
                      onChange={(next) =>
                        onUpdateUser({
                          userId: user.id,
                          payload: { isActive: next },
                        })
                      }
                    />
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
