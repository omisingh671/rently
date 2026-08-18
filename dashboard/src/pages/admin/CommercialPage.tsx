import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBriefcase, FiCheckCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import {
  createCompanyApi,
  createGroupApi,
  listCompaniesApi,
  listGroupsApi,
  updateCompanyApi,
} from "@/features/commercial/api";
import CompanyAccountForm from "@/features/commercial/components/CompanyAccountForm";
import CompanyAccountsManager from "@/features/commercial/components/CompanyAccountsManager";
import CommercialWorkflowGuide from "@/features/commercial/components/CommercialWorkflowGuide";
import GroupStaysManager from "@/features/commercial/components/GroupStaysManager";
import NewGroupStayForm from "@/features/commercial/components/NewGroupStayForm";
import type {
  BookingGroup,
  CompanyAccount,
  CreateCompanyPayload,
  CreateGroupPayload,
  UpdateCompanyPayload,
} from "@/features/commercial/types";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import PropertySearchSelect from "@/features/properties/components/PropertySearchSelect";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";

export default function CommercialPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedPropertyId, selectedProperty, setSelectedPropertyId } =
    useCurrentProperty();
  const role = useAuthStore((state) => state.user?.role);
  const canManage = role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [preferredCompanyId, setPreferredCompanyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const companiesQuery = useQuery({
    queryKey: ADMIN_KEYS.commercial.companies(selectedPropertyId),
    queryFn: () => listCompaniesApi(selectedPropertyId),
    enabled: Boolean(selectedPropertyId),
  });
  const groupsQuery = useQuery({
    queryKey: ADMIN_KEYS.commercial.groups(selectedPropertyId),
    queryFn: () => listGroupsApi(selectedPropertyId),
    enabled: Boolean(selectedPropertyId),
  });
  const activeCompanies = useMemo(
    () => (companiesQuery.data ?? []).filter((company) => company.isActive),
    [companiesQuery.data],
  );

  const action = useMutation({
    mutationFn: async (
      operation: () => Promise<BookingGroup | CompanyAccount>,
    ) => operation(),
    onError: (caught) => setError(normalizeApiError(caught).message),
  });
  const refreshLists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.commercial.companies(selectedPropertyId),
      }),
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.commercial.groups(selectedPropertyId),
      }),
    ]);
  };
  const run = async (
    operation: () => Promise<BookingGroup | CompanyAccount>,
    successMessage: string,
  ) => {
    setError("");
    setSuccess("");
    try {
      const result = await action.mutateAsync(operation);
      await refreshLists();
      setSuccess(successMessage);
      return result;
    } catch {
      return null;
    }
  };

  const submitCompany = async (payload: CreateCompanyPayload) => {
    const created = await run(
      () => createCompanyApi(selectedPropertyId, payload),
      "Company account saved. It is ready to use in Bill To.",
    );
    if (!created || !("legalName" in created)) return false;
    setPreferredCompanyId(created.id);
    setIsCreatingCompany(false);
    return true;
  };

  const submitCompanyUpdate = async (
    companyId: string,
    payload: UpdateCompanyPayload,
  ) => {
    const updated = await run(
      () => updateCompanyApi(companyId, payload),
      payload.isActive === false
        ? "Company account deactivated. Existing group history remains linked."
        : payload.isActive === true
          ? "Company account reactivated and available for new groups."
          : "Company account updated.",
    );
    if (updated && payload.isActive === false) {
      setPreferredCompanyId((current) => (current === companyId ? "" : current));
    }
    return updated !== null;
  };

  const submitGroup = async (payload: CreateGroupPayload) => {
    const created = await run(
      () => createGroupApi(selectedPropertyId, payload),
      "Group stay created.",
    );
    if (!created || !("groupRef" in created)) return false;
    setIsCreatingGroup(false);
    navigate(adminPath(ADMIN_ROUTES.COMMERCIAL_GROUP(created.id)));
    return true;
  };

  const closeCompanyModal = () => {
    if (action.isPending) return;
    setIsCreatingCompany(false);
    setError("");
  };
  const closeGroupModal = () => {
    if (action.isPending) return;
    setIsCreatingGroup(false);
    setError("");
  };

  if (!selectedPropertyId) {
    return <p className="text-sm text-slate-600">Select an accessible property to manage commercial stays.</p>;
  }

  const queryError = companiesQuery.error ?? groupsQuery.error;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600"><FiBriefcase aria-hidden="true" />Commercial Operations</div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Corporate & Group Stays</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Manage reusable company accounts and dated group stays. Open a group only when you need room, guest, status, or folio operations.</p>
          </div>
          <div className="w-full sm:w-72 xl:w-80">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Operating Property</span>
            <PropertySearchSelect
              className="w-full"
              selectedPropertyId={selectedPropertyId}
              selectedPropertyName={selectedProperty?.name}
              onChange={(propertyId) => {
                setSuccess("");
                setError("");
                setIsCreatingCompany(false);
                setIsCreatingGroup(false);
                setPreferredCompanyId("");
                setSelectedPropertyId(propertyId || null);
              }}
            />
          </div>
        </div>
      </section>

      <CommercialWorkflowGuide />

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {queryError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{normalizeApiError(queryError).message}</div>}
      {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><FiCheckCircle aria-hidden="true" />{success}</div>}

      <div className="space-y-5">
        {canManage && (
          <CompanyAccountsManager
            companies={companiesQuery.data ?? []}
            isLoading={companiesQuery.isPending}
            isSubmitting={action.isPending}
            error={error}
            onClearError={() => setError("")}
            onAdd={() => { setError(""); setIsCreatingCompany(true); }}
            onUpdate={submitCompanyUpdate}
          />
        )}
        <GroupStaysManager
          groups={groupsQuery.data ?? []}
          propertyName={selectedProperty?.name ?? "Selected Property"}
          isLoading={groupsQuery.isPending}
          canManage={canManage}
          onAdd={() => { setError(""); setIsCreatingGroup(true); }}
          onOpenGroup={(id) => navigate(adminPath(ADMIN_ROUTES.COMMERCIAL_GROUP(id)))}
        />
      </div>

      <Modal isOpen={isCreatingCompany} onClose={closeCompanyModal} title="Add Company Account" size="lg" disableBackdropClose={action.isPending} disableEscapeClose={action.isPending}>
        <div className="space-y-4">
          {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <CompanyAccountForm display="modal" isSubmitting={action.isPending} onCancel={closeCompanyModal} onSubmit={submitCompany} />
        </div>
      </Modal>

      <Modal isOpen={isCreatingGroup} onClose={closeGroupModal} title="Add Group Stay" size="lg" disableBackdropClose={action.isPending} disableEscapeClose={action.isPending}>
        <div className="space-y-4">
          {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <NewGroupStayForm companies={activeCompanies} initialCompanyId={preferredCompanyId} isSubmitting={action.isPending || companiesQuery.isPending} onCancel={closeGroupModal} onSubmit={submitGroup} />
        </div>
      </Modal>
    </div>
  );
}
