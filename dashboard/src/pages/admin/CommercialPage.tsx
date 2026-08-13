import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiHome,
  FiList,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import {
  addGroupChargeApi,
  createCompanyApi,
  createGroupApi,
  getGroupApi,
  holdGroupRoomsApi,
  listCompaniesApi,
  listGroupsApi,
  releaseGroupRoomsApi,
  updateGroupStatusApi,
  voidGroupChargeApi,
} from "@/features/commercial/api";
import CompanyAccountForm from "@/features/commercial/components/CompanyAccountForm";
import GroupStatusModal from "@/features/commercial/components/GroupStatusModal";
import type {
  BookingGroup,
  BookingGroupStatus,
  CompanyAccount,
  CreateCompanyPayload,
} from "@/features/commercial/types";
import PropertySearchSelect from "@/features/properties/components/PropertySearchSelect";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { useAdminRooms } from "@/features/rooms/hooks/useAdminRooms";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";
import { formatEnumLabel } from "@/utils/formatEnumLabel";

const inputClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const labelClass = "block text-sm font-medium text-slate-700";
const hintClass = "mt-1 block text-xs font-normal leading-5 text-slate-500";
const money = (value: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
const dateOnly = (value: string) => value.slice(0, 10);
const displayDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateOnly(value)}T00:00:00Z`));
const statusClass: Record<BookingGroupStatus, string> = {
  PROSPECT: "bg-slate-100 text-slate-700",
  TENTATIVE: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  IN_HOUSE: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};
const groupStatusTransitions: Record<BookingGroupStatus, BookingGroupStatus[]> = {
  PROSPECT: ["TENTATIVE", "CONFIRMED", "CANCELLED"],
  TENTATIVE: ["PROSPECT", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["TENTATIVE", "IN_HOUSE", "CANCELLED"],
  IN_HOUSE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
const groupStatuses = Object.keys(statusClass) as BookingGroupStatus[];
const GROUPS_PER_PAGE = 10;

export default function CommercialPage() {
  const queryClient = useQueryClient();
  const { selectedPropertyId, selectedProperty, setSelectedPropertyId } =
    useCurrentProperty();
  const role = useAuthStore((state) => state.user?.role);
  const canManage = role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
  const canOperate = canManage || role === "FRONT_DESK";
  const canPostCharges = canManage || role === "ACCOUNTANT";
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupStatusFilter, setGroupStatusFilter] =
    useState<BookingGroupStatus | "ALL">("ALL");
  const [groupPage, setGroupPage] = useState(1);
  const [pendingStatus, setPendingStatus] = useState<BookingGroupStatus | null>(null);
  const [groupForm, setGroupForm] = useState({
    companyId: "",
    name: "",
    checkIn: "",
    checkOut: "",
    expectedRooms: "1",
    expectedGuests: "1",
    releaseDate: "",
  });
  const [holdForm, setHoldForm] = useState({ releaseDate: "", reason: "Inventory held for group allotment" });
  const [chargeForm, setChargeForm] = useState({ description: "", amount: "", note: "" });

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
  const groupQuery = useQuery({
    queryKey: ADMIN_KEYS.commercial.group(selectedGroupId),
    queryFn: () => getGroupApi(selectedGroupId),
    enabled: Boolean(selectedGroupId),
  });
  const roomsQuery = useAdminRooms(selectedPropertyId || undefined, 1, 100, {
    search: "",
    status: "AVAILABLE",
    isActive: "true",
  });
  const activeCompanies = useMemo(
    () => (companiesQuery.data ?? []).filter((company) => company.isActive),
    [companiesQuery.data],
  );
  const groupStays = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const filteredGroupStays = useMemo(() => {
    const search = groupSearch.trim().toLowerCase();
    return groupStays.filter((group) => {
      const matchesStatus =
        groupStatusFilter === "ALL" || group.status === groupStatusFilter;
      const matchesSearch =
        !search ||
        group.name.toLowerCase().includes(search) ||
        group.groupRef.toLowerCase().includes(search) ||
        group.company?.legalName.toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [groupSearch, groupStatusFilter, groupStays]);
  const groupPageCount = Math.max(
    1,
    Math.ceil(filteredGroupStays.length / GROUPS_PER_PAGE),
  );
  const visibleGroupPage = Math.min(groupPage, groupPageCount);
  const firstVisibleGroupIndex = (visibleGroupPage - 1) * GROUPS_PER_PAGE;
  const visibleGroupStays = filteredGroupStays.slice(
    firstVisibleGroupIndex,
    firstVisibleGroupIndex + GROUPS_PER_PAGE,
  );

  const refreshCommercial = async (group?: BookingGroup) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.commercial.groups(selectedPropertyId) }),
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.commercial.companies(selectedPropertyId) }),
      ...(group
        ? [queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.commercial.group(group.id) })]
        : []),
    ]);
  };
  const action = useMutation({
    mutationFn: async (run: () => Promise<BookingGroup | unknown>) => run(),
    onError: (caught) => setError(normalizeApiError(caught).message),
  });
  const run = async (
    operation: () => Promise<BookingGroup | unknown>,
    successMessage?: string,
  ) => {
    setError("");
    setSuccess("");
    try {
      const result = await action.mutateAsync(operation);
      const group =
        typeof result === "object" && result !== null && "groupRef" in result
          ? (result as BookingGroup)
          : undefined;
      await refreshCommercial(group);
      if (successMessage) setSuccess(successMessage);
      return result;
    } catch {
      return null;
    }
  };

  const activeGroup =
    groupQuery.data?.propertyId === selectedPropertyId ? groupQuery.data : undefined;
  const queryError = companiesQuery.error ?? groupsQuery.error ?? groupQuery.error;
  const activeLocks = useMemo(
    () =>
      activeGroup?.inventoryLocks.filter(
        (lock) => !lock.releasedAt && new Date(lock.expiresAt) > new Date(),
      ) ?? [],
    [activeGroup],
  );
  const lockedRoomIds = new Set(activeLocks.flatMap((lock) => (lock.roomId ? [lock.roomId] : [])));

  const submitCompany = async (payload: CreateCompanyPayload) => {
    const created = await run(
      () => createCompanyApi(selectedPropertyId, payload),
      "Company account saved and selected in Bill To. Complete the group details below.",
    );
    if (!created) return false;
    setGroupForm((current) => ({ ...current, companyId: (created as CompanyAccount).id }));
    return true;
  };

  const submitStatusChange = async (reason: string) => {
    if (!activeGroup || !pendingStatus) return false;
    const changed = await run(
      () => updateGroupStatusApi(activeGroup.id, pendingStatus, reason),
      `Group status changed to ${formatEnumLabel(pendingStatus)}.`,
    );
    return changed !== null;
  };

  const submitGroup = async (event: FormEvent) => {
    event.preventDefault();
    const created = await run(
      () =>
        createGroupApi(selectedPropertyId, {
          companyId: groupForm.companyId || undefined,
          name: groupForm.name.trim(),
          checkIn: groupForm.checkIn,
          checkOut: groupForm.checkOut,
          expectedRooms: Number(groupForm.expectedRooms),
          expectedGuests: Number(groupForm.expectedGuests),
          releaseDate: groupForm.releaseDate || undefined,
        }),
      "Group stay created. You can now confirm it and hold rooms.",
    );
    if (!created) return;
    const createdGroup = created as BookingGroup;
    setSelectedGroupId(createdGroup.id);
    setGroupForm({ companyId: "", name: "", checkIn: "", checkOut: "", expectedRooms: "1", expectedGuests: "1", releaseDate: "" });
  };

  if (!selectedPropertyId) {
    return <p className="text-sm text-slate-600">Select an accessible property to manage commercial stays.</p>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              <FiBriefcase aria-hidden="true" />
              Commercial Operations
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Corporate & Group Stays
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Create a dated group stay, reserve exact rooms, and add each guest booking as
              names are confirmed.
            </p>
          </div>

          <div className="w-full sm:w-72 xl:w-80">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Operating Property
              </span>
              <PropertySearchSelect
                className="w-full"
                selectedPropertyId={selectedPropertyId}
                selectedPropertyName={selectedProperty?.name}
                onChange={(propertyId) => {
                  setSelectedGroupId("");
                  setSelectedRoomIds([]);
                  setSuccess("");
                  setError("");
                  setGroupSearch("");
                  setGroupStatusFilter("ALL");
                  setGroupPage(1);
                  setSelectedPropertyId(propertyId || null);
                }}
              />
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {queryError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{normalizeApiError(queryError).message}</div>}
      {success && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <FiCheckCircle aria-hidden="true" />
          {success}
        </div>
      )}

      {canManage && (
        <div className="grid gap-5 xl:grid-cols-2">
          <CompanyAccountForm
            isSubmitting={action.isPending}
            onSubmit={submitCompany}
          />
          <form onSubmit={submitGroup} className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <FiUsers aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">New Group Stay</h2>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">One event, tour, wedding, or corporate visit.</p>
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">Step 2</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-5">
              <label className={labelClass}>
                Stay or Group Name <span className="text-red-500">*</span>
                <input className={`${inputClass} mt-1.5`} required placeholder="e.g. Acme onboarding team — September" value={groupForm.name} onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <div>
                <label className={labelClass} htmlFor="group-company">Bill To</label>
                <select id="group-company" className={`${inputClass} mt-1.5`} value={groupForm.companyId} onChange={(event) => setGroupForm((current) => ({ ...current, companyId: event.target.value }))}>
                  <option value="">Independent group — no company billing</option>
                  {activeCompanies.map((company) => <option key={company.id} value={company.id}>{company.legalName}</option>)}
                </select>
                <span className={hintClass}>
                  Choose a saved company for corporate billing, or leave this independent.
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Check-In <span className="text-red-500">*</span>
                  <input className={`${inputClass} mt-1.5`} required type="date" value={groupForm.checkIn} onChange={(event) => setGroupForm((current) => ({ ...current, checkIn: event.target.value }))} />
                </label>
                <label className={labelClass}>
                  Check-Out <span className="text-red-500">*</span>
                  <input className={`${inputClass} mt-1.5`} required min={groupForm.checkIn || undefined} type="date" value={groupForm.checkOut} onChange={(event) => setGroupForm((current) => ({ ...current, checkOut: event.target.value }))} />
                </label>
                <label className={labelClass}>
                  Rooms Needed <span className="text-red-500">*</span>
                  <input className={`${inputClass} mt-1.5`} required min={1} max={500} type="number" value={groupForm.expectedRooms} onChange={(event) => setGroupForm((current) => ({ ...current, expectedRooms: event.target.value }))} />
                </label>
                <label className={labelClass}>
                  Guests Expected <span className="text-red-500">*</span>
                  <input className={`${inputClass} mt-1.5`} required min={1} max={5000} type="number" value={groupForm.expectedGuests} onChange={(event) => setGroupForm((current) => ({ ...current, expectedGuests: event.target.value }))} />
                </label>
              </div>
              <label className={labelClass}>
                Release Unsold Rooms On <span className="font-normal text-slate-400">(Optional)</span>
                <input className={`${inputClass} mt-1.5`} max={groupForm.checkIn || undefined} type="date" value={groupForm.releaseDate} onChange={(event) => setGroupForm((current) => ({ ...current, releaseDate: event.target.value }))} />
                <span className={hintClass}>Unsold held rooms should return to public inventory by this date.</span>
              </label>
              <Button fullWidth type="submit" className="mt-auto h-11" icon={<FiCalendar />} disabled={action.isPending || companiesQuery.isPending}>
                {action.isPending ? "Creating..." : "Create Group Stay"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <FiList aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">Manage Group Stays</h2>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {selectedProperty?.name ?? "Selected Property"} · Select a stay to manage rooms, guests, status, and folio.
                  </p>
                </div>
              </div>
              <span className="whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                Step 3
              </span>
            </div>
          </div>
          <div className="p-5">
            {!groupsQuery.isPending && groupStays.length > 0 && (
              <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">Search Groups</span>
                  <span className="relative block">
                    <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      className={`${inputClass} pl-9`}
                      placeholder="Search by group, company, or reference"
                      type="search"
                      value={groupSearch}
                      onChange={(event) => {
                        setGroupSearch(event.target.value);
                        setGroupPage(1);
                      }}
                    />
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">Status</span>
                  <select
                    className={inputClass}
                    value={groupStatusFilter}
                    onChange={(event) => {
                      setGroupStatusFilter(event.target.value as BookingGroupStatus | "ALL");
                      setGroupPage(1);
                    }}
                  >
                    <option value="ALL">All Statuses</option>
                    {groupStatuses.map((status) => (
                      <option key={status} value={status}>{formatEnumLabel(status)}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {groupsQuery.isPending ? (
              <div className="space-y-2" aria-label="Loading groups">
                {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : groupStays.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <FiUsers className="mx-auto text-2xl text-slate-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-slate-700">No Group Stays Yet</p>
                <p className="mt-1 text-xs text-slate-500">Use the New Group Stay form to create the first dated room allotment.</p>
              </div>
            ) : filteredGroupStays.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <FiSearch className="mx-auto text-2xl text-slate-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-slate-700">No Matching Group Stays</p>
                <p className="mt-1 text-xs text-slate-500">Try a different name, company, reference, or status.</p>
                <button
                  className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  type="button"
                  onClick={() => {
                    setGroupSearch("");
                    setGroupStatusFilter("ALL");
                    setGroupPage(1);
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div>
                <div className="hidden grid-cols-[minmax(0,1.7fr)_minmax(190px,1fr)_80px_80px_110px_90px] gap-3 border-x border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                  <span>Group Stay</span>
                  <span>Stay Dates</span>
                  <span>Rooms</span>
                  <span>Held</span>
                  <span>Status</span>
                  <span className="text-right">Action</span>
                </div>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 lg:rounded-t-none">
                  {visibleGroupStays.map((group) => {
                    const isSelected = selectedGroupId === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setSelectedRoomIds([]);
                          setSuccess("");
                          setError("");
                        }}
                        className={`group block w-full border-l-4 px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 ${isSelected ? "border-indigo-500 bg-indigo-50/80" : "border-transparent bg-white hover:bg-slate-50"}`}
                      >
                        <span className="block lg:hidden">
                          <span className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-900">{group.name}</span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500">{group.company?.legalName ?? "Independent Group"} · {group.groupRef}</span>
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass[group.status]}`}>
                              {formatEnumLabel(group.status)}
                            </span>
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                            <span className="flex items-center gap-1"><FiCalendar className="text-slate-400" aria-hidden="true" />{displayDate(group.checkIn)} – {displayDate(group.checkOut)}</span>
                            <span className="flex items-center gap-1"><FiHome className="text-slate-400" aria-hidden="true" />{group.expectedRooms}</span>
                            <span className="flex items-center gap-1"><FiClock className="text-slate-400" aria-hidden="true" />{group.heldRoomCount} Held</span>
                            <span className="ml-auto flex items-center gap-1 font-semibold text-indigo-700">
                              {isSelected ? "Selected" : "Manage"}
                              <FiArrowRight aria-hidden="true" />
                            </span>
                          </span>
                        </span>

                        <span className="hidden grid-cols-[minmax(0,1.7fr)_minmax(190px,1fr)_80px_80px_110px_90px] items-center gap-3 lg:grid">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-900">{group.name}</span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">{group.company?.legalName ?? "Independent Group"} · {group.groupRef}</span>
                          </span>
                          <span className="text-xs text-slate-600">{displayDate(group.checkIn)} – {displayDate(group.checkOut)}</span>
                          <span className="flex items-center gap-1.5 text-xs text-slate-600"><FiHome className="text-slate-400" aria-hidden="true" />{group.expectedRooms}</span>
                          <span className="flex items-center gap-1.5 text-xs text-slate-600"><FiClock className="text-slate-400" aria-hidden="true" />{group.heldRoomCount}</span>
                          <span><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass[group.status]}`}>{formatEnumLabel(group.status)}</span></span>
                          <span className="flex items-center justify-end gap-1 text-xs font-semibold text-indigo-700">
                            {isSelected ? "Selected" : "Manage"}
                            <FiArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {filteredGroupStays.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Showing {firstVisibleGroupIndex + 1}–{Math.min(firstVisibleGroupIndex + GROUPS_PER_PAGE, filteredGroupStays.length)} of {filteredGroupStays.length} {filteredGroupStays.length === 1 ? "Group" : "Groups"}
                </p>
                {groupPageCount > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="mr-1 text-xs text-slate-500">Page {visibleGroupPage} of {groupPageCount}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={visibleGroupPage === 1}
                      onClick={() => setGroupPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={visibleGroupPage === groupPageCount}
                      onClick={() => setGroupPage((current) => Math.min(groupPageCount, current + 1))}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
      </section>

      {selectedGroupId && groupQuery.isPending && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading group operations...
        </div>
      )}

      {activeGroup && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Room Allotment</p>
                <h2 className="mt-1 font-semibold text-slate-900">{activeGroup.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{activeGroup.company?.legalName ?? "Independent Group"} · {activeGroup.groupRef}</p>
              </div>
              {canManage && (
                <label className="text-xs font-medium text-slate-600">
                  Group Status
                  <select
                    className="mt-1 block rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    value={activeGroup.status}
                    onChange={(event) => {
                      const status = event.target.value as BookingGroupStatus;
                      if (status !== activeGroup.status) {
                        setError("");
                        setPendingStatus(status);
                      }
                    }}
                  >
                    {[activeGroup.status, ...groupStatusTransitions[activeGroup.status]].map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-4">
              <div><span className="block text-slate-500">Check-In</span><strong className="mt-1 block text-slate-800">{displayDate(activeGroup.checkIn)}</strong></div>
              <div><span className="block text-slate-500">Check-Out</span><strong className="mt-1 block text-slate-800">{displayDate(activeGroup.checkOut)}</strong></div>
              <div><span className="block text-slate-500">Expected Rooms</span><strong className="mt-1 block text-slate-800">{activeGroup.expectedRooms}</strong></div>
              <div><span className="block text-slate-500">Expected Guests</span><strong className="mt-1 block text-slate-800">{activeGroup.expectedGuests}</strong></div>
            </div>
            {canManage && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Hold Available Rooms</h3>
                    <p className="mt-0.5 text-xs text-slate-500">Select exact rooms to remove from public sale.</p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{selectedRoomIds.length} selected</span>
                </div>
                <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-md border border-slate-200 p-2">
                  {roomsQuery.isPending ? (
                    <p className="p-2 text-sm text-slate-500">Loading available rooms...</p>
                  ) : (roomsQuery.data?.items ?? []).length > 0 ? (
                    (roomsQuery.data?.items ?? []).map((room) => (
                      <label key={room.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <input className="size-4 accent-indigo-600" type="checkbox" disabled={lockedRoomIds.has(room.id)} checked={selectedRoomIds.includes(room.id)} onChange={(event) => setSelectedRoomIds((current) => event.target.checked ? [...current, room.id] : current.filter((id) => id !== room.id))} />
                        <span><strong className="font-medium text-slate-800">Room {room.number}</strong> · {room.name} · Unit {room.unitNumber}{lockedRoomIds.has(room.id) ? " (already held)" : ""}</span>
                      </label>
                    ))
                  ) : (
                    <p className="p-2 text-sm text-slate-500">No available rooms found for this property.</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Release rooms at
                    <input className={`${inputClass} mt-1.5`} type="datetime-local" value={holdForm.releaseDate} onChange={(event) => setHoldForm((current) => ({ ...current, releaseDate: event.target.value }))} />
                  </label>
                  <label className={labelClass}>
                    Hold reason
                    <input className={`${inputClass} mt-1.5`} placeholder="Why these rooms are reserved" value={holdForm.reason} onChange={(event) => setHoldForm((current) => ({ ...current, reason: event.target.value }))} />
                  </label>
                </div>
                <Button
                  disabled={action.isPending || selectedRoomIds.length === 0 || !holdForm.releaseDate || holdForm.reason.trim().length < 5}
                  onClick={() => void run(
                    () => holdGroupRoomsApi(activeGroup.id, { roomIds: selectedRoomIds, releaseDate: new Date(holdForm.releaseDate).toISOString(), reason: holdForm.reason }),
                    `${selectedRoomIds.length} room${selectedRoomIds.length === 1 ? "" : "s"} held for this group.`,
                  ).then((result) => { if (result) setSelectedRoomIds([]); })}
                >
                  Hold {selectedRoomIds.length || "Selected"} Room{selectedRoomIds.length === 1 ? "" : "s"}
                </Button>
              </div>
            )}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Active Room Holds ({activeLocks.length})</h3>
              {activeLocks.map((lock) => {
                const room = roomsQuery.data?.items.find((item) => item.id === lock.roomId);
                const roomNumber = room?.number ?? "Held Room";
                const pickup = `${adminPath(ADMIN_ROUTES.WALK_IN_BOOKING)}?propertyId=${encodeURIComponent(activeGroup.propertyId)}&bookingGroupId=${encodeURIComponent(activeGroup.id)}&groupName=${encodeURIComponent(activeGroup.name)}&inventoryLockToken=${encodeURIComponent(lock.lockToken)}&roomId=${encodeURIComponent(lock.roomId ?? "")}&roomNumber=${encodeURIComponent(roomNumber)}&from=${dateOnly(activeGroup.checkIn)}&to=${dateOnly(activeGroup.checkOut)}`;
                return (
                  <div key={lock.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div><span className="font-medium text-slate-800">{room?.number ? `Room ${room.number}` : "Held Room"}</span><span className="mt-0.5 block text-xs text-slate-500">Releases {new Date(lock.expiresAt).toLocaleString("en-IN")}</span></div>
                    <div className="flex gap-2">
                      {canOperate && <Link className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white" to={pickup}>Pick Up Booking</Link>}
                      {canManage && <Button size="sm" variant="danger" outline type="button" onClick={() => run(() => releaseGroupRoomsApi(activeGroup.id, { roomIds: lock.roomId ? [lock.roomId] : undefined, reason: "Released from group operations dashboard" }), "Room released back to inventory.")}>Release</Button>}
                    </div>
                  </div>
                );
              })}
              {activeLocks.length === 0 && <p className="text-sm text-slate-500">No active room holds.</p>}
            </div>
          </section>

          <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Folio & Rooming List</p>
              <h2 className="mt-1 font-semibold text-slate-900">Group Financial Summary</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">Member stays</span><strong className="mt-1 block text-slate-800">{money(activeGroup.memberTotal)}</strong></div>
              <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">Group charges</span><strong className="mt-1 block text-slate-800">{money(activeGroup.groupCharges)}</strong></div>
              <div className="rounded-lg bg-indigo-50 p-3"><span className="block text-xs text-indigo-600">Outstanding balance</span><strong className="mt-1 block text-indigo-900">{money(activeGroup.balance)}</strong></div>
            </div>
            {canPostCharges && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-slate-800">Post Group Folio Charge</h3>
                <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                  <label className={labelClass}>
                    Description
                    <input className={`${inputClass} mt-1.5`} placeholder="e.g. Conference hall rental" value={chargeForm.description} onChange={(event) => setChargeForm((current) => ({ ...current, description: event.target.value }))} />
                  </label>
                  <label className={labelClass}>
                    Amount
                    <div className="relative mt-1.5">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">₹</span>
                      <input className={`${inputClass} pl-7`} min="0.01" step="0.01" type="number" value={chargeForm.amount} onChange={(event) => setChargeForm((current) => ({ ...current, amount: event.target.value }))} />
                    </div>
                  </label>
                </div>
                <label className={labelClass}>
                  Internal note <span className="font-normal text-slate-400">(optional)</span>
                  <input className={`${inputClass} mt-1.5`} placeholder="Context for the finance team" value={chargeForm.note} onChange={(event) => setChargeForm((current) => ({ ...current, note: event.target.value }))} />
                </label>
                <Button disabled={action.isPending || !chargeForm.description.trim() || Number(chargeForm.amount) <= 0} onClick={() => void run(() => addGroupChargeApi(activeGroup.id, { description: chargeForm.description.trim(), amount: Number(chargeForm.amount), note: chargeForm.note.trim() || undefined }), "Group folio charge posted.").then((result) => { if (result) setChargeForm({ description: "", amount: "", note: "" }); })}>Post Charge</Button>
              </div>
            )}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Group-Level Charges ({activeGroup.folioCharges.length})</h3>
              {activeGroup.folioCharges.map((charge) => (
                <div key={charge.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <div><span className={charge.status === "VOID" ? "text-slate-400 line-through" : "text-slate-800"}>{charge.description}</span><span className="ml-2 font-semibold">{money(charge.amount)}</span>{charge.status === "VOID" && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">Void</span>}</div>
                  {canPostCharges && charge.status === "ACTIVE" && <button className="text-xs font-medium text-red-700 hover:text-red-800" type="button" onClick={() => { const reason = window.prompt("Reason for voiding this group charge?"); if (reason?.trim()) void run(() => voidGroupChargeApi(activeGroup.id, charge.id, reason.trim()), "Group folio charge voided."); }}>Void</button>}
                </div>
              ))}
              {activeGroup.folioCharges.length === 0 && <p className="text-sm text-slate-500">No group-level folio charges.</p>}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Rooming List ({activeGroup.bookings.length})</h3>
              {activeGroup.bookings.map((booking) => <Link key={booking.id} className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm text-indigo-700 transition hover:bg-indigo-50" to={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}><span><strong>{booking.bookingRef}</strong><span className="ml-2 text-slate-600">{booking.guestNameSnapshot}</span></span><span className="shrink-0 text-xs text-slate-500">{formatEnumLabel(booking.status)}</span></Link>)}
              {activeGroup.bookings.length === 0 && <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No guest bookings have been picked up from this group yet.</p>}
            </div>
          </section>
        </div>
      )}

      <GroupStatusModal
        group={activeGroup ?? null}
        targetStatus={pendingStatus}
        isSubmitting={action.isPending}
        error={pendingStatus ? error : ""}
        onClose={() => {
          setPendingStatus(null);
          setError("");
        }}
        onSubmit={submitStatusChange}
      />
    </div>
  );
}
