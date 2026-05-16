import type { Amenity } from "../types";
import AmenityStatusToggle from "./AmenityStatusToggle";

import { resolveIcon } from "@/utils/resolveIcon";
import { highlightText } from "@/utils/highlightText";

import AdminTableContainer from "@/components/admin-table/AdminTableContainer";
import AdminTable from "@/components/admin-table/AdminTable";
import AdminTableHeader from "@/components/admin-table/AdminTableHeader";
import AdminTableRow from "@/components/admin-table/AdminTableRow";
import AdminTableCell from "@/components/admin-table/AdminTableCell";
import AdminTableEmpty from "@/components/admin-table/AdminTableEmpty";
import AdminTableLoadingOverlay from "@/components/admin-table/AdminTableLoadingOverlay";

type Props = {
  items?: Amenity[];
  page: number;
  pageSize: number;
  search: string;
  isPending: boolean;
  isFetching: boolean;
  isError?: boolean;
  emptyMessage?: string;
  isUpdating: boolean;
  onUpdate: (args: {
    amenityId: string;
    payload: { isActive?: boolean };
  }) => void;
  onEdit: (amenity: Amenity) => void;
};

export default function AmenitiesTable({
  items,
  page,
  pageSize,
  search,
  isPending,
  isFetching,
  isError = false,
  emptyMessage = "No amenities found.",
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
            <AdminTableCell as="th">#SN</AdminTableCell>
            <AdminTableCell as="th">Name</AdminTableCell>
            <AdminTableCell as="th">Icon</AdminTableCell>
            <AdminTableCell as="th">Active</AdminTableCell>
            <AdminTableCell as="th">Actions</AdminTableCell>
          </tr>
        </AdminTableHeader>

        <tbody className={isFetching ? "opacity-70" : ""}>
          {isInitialLoading ? (
            <AdminTableEmpty colSpan={5} message="Loading amenities..." />
          ) : isError ? (
            <AdminTableEmpty colSpan={5} message="Failed to load amenities." />
          ) : isEmpty ? (
            <AdminTableEmpty colSpan={5} message={emptyMessage} />
          ) : (
            safeItems.map((a, index) => {
              const serial = (page - 1) * pageSize + index + 1;

              const IconComponent = resolveIcon(a.icon);

              return (
                <AdminTableRow key={a.id}>
                  {/* Serial */}
                  <AdminTableCell className="font-medium text-slate-700">
                    {serial}
                  </AdminTableCell>

                  {/* Name */}
                  <AdminTableCell className="font-medium text-slate-900">
                    {highlightText(a.name, search)}
                  </AdminTableCell>

                  {/* Icon */}
                  <AdminTableCell className="text-slate-600">
                    {IconComponent ? (
                      <div className="flex items-center gap-2">
                        <IconComponent className="text-slate-700" />
                        <span className="text-xs text-slate-500">{a.icon}</span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </AdminTableCell>

                  {/* Active Toggle */}
                  <AdminTableCell>
                    <AmenityStatusToggle
                      checked={a.isActive}
                      disabled={isUpdating}
                      onChange={(next) =>
                        onUpdate({
                          amenityId: a.id,
                          payload: { isActive: next },
                        })
                      }
                    />
                  </AdminTableCell>

                  {/* Actions */}
                  <AdminTableCell>
                    <button
                      className="text-indigo-600 hover:underline text-sm"
                      onClick={() => onEdit(a)}
                      type="button"
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
