import { Link } from "react-router-dom";

import { adminPath, ADMIN_ROUTES } from "@/configs/routePathsAdmin";

import type { AdminProperty } from "../types";
import type { PropertyStatus } from "@/features/admin/properties/types";

import PropertyStatusBadge from "./PropertyStatusBadge";
import PropertyStatusToggle from "./PropertyStatusToggle";

import AdminTableContainer from "@/components/admin-table/AdminTableContainer";
import AdminTable from "@/components/admin-table/AdminTable";
import AdminTableHeader from "@/components/admin-table/AdminTableHeader";
import AdminTableRow from "@/components/admin-table/AdminTableRow";
import AdminTableCell from "@/components/admin-table/AdminTableCell";
import AdminTableEmpty from "@/components/admin-table/AdminTableEmpty";
import AdminTableLoadingOverlay from "@/components/admin-table/AdminTableLoadingOverlay";

import { highlightText } from "@/utils/highlightText";

type Props = {
  items?: AdminProperty[];
  page: number;
  pageSize: number;
  search: string;
  isPending: boolean;
  isFetching: boolean;
  isUpdating: boolean;
  canManage?: boolean;
  onUpdate: (args: {
    propertyId: string;
    payload: { isActive?: boolean; status?: PropertyStatus };
  }) => void;
};

export default function PropertiesTable({
  items,
  page,
  pageSize,
  search,
  isPending,
  isFetching,
  isUpdating,
  canManage = true,
  onUpdate,
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
            <AdminTableCell as="th">Tenant</AdminTableCell>
            <AdminTableCell as="th">City</AdminTableCell>
            <AdminTableCell as="th">State</AdminTableCell>
            <AdminTableCell as="th">Status</AdminTableCell>
            <AdminTableCell as="th">Active</AdminTableCell>
          </tr>
        </AdminTableHeader>

        <tbody className={isFetching ? "opacity-70" : ""}>
          {isInitialLoading ? (
            <AdminTableEmpty colSpan={7} message="Loading properties..." />
          ) : isEmpty ? (
            <AdminTableEmpty colSpan={7} message="No properties found." />
          ) : (
            safeItems.map((p, index) => {
              const serial = (page - 1) * pageSize + index + 1;

              return (
                <AdminTableRow key={p.id}>
                  <AdminTableCell className="font-medium text-slate-700">
                    {serial}
                  </AdminTableCell>

                  <AdminTableCell className="font-medium text-slate-900">
                    {canManage ? (
                      <Link
                        to={adminPath(ADMIN_ROUTES.PROPERTY_EDIT(p.id))}
                        className="text-indigo-600 hover:underline"
                        aria-label={`Edit property ${p.name}`}
                      >
                        {highlightText(p.name, search)}
                      </Link>
                    ) : (
                      <span>{highlightText(p.name, search)}</span>
                    )}
                  </AdminTableCell>

                  <AdminTableCell>{p.tenantName}</AdminTableCell>

                  <AdminTableCell>
                    {highlightText(p.city, search)}
                  </AdminTableCell>

                  <AdminTableCell>{p.state}</AdminTableCell>

                  <AdminTableCell>
                    <PropertyStatusBadge status={p.status} />
                  </AdminTableCell>

                  <AdminTableCell>
                    <PropertyStatusToggle
                      checked={p.isActive}
                      disabled={isUpdating || !canManage}
                      onChange={(next) =>
                        onUpdate({
                          propertyId: p.id,
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
