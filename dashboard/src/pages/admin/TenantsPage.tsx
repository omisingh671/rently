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
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { API_BASE_URL } from "@/configs/appConfig";

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
  primaryColor: "#4f46e5",
  secondaryColor: "#f59e0b",
  supportEmail: "",
  supportPhone: "",
  defaultCurrency: "INR",
  timezone: "Asia/Kolkata",
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
    primaryColor: form.primaryColor,
    secondaryColor: form.secondaryColor,
    supportEmail: form.supportEmail?.trim() || null,
    supportPhone: form.supportPhone?.trim() || null,
    defaultCurrency: form.defaultCurrency?.trim().toUpperCase() || "INR",
    timezone: form.timezone?.trim() || "Asia/Kolkata",
  };
};

const formFromTenant = (tenant: AdminTenant): TenantFormPayload => ({
  name: tenant.name,
  slug: tenant.slug,
  primaryDomain: tenant.primaryDomain ?? "",
  status: tenant.status,
  brandName: tenant.brandName,
  primaryColor: tenant.primaryColor,
  secondaryColor: tenant.secondaryColor,
  supportEmail: tenant.supportEmail ?? "",
  supportPhone: tenant.supportPhone ?? "",
  defaultCurrency: tenant.defaultCurrency,
  timezone: tenant.timezone,
});

export default function TenantsPage() {
  const [editingTenant, setEditingTenant] = useState<AdminTenant | null>(null);
  const [form, setForm] = useState<TenantFormPayload>(emptyForm);
  const [serverError, setServerError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

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
    createTenantAsync,
    isCreating,
    updateTenantAsync,
    isUpdating,
    uploadTenantLogo,
    isUploadingLogo,
    removeTenantLogo,
    isRemovingLogo,
  } = useAdminTenants(page, pageSize, {
    search: debouncedSearch,
    status: filters.status,
  });

  const isSubmitting =
    isCreating || isUpdating || isUploadingLogo || isRemovingLogo;
  const safeItems = data?.items ?? [];
  const isInitialLoading = isPending && safeItems.length === 0;
  const visiblePagination =
    data?.pagination && data.pagination.total > pageSize
      ? data.pagination
      : null;

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
    setLogoFile(null);
    setLogoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setServerError(null);
  };

  const handleEdit = (tenant: AdminTenant) => {
    setEditingTenant(tenant);
    setForm(formFromTenant(tenant));
    setLogoFile(null);
    setLogoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setServerError(null);
  };

  const handleError = (error: unknown) => {
    const message =
      (error as AxiosError<{ error?: { message?: string } }>)?.response?.data
        ?.error?.message ?? "Failed to save tenant";
    setServerError(message);
  };

  const selectLogo = (file: File | null) => {
    setLogoFile(file);
    setLogoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const displayLogoUrl = (logoUrl: string | null | undefined) => {
    if (!logoUrl || logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      return logoUrl ?? null;
    }

    return `${API_BASE_URL}${logoUrl}`;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const payload = toPayload(form, { includeSlug: editingTenant !== null });

    try {
      const tenant = editingTenant
        ? await updateTenantAsync({ tenantId: editingTenant.id, payload })
        : await createTenantAsync(payload);

      if (logoFile) {
        if (!editingTenant) {
          setEditingTenant(tenant);
          setForm(formFromTenant(tenant));
        }
        await uploadTenantLogo({ tenantId: tenant.id, file: logoFile });
      }

      resetForm();
    } catch (error) {
      handleError(error);
    }
  };

  const handleRemoveLogo = async () => {
    if (!editingTenant?.logoUrl) return;

    setServerError(null);
    try {
      await removeTenantLogo(editingTenant.id);
      setEditingTenant({ ...editingTenant, logoUrl: null });
      setLogoFile(null);
      setLogoPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    } catch (error) {
      handleError(error);
    }
  };

  const currentLogoUrl = logoPreviewUrl ?? displayLogoUrl(editingTenant?.logoUrl);

  if (isError) {
    return (
      <div className="rounded border border-rose-300 bg-rose-50 p-4 text-rose-700">
        Failed to load tenants
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Tenant details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Configure the tenant identity, support contact, and brand colors.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <label className="flex h-10 items-center justify-between gap-2 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-600">
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
                <label className="flex h-10 items-center justify-between gap-2 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-600">
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
            </div>
          </section>

          <aside className="flex flex-col rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Logo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Displayed throughout the tenant public site.
              </p>
            </div>

            <div className="mt-4 flex min-h-40 flex-1 items-center justify-center rounded-lg border border-dashed border-indigo-200 bg-white p-4">
              {currentLogoUrl ? (
                <img
                  src={currentLogoUrl}
                  alt="Tenant logo preview"
                  className="max-h-32 max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-sm text-slate-500">
                  <span className="block font-medium text-slate-700">No logo yet</span>
                  Upload the tenant brand mark.
                </div>
              )}
            </div>

            <label className="mt-4 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              {editingTenant?.logoUrl || logoFile ? "Replace logo" : "Upload logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => selectLogo(event.target.files?.[0] ?? null)}
              />
            </label>
            <p className="mt-2 text-center text-xs text-slate-500">
              PNG, JPEG, or WebP up to 10 MB
            </p>
            {editingTenant?.logoUrl && !logoFile && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={isSubmitting}
                className="mt-3 w-full"
              >
                Remove logo
              </Button>
            )}
          </aside>
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

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
              <AdminTableCell as="th">Status</AdminTableCell>
              <AdminTableCell as="th">Action</AdminTableCell>
            </tr>
          </AdminTableHeader>
          <tbody className={isFetching ? "opacity-70" : ""}>
            {isInitialLoading ? (
              <AdminTableEmpty colSpan={7} message="Loading tenants..." />
            ) : safeItems.length === 0 ? (
              <AdminTableEmpty colSpan={7} message="No tenants found." />
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
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {formatEnumLabel(tenant.status)}
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

      {visiblePagination && (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
