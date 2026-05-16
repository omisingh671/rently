import type { AdminPropertyAssignment } from "../types";

import AdminTable from "@/components/admin-table/AdminTable";
import AdminTableCell from "@/components/admin-table/AdminTableCell";
import AdminTableContainer from "@/components/admin-table/AdminTableContainer";
import AdminTableEmpty from "@/components/admin-table/AdminTableEmpty";
import AdminTableHeader from "@/components/admin-table/AdminTableHeader";
import AdminTableLoadingOverlay from "@/components/admin-table/AdminTableLoadingOverlay";
import AdminTableRow from "@/components/admin-table/AdminTableRow";

type Props = {
  items?: AdminPropertyAssignment[];
  page: number;
  pageSize: number;
  isPending: boolean;
  isFetching: boolean;
  isDeleting: boolean;
  onDelete: (assignment: AdminPropertyAssignment) => void;
};

export default function AssignmentsTable({
  items,
  page,
  pageSize,
  isPending,
  isFetching,
  isDeleting,
  onDelete,
}: Props) {
  const safeItems = items ?? [];
  const isInitialLoading = isPending && safeItems.length === 0;
  const isEmpty = !isInitialLoading && safeItems.length === 0;

  return (
    <AdminTableContainer>
      <AdminTableLoadingOverlay visible={isFetching} />

      <AdminTable>
        <AdminTableHeader>
          <tr>
            <AdminTableCell as="th">#</AdminTableCell>
            <AdminTableCell as="th">Property</AdminTableCell>
            <AdminTableCell as="th">User</AdminTableCell>
            <AdminTableCell as="th">Role</AdminTableCell>
            <AdminTableCell as="th">Assigned By</AdminTableCell>
            <AdminTableCell as="th">Created</AdminTableCell>
            <AdminTableCell as="th" align="right">
              Action
            </AdminTableCell>
          </tr>
        </AdminTableHeader>

        <tbody className={isFetching ? "opacity-70" : ""}>
          {isInitialLoading ? (
            <AdminTableEmpty colSpan={7} message="Loading assignments..." />
          ) : isEmpty ? (
            <AdminTableEmpty colSpan={7} message="No assignments found." />
          ) : (
            safeItems.map((assignment, index) => (
              <AdminTableRow key={assignment.id}>
                <AdminTableCell className="font-medium text-slate-700">
                  {(page - 1) * pageSize + index + 1}
                </AdminTableCell>
                <AdminTableCell className="font-medium text-slate-900">
                  {assignment.propertyName}
                </AdminTableCell>
                <AdminTableCell>
                  <div className="text-sm text-slate-700">
                    <div className="font-medium">{assignment.userName}</div>
                    <div className="text-slate-500">
                      {assignment.userEmail}
                    </div>
                  </div>
                </AdminTableCell>
                <AdminTableCell>{assignment.role}</AdminTableCell>
                <AdminTableCell>{assignment.assignedByName}</AdminTableCell>
                <AdminTableCell>
                  {new Date(assignment.createdAt).toLocaleDateString()}
                </AdminTableCell>
                <AdminTableCell align="right">
                  <button
                    type="button"
                    onClick={() => onDelete(assignment)}
                    disabled={isDeleting}
                    className="text-sm text-rose-600 hover:underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </AdminTableCell>
              </AdminTableRow>
            ))
          )}
        </tbody>
      </AdminTable>
    </AdminTableContainer>
  );
}
