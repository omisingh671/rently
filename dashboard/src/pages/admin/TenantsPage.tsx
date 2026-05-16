import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";

import AdminTable from "@/components/admin-table/AdminTable";
import AdminTableCell from "@/components/admin-table/AdminTableCell";
import AdminTableContainer from "@/components/admin-table/AdminTableContainer";
import AdminTableEmpty from "@/components/admin-table/AdminTableEmpty";
import AdminTableHeader from "@/components/admin-table/AdminTableHeader";
import AdminTableLoadingOverlay from "@/components/admin-table/AdminTableLoadingOverlay";
import AdminTableRow from "@/components/admin-table/AdminTableRow";
import Pagination from "@/components/common/Pagination";
import PageSizeSelector from "@/components/common/PageSizeSelector";
import Button from "@/components/ui/Button";
import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { useAdminTenants } from "@/features/tenants/hooks/useAdminTenants";
import type {
  AdminTenant,
  TenantFormPayload,
  TenantStatus,
} from "@/features/tenants/types";
import { highlightText } from "@/utils/highlightText";

type Filters = {
  search: string;
  status: TenantStatus | "";
};

const emptyForm: TenantFormPayload = {
  name: "",
  slug: "",
  primaryDomain: "",
  status: "ACTIVE",
  brandName: "",
  logoUrl: "",
  primaryColor: "#4f46e5",
  secondaryColor: "#f59e0b",
  supportEmail: "",
  supportPhone: "",
  defaultCurrency: "INR",
  timezone: "Asia/Kolkata",
  payAtCheckInEnabled: true,
  bookingTokenAmount: 10,
};

const buildTenantSlug = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "tenant";
};

const toPayload = (
  form: TenantFormPayload,
  options: { includeSlug: boolean },
): TenantFormPayload => {
  const slug = form.slug?.trim();

  return {
    name: form.name.trim(),
    ...(options.includeSlug && slug ? { slug } : {}),
    primaryDomain: form.primaryDomain?.trim() || null,
    status: form.status,
    brandName: form.brandName.trim(),
    logoUrl: form.logoUrl?.trim() || null,
    primaryColor: form.primaryColor,
    secondaryColor: form.secondaryColor,
    supportEmail: form.supportEmail?.trim() || null,
    supportPhone: form.supportPhone?.trim() || null,
    defaultCurrency: form.defaultCurrency?.trim().toUpperCase() || "INR",
    timezone: form.timezone?.trim() || "Asia/Kolkata",
    payAtCheckInEnabled: form.payAtCheckInEnabled ?? true,
    bookingTokenAmount: Number(form.bookingTokenAmount ?? 10),
  };
};

const formFromTenant = (tenant: AdminTenant): TenantFormPayload => ({
  name: tenant.name,
  slug: tenant.slug,
  primaryDomain: tenant.primaryDomain ?? "",
  status: tenant.status,
  brandName: tenant.brandName,
  logoUrl: tenant.logoUrl ?? "",
  primaryColor: tenant.primaryColor,
  secondaryColor: tenant.secondaryColor,
  supportEmail: tenant.supportEmail ?? "",
  supportPhone: tenant.supportPhone ?? "",
  defaultCurrency: tenant.defaultCurrency,
  timezone: tenant.timezone,
  payAtCheckInEnabled: tenant.payAtCheckInEnabled,
  bookingTokenAmount: Number(tenant.bookingTokenAmount),
});

export default function TenantsPage() {
  const [editingTenant, setEditingTenant] = useState<AdminTenant | null>(null);
  const [form, setForm] = useState<TenantFormPayload>(emptyForm);
  const [serverError, setServerError] = useState<string | null>(null);

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
    status: "",
  });

  useEffect(() => {
    setPage(1);
  }, [filters.status, setPage]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    createTenant,
    isCreating,
    updateTenant,
    isUpdating,
  } = useAdminTenants(page, pageSize, {
    search: debouncedSearch,
    status: filters.status,
  });

  const isSubmitting = isCreating || isUpdating;
  const safeItems = data?.items ?? [];
  const isInitialLoading = isPending && safeItems.length === 0;

  const updateField = (
    name: keyof TenantFormPayload,
    value: string | number | boolean,
  ) => {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "name" && typeof value === "string" && !editingTenant
        ? { slug: buildTenantSlug(value) }
        : {}),
    }));
  };

  const resetForm = () => {
    setEditingTenant(null);
    setForm(emptyForm);
    setServerError(null);
  };

  const handleEdit = (tenant: AdminTenant) => {
    setEditingTenant(tenant);
    setForm(formFromTenant(tenant));
    setServerError(null);
  };

  const handleError = (error: unknown) => {
    const message =
      (error as AxiosError<{ error?: { message?: string } }>)?.response?.data
        ?.error?.message ?? "Failed to save tenant";
    setServerError(message);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const payload = toPayload(form, { includeSlug: editingTenant !== null });

    if (editingTenant) {
      updateTenant(
        { tenantId: editingTenant.id, payload },
        {
          onSuccess: resetForm,
          onError: handleError,
        },
      );
      return;
    }

    createTenant(payload, {
      onSuccess: resetForm,
      onError: handleError,
    });
  };

  if (isError) {
    return (
      <div className="rounded border border-rose-300 bg-rose-50 p-4 text-rose-700">
        Failed to load tenants
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={submit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Tenant name"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            required
          />
          <input
            value={form.slug ?? ""}
            placeholder="Generated slug"
            className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 outline-none"
            readOnly
          />
          <input
            value={form.brandName}
            onChange={(event) => updateField("brandName", event.target.value)}
            placeholder="Brand name"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            required
          />
          <input
            value={form.primaryDomain ?? ""}
            onChange={(event) =>
              updateField("primaryDomain", event.target.value)
            }
            placeholder="Primary domain"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
          <input
            type="email"
            value={form.supportEmail ?? ""}
            onChange={(event) =>
              updateField("supportEmail", event.target.value)
            }
            placeholder="Support email"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
          <input
            value={form.supportPhone ?? ""}
            onChange={(event) =>
              updateField("supportPhone", event.target.value)
            }
            placeholder="Support phone"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
          <select
            value={form.status}
            onChange={(event) => updateField("status", event.target.value)}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-600">
              Primary
              <input
                type="color"
                value={form.primaryColor}
                onChange={(event) =>
                  updateField("primaryColor", event.target.value)
                }
                className="h-7 w-10 rounded border border-slate-300"
                aria-label="Primary brand color"
              />
            </label>
            <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-600">
              Secondary
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(event) =>
                  updateField("secondaryColor", event.target.value)
                }
                className="h-7 w-10 rounded border border-slate-300"
                aria-label="Secondary brand color"
              />
            </label>
          </div>
          <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.payAtCheckInEnabled ?? true}
              onChange={(event) =>
                updateField("payAtCheckInEnabled", event.target.checked)
              }
              className="h-4 w-4"
            />
            Token before check-in
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={form.bookingTokenAmount ?? 10}
            onChange={(event) =>
              updateField("bookingTokenAmount", Number(event.target.value))
            }
            placeholder="Token amount"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
            disabled={!form.payAtCheckInEnabled}
          />
        </div>

        {serverError && (
          <p className="text-sm font-medium text-rose-700">{serverError}</p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {editingTenant ? "Save Tenant" : "Create Tenant"}
          </Button>
          {editingTenant && (
            <Button type="button" variant="dark" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={filters.search}
          onChange={(event) =>
            setFilters({ ...filters, search: event.target.value })
          }
          placeholder="Search tenants"
          className="h-10 min-w-56 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />
        <select
          value={filters.status}
          onChange={(event) =>
            setFilters({
              ...filters,
              status: event.target.value as TenantStatus | "",
            })
          }
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <AdminTableContainer>
        <AdminTableLoadingOverlay visible={isFetching} />
        <AdminTable>
          <AdminTableHeader>
            <tr>
              <AdminTableCell as="th">#SN</AdminTableCell>
              <AdminTableCell as="th">Tenant</AdminTableCell>
              <AdminTableCell as="th">Slug</AdminTableCell>
              <AdminTableCell as="th">Domain</AdminTableCell>
              <AdminTableCell as="th">Support</AdminTableCell>
              <AdminTableCell as="th">Booking Payment</AdminTableCell>
              <AdminTableCell as="th">Status</AdminTableCell>
              <AdminTableCell as="th">Action</AdminTableCell>
            </tr>
          </AdminTableHeader>
          <tbody className={isFetching ? "opacity-70" : ""}>
            {isInitialLoading ? (
              <AdminTableEmpty colSpan={8} message="Loading tenants..." />
            ) : safeItems.length === 0 ? (
              <AdminTableEmpty colSpan={8} message="No tenants found." />
            ) : (
              safeItems.map((tenant, index) => (
                <AdminTableRow key={tenant.id}>
                  <AdminTableCell>
                    {(page - 1) * pageSize + index + 1}
                  </AdminTableCell>
                  <AdminTableCell className="font-medium text-slate-900">
                    {highlightText(tenant.name, debouncedSearch)}
                  </AdminTableCell>
                  <AdminTableCell>{tenant.slug}</AdminTableCell>
                  <AdminTableCell>{tenant.primaryDomain ?? "-"}</AdminTableCell>
                  <AdminTableCell>{tenant.supportEmail ?? "-"}</AdminTableCell>
                  <AdminTableCell>
                    {tenant.payAtCheckInEnabled
                      ? `Token INR ${Number(tenant.bookingTokenAmount)}`
                      : "No upfront payment"}
                  </AdminTableCell>
                  <AdminTableCell>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {tenant.status}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(tenant)}
                    >
                      Edit
                    </Button>
                  </AdminTableCell>
                </AdminTableRow>
              ))
            )}
          </tbody>
        </AdminTable>
      </AdminTableContainer>

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <PageSizeSelector value={pageSize} onChange={setPageSize} />
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
