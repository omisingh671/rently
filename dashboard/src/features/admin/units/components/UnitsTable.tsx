import type { AdminUnit, UnitStatus } from "../types";

import AdminTableContainer from "@/components/admin-table/AdminTableContainer";
import AdminTable from "@/components/admin-table/AdminTable";
import AdminTableHeader from "@/components/admin-table/AdminTableHeader";
import AdminTableRow from "@/components/admin-table/AdminTableRow";
import AdminTableCell from "@/components/admin-table/AdminTableCell";
import AdminTableEmpty from "@/components/admin-table/AdminTableEmpty";
import AdminTableLoadingOverlay from "@/components/admin-table/AdminTableLoadingOverlay";

import ActiveToggle from "@/components/common/ActiveToggle";
import StatusBadge from "@/components/common/StatusBadge";
import { highlightText } from "@/utils/highlightText";

type Props = {
  items?: AdminUnit[];
  page: number;
  pageSize: number;
  search: string;
  isPending: boolean;
  isFetching: boolean;
  isError?: boolean;
  emptyMessage?: string;
  isUpdating: boolean;
  onUpdate: (args: {
    unitId: string;
    payload: { isActive?: boolean; status?: UnitStatus };
  }) => void;
  onEdit: (unit: AdminUnit) => void;
};

export default function UnitsTable({
  items,
  page,
  pageSize,
  search,
  isPending,
  isFetching,
  isError = false,
  emptyMessage = "No units found.",
  isUpdating,
  onUpdate,
  onEdit,
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
            <AdminTableCell as="th">Unit</AdminTableCell>
            <AdminTableCell as="th">Floor</AdminTableCell>
            <AdminTableCell as="th">Status</AdminTableCell>
            <AdminTableCell as="th">Active</AdminTableCell>
            <AdminTableCell as="th">Action</AdminTableCell>
          </tr>
        </AdminTableHeader>

        <tbody className={isFetching ? "opacity-70" : ""}>
          {isInitialLoading ? (
            <AdminTableEmpty colSpan={6} message="Loading units..." />
          ) : isError ? (
            <AdminTableEmpty colSpan={6} message="Failed to load units." />
          ) : isEmpty ? (
            <AdminTableEmpty colSpan={6} message={emptyMessage} />
          ) : (
            safeItems.map((u, index) => {
              const serial = (page - 1) * pageSize + index + 1;

              return (
                <AdminTableRow key={u.id}>
                  <AdminTableCell className="font-medium text-slate-700">
                    {serial}
                  </AdminTableCell>

                  <AdminTableCell className="font-medium text-slate-900">
                    {highlightText(u.unitNumber, search)}
                  </AdminTableCell>

                  <AdminTableCell>{u.floor}</AdminTableCell>

                  <AdminTableCell>
                    <StatusBadge status={u.status} />
                  </AdminTableCell>

                  <AdminTableCell>
                    <ActiveToggle
                      checked={u.isActive}
                      disabled={isUpdating}
                      onChange={(next) =>
                        onUpdate({
                          unitId: u.id,
                          payload: { isActive: next },
                        })
                      }
                    />
                  </AdminTableCell>

                  <AdminTableCell>
                    <button
                      onClick={() => onEdit(u)}
                      className="text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
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
