import AdminTable from "@/components/admin-table/AdminTable";
import AdminTableCell from "@/components/admin-table/AdminTableCell";
import AdminTableContainer from "@/components/admin-table/AdminTableContainer";
import AdminTableEmpty from "@/components/admin-table/AdminTableEmpty";
import AdminTableHeader from "@/components/admin-table/AdminTableHeader";
import AdminTableLoadingOverlay from "@/components/admin-table/AdminTableLoadingOverlay";
import AdminTableRow from "@/components/admin-table/AdminTableRow";
import StatusBadge from "@/components/common/StatusBadge";
import { highlightText } from "@/utils/highlightText";
import type { AdminMaintenanceBlock } from "../types";

type Props = {
  items?: AdminMaintenanceBlock[];
  page: number;
  pageSize: number;
  search: string;
  isPending: boolean;
  isFetching: boolean;
  isError?: boolean;
  emptyMessage?: string;
  isDeleting: boolean;
  onEdit: (block: AdminMaintenanceBlock) => void;
  onDelete: (block: AdminMaintenanceBlock) => void;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const getTargetLabel = (block: AdminMaintenanceBlock) => {
  if (block.targetType === "ROOM") {
    return block.roomLabel ?? "Room";
  }

  if (block.targetType === "UNIT") {
    return block.unitNumber ?? "Unit";
  }

  return block.propertyName;
};

export default function MaintenanceTable({
  items,
  page,
  pageSize,
  search,
  isPending,
  isFetching,
  isError = false,
  emptyMessage = "No maintenance blocks found.",
  isDeleting,
  onEdit,
  onDelete,
}: Props) {
  const safeItems = items ?? [];
  const isInitialLoading = isPending && safeItems.length === 0;
  const isEmpty = !isInitialLoading && safeItems.length === 0;

  return (
    <AdminTableContainer>
      <AdminTableLoadingOverlay visible={isFetching || isDeleting} />
      <AdminTable>
        <AdminTableHeader>
          <tr>
            <AdminTableCell as="th">#</AdminTableCell>
            <AdminTableCell as="th">Target</AdminTableCell>
            <AdminTableCell as="th">Reason</AdminTableCell>
            <AdminTableCell as="th">Dates</AdminTableCell>
            <AdminTableCell as="th">Created By</AdminTableCell>
            <AdminTableCell as="th">Action</AdminTableCell>
          </tr>
        </AdminTableHeader>
        <tbody className={isFetching ? "opacity-70" : ""}>
          {isInitialLoading ? (
            <AdminTableEmpty colSpan={6} message="Loading maintenance blocks..." />
          ) : isError ? (
            <AdminTableEmpty
              colSpan={6}
              message="Failed to load maintenance blocks."
            />
          ) : isEmpty ? (
            <AdminTableEmpty colSpan={6} message={emptyMessage} />
          ) : (
            safeItems.map((block, index) => {
              const serial = (page - 1) * pageSize + index + 1;

              return (
                <AdminTableRow key={block.id}>
                  <AdminTableCell className="font-medium text-slate-700">
                    {serial}
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="font-medium text-slate-900">
                      {getTargetLabel(block)}
                    </div>
                    <StatusBadge status={block.targetType} />
                  </AdminTableCell>
                  <AdminTableCell>
                    {block.reason
                      ? highlightText(block.reason, search)
                      : "Scheduled maintenance"}
                  </AdminTableCell>
                  <AdminTableCell>
                    {formatDate(block.startDate)} - {formatDate(block.endDate)}
                  </AdminTableCell>
                  <AdminTableCell>{block.createdByName}</AdminTableCell>
                  <AdminTableCell>
                    <div className="flex gap-3">
                      <button
                        onClick={() => onEdit(block)}
                        className="text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(block)}
                        className="text-rose-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
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
