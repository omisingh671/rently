import AdminTable from "@/components/admin-table/AdminTable";
import AdminTableCell from "@/components/admin-table/AdminTableCell";
import AdminTableContainer from "@/components/admin-table/AdminTableContainer";
import AdminTableEmpty from "@/components/admin-table/AdminTableEmpty";
import AdminTableHeader from "@/components/admin-table/AdminTableHeader";
import AdminTableLoadingOverlay from "@/components/admin-table/AdminTableLoadingOverlay";
import AdminTableRow from "@/components/admin-table/AdminTableRow";
import ActiveToggle from "@/components/common/ActiveToggle";
import StatusBadge from "@/components/common/StatusBadge";
import { highlightText } from "@/utils/highlightText";
import type { AdminRoom, RoomStatus } from "../types";

type Props = {
  items?: AdminRoom[];
  page: number;
  pageSize: number;
  search: string;
  isPending: boolean;
  isFetching: boolean;
  isError?: boolean;
  emptyMessage?: string;
  isUpdating: boolean;
  onUpdate: (args: {
    roomId: string;
    payload: { isActive?: boolean; status?: RoomStatus };
  }) => void;
  onEdit: (room: AdminRoom) => void;
};

export default function RoomsTable({
  items,
  page,
  pageSize,
  search,
  isPending,
  isFetching,
  isError = false,
  emptyMessage = "No rooms found.",
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
            <AdminTableCell as="th">Room</AdminTableCell>
            <AdminTableCell as="th">Unit</AdminTableCell>
            <AdminTableCell as="th">Rent</AdminTableCell>
            <AdminTableCell as="th">Capacity</AdminTableCell>
            <AdminTableCell as="th">Status</AdminTableCell>
            <AdminTableCell as="th">Active</AdminTableCell>
            <AdminTableCell as="th">Action</AdminTableCell>
          </tr>
        </AdminTableHeader>
        <tbody className={isFetching ? "opacity-70" : ""}>
          {isInitialLoading ? (
            <AdminTableEmpty colSpan={8} message="Loading rooms..." />
          ) : isError ? (
            <AdminTableEmpty colSpan={8} message="Failed to load rooms." />
          ) : isEmpty ? (
            <AdminTableEmpty colSpan={8} message={emptyMessage} />
          ) : (
            safeItems.map((room, index) => {
              const serial = (page - 1) * pageSize + index + 1;

              return (
                <AdminTableRow key={room.id}>
                  <AdminTableCell className="font-medium text-slate-700">
                    {serial}
                  </AdminTableCell>
                  <AdminTableCell className="font-medium text-slate-900">
                    <div>{highlightText(room.number, search)}</div>
                    <div className="text-xs font-normal text-slate-500">
                      {highlightText(room.name, search)}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>{room.unitNumber}</AdminTableCell>
                  <AdminTableCell>{room.rent.toLocaleString()}</AdminTableCell>
                  <AdminTableCell>
                    {room.maxOccupancy} {room.hasAC ? "AC" : "Non-AC"}
                  </AdminTableCell>
                  <AdminTableCell>
                    <StatusBadge status={room.status} />
                  </AdminTableCell>
                  <AdminTableCell>
                    <ActiveToggle
                      checked={room.isActive}
                      disabled={isUpdating}
                      onChange={(next) =>
                        onUpdate({
                          roomId: room.id,
                          payload: { isActive: next },
                        })
                      }
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <button
                      onClick={() => onEdit(room)}
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
