import { useEffect, useState } from "react";
import { FiRefreshCcw, FiTrash2, FiUsers } from "react-icons/fi";

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
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { normalizeApiError } from "@/utils/errors";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { useAdminSessions } from "@/features/users/hooks/useAdminUsers";
import type {
  AdminSessionStatus,
  ManagedUserRole,
} from "@/features/users/types";

type Filters = {
  search: string;
  role: ManagedUserRole | "";
  status: AdminSessionStatus | "";
};

const roleOptions: ManagedUserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "GUEST",
];

const sessionBadge = {
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-slate-100 text-slate-700",
  CURRENT: "bg-blue-100 text-blue-700",
};

export default function SessionsPage() {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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
    status: "",
  });

  useEffect(() => {
    setPage(1);
  }, [filters.role, filters.status, setPage]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    revokeSession,
    revokeExpiredSessions,
    revokeUserSessions,
    isRevokingSession,
    isRevokingExpiredSessions,
    isRevokingUserSessions,
  } = useAdminSessions(page, pageSize, {
    search: debouncedSearch,
    ...(filters.role && { role: filters.role }),
    ...(filters.status && { status: filters.status }),
  });

  const sessions = data?.items ?? [];
  const pagination = data?.pagination;
  const visiblePagination =
    pagination && pagination.total > pageSize ? pagination : null;
  const isBusy =
    isRevokingSession || isRevokingExpiredSessions || isRevokingUserSessions;

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await action();
      setActionSuccess(success);
    } catch (error) {
      setActionError(normalizeApiError(error).message);
    }
  };

  const resetFilters = () =>
    setFilters({
      search: "",
      role: "",
      status: "",
    });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              placeholder="Search user or email"
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
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  status: event.target.value as Filters["status"],
                }))
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All sessions</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              icon={<FiRefreshCcw />}
              onClick={resetFilters}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={<FiTrash2 />}
              disabled={isBusy}
              title="Delete all expired session tokens from the database to clean up storage"
              onClick={() =>
                runAction(
                  async () => {
                    const result = await revokeExpiredSessions();
                    return result.count;
                  },
                  "Expired sessions cleaned up.",
                )
              }
            >
              Clear Expired Sessions
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
        {isError && <AdminTableError message="Failed to load sessions." />}

        <AdminTable>
          <AdminTableHeader>
            <tr>
              <AdminTableCell as="th">#</AdminTableCell>
              <AdminTableCell as="th">User</AdminTableCell>
              <AdminTableCell as="th">Role</AdminTableCell>
              <AdminTableCell as="th">Status</AdminTableCell>
              <AdminTableCell as="th">Device</AdminTableCell>
              <AdminTableCell as="th">Expires</AdminTableCell>
              <AdminTableCell as="th" align="right">
                Actions
              </AdminTableCell>
            </tr>
          </AdminTableHeader>

          <tbody className={isFetching ? "opacity-70" : ""}>
            {isPending && sessions.length === 0 ? (
              <AdminTableEmpty colSpan={7} message="Loading sessions..." />
            ) : sessions.length === 0 ? (
              <AdminTableEmpty colSpan={7} message="No sessions found." />
            ) : (
              sessions.map((session, index) => {
                const status = session.isCurrent
                  ? "CURRENT"
                  : session.isExpired
                    ? "EXPIRED"
                    : "ACTIVE";

                return (
                  <AdminTableRow key={session.id}>
                    <AdminTableCell className="font-medium text-slate-700">
                      {(page - 1) * pageSize + index + 1}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="font-medium text-slate-900">
                        {session.userFullName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {session.userEmail}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>{session.userRole}</AdminTableCell>
                    <AdminTableCell>
                      <StatusBadge
                        status={status}
                        variantMap={sessionBadge}
                      />
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="max-w-xs truncate text-sm text-slate-700">
                        {session.userAgent ?? "Unknown device"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {session.ip ?? "Unknown IP"}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      {new Date(session.expiresAt).toLocaleString()}
                    </AdminTableCell>
                    <AdminTableCell align="right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          icon={<FiTrash2 />}
                          disabled={session.isCurrent || isBusy}
                          title="Terminate this specific active login session"
                          onClick={() =>
                            runAction(
                              () => revokeSession(session.id),
                              "Session revoked.",
                            )
                          }
                        >
                          Revoke
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          icon={<FiUsers />}
                          disabled={isBusy}
                          title="Force log out this user from all devices by terminating all of their active sessions"
                          onClick={() =>
                            runAction(
                              () => revokeUserSessions(session.userId),
                              "User sessions revoked.",
                            )
                          }
                        >
                          Revoke All for User
                        </Button>
                      </div>
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
    </div>
  );
}
