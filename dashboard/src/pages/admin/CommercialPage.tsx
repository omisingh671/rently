import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiHome,
  FiInfo,
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
import type { BookingGroup, BookingGroupStatus } from "@/features/commercial/types";
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

export default function CommercialPage() {
  const queryClient = useQueryClient();
  const { properties, selectedPropertyId, selectedProperty, setSelectedPropertyId } =
    useCurrentProperty();
  const role = useAuthStore((state) => state.user?.role);
  const canManage = role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
  const canOperate = canManage || role === "FRONT_DESK";
  const canPostCharges = canManage || role === "ACCOUNTANT";
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [companyForm, setCompanyForm] = useState({
    legalName: "",
    gstin: "",
    stateCode: "",
    billingAddress: "",
    contactEmail: "",
    creditLimit: "0",
    paymentTermsDays: "0",
  });
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

  const activeGroup = groupQuery.data;
  const queryError = companiesQuery.error ?? groupsQuery.error ?? groupQuery.error;
  const activeLocks = useMemo(
    () =>
      activeGroup?.inventoryLocks.filter(
        (lock) => !lock.releasedAt && new Date(lock.expiresAt) > new Date(),
      ) ?? [],
    [activeGroup],
  );
  const lockedRoomIds = new Set(activeLocks.flatMap((lock) => (lock.roomId ? [lock.roomId] : [])));

  const submitCompany = async (event: FormEvent) => {
    event.preventDefault();
    const created = await run(
      () =>
        createCompanyApi(selectedPropertyId, {
          legalName: companyForm.legalName.trim(),
          gstin: companyForm.gstin.trim() || undefined,
          stateCode: companyForm.stateCode.trim() || undefined,
          billingAddress: companyForm.billingAddress.trim() || undefined,
          contactEmail: companyForm.contactEmail.trim() || undefined,
          creditLimit: Number(companyForm.creditLimit),
          paymentTermsDays: Number(companyForm.paymentTermsDays),
        }),
      "Company account created and ready to link to a stay.",
    );
    if (!created) return;
    setCompanyForm({ legalName: "", gstin: "", stateCode: "", billingAddress: "", contactEmail: "", creditLimit: "0", paymentTermsDays: "0" });
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
            <FiBriefcase aria-hidden="true" />
            Commercial Operations
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Corporate & Group Stays</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Set up the billing identity once, then create each dated stay, reserve its rooms,
            and pick up individual guest bookings.
          </p>
        </div>
        <PropertySearchSelect
          className="w-full lg:max-w-sm"
          selectedPropertyId={selectedPropertyId}
          selectedPropertyName={selectedProperty?.name}
          onChange={(propertyId) => {
            setSelectedGroupId("");
            setSelectedRoomIds([]);
            setSuccess("");
            setError("");
            setSelectedPropertyId(propertyId || null);
          }}
        />
      </div>

      <section className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 md:grid-cols-2">
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
            <FiBriefcase aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">1. Company Account</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              A reusable legal and billing profile. Create it only when a company will pay or
              needs corporate tax details on bookings.
            </p>
          </div>
        </div>
        <div className="flex gap-3 md:border-l md:border-indigo-100 md:pl-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
            <FiCalendar aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">2. Group / Corporate Stay</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              One dated room allotment. Link a company for corporate billing, or keep it
              independent for weddings, tours, and other groups.
            </p>
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
        <div className="grid gap-6 xl:grid-cols-2">
          <form onSubmit={submitCompany} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <FiBriefcase aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">Create Company Account</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Reusable billing details for future corporate stays.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <label className={labelClass}>
                Legal name <span className="text-red-500">*</span>
                <input className={`${inputClass} mt-1.5`} required placeholder="e.g. Acme Technologies Private Limited" value={companyForm.legalName} onChange={(event) => setCompanyForm((current) => ({ ...current, legalName: event.target.value }))} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  GSTIN <span className="font-normal text-slate-400">(optional)</span>
                  <input className={`${inputClass} mt-1.5 uppercase`} placeholder="29ABCDE1234F1Z5" value={companyForm.gstin} onChange={(event) => setCompanyForm((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} />
                </label>
                <label className={labelClass}>
                  State code
                  <input className={`${inputClass} mt-1.5`} inputMode="numeric" placeholder="e.g. 29" maxLength={2} value={companyForm.stateCode} onChange={(event) => setCompanyForm((current) => ({ ...current, stateCode: event.target.value }))} />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  Billing contact email <span className="font-normal text-slate-400">(optional)</span>
                  <input className={`${inputClass} mt-1.5`} type="email" placeholder="accounts@company.com" value={companyForm.contactEmail} onChange={(event) => setCompanyForm((current) => ({ ...current, contactEmail: event.target.value }))} />
                </label>
              </div>
              <label className={labelClass}>
                Billing address <span className="font-normal text-slate-400">(optional)</span>
                <textarea className="mt-1.5 min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Registered billing address" value={companyForm.billingAddress} onChange={(event) => setCompanyForm((current) => ({ ...current, billingAddress: event.target.value }))} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Credit Limit
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">₹</span>
                    <input className={`${inputClass} pl-7`} min={0} step="0.01" type="number" value={companyForm.creditLimit} onChange={(event) => setCompanyForm((current) => ({ ...current, creditLimit: event.target.value }))} />
                  </div>
                  <span className={hintClass}>Maximum unpaid balance approved for this company.</span>
                </label>
                <label className={labelClass}>
                  Payment Terms
                  <div className="relative mt-1.5">
                    <input className={`${inputClass} pr-14`} min={0} max={365} type="number" value={companyForm.paymentTermsDays} onChange={(event) => setCompanyForm((current) => ({ ...current, paymentTermsDays: event.target.value }))} />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">days</span>
                  </div>
                  <span className={hintClass}>Days allowed to pay after invoicing; 30 means Net 30.</span>
                </label>
              </div>
              <p className="flex gap-2 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                <FiInfo className="mt-0.5 shrink-0" aria-hidden="true" />
                Credit limit and payment terms are stored as reference details; automated credit enforcement is not active yet.
              </p>
              <Button type="submit" icon={<FiBriefcase />} disabled={action.isPending}>
                {action.isPending ? "Creating..." : "Create Company Account"}
              </Button>
            </div>
          </form>

          <form onSubmit={submitGroup} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <FiUsers aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">Create Group / Corporate Stay</h2>
                  <p className="mt-0.5 text-xs text-slate-500">A dated room allotment with its own rooming list and folio.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <label className={labelClass}>
                Stay or group name <span className="text-red-500">*</span>
                <input className={`${inputClass} mt-1.5`} required placeholder="e.g. Acme onboarding team — September" value={groupForm.name} onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className={labelClass}>
                Bill to
                <select className={`${inputClass} mt-1.5`} value={groupForm.companyId} onChange={(event) => setGroupForm((current) => ({ ...current, companyId: event.target.value }))}>
                  <option value="">Independent group — no company billing</option>
                  {(companiesQuery.data ?? []).filter((company) => company.isActive).map((company) => <option key={company.id} value={company.id}>{company.legalName}</option>)}
                </select>
                <span className={hintClass}>Select a company only when its legal details should be attached to member bookings.</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Check-in <span className="text-red-500">*</span>
                  <input className={`${inputClass} mt-1.5`} required type="date" value={groupForm.checkIn} onChange={(event) => setGroupForm((current) => ({ ...current, checkIn: event.target.value }))} />
                </label>
                <label className={labelClass}>
                  Check-out <span className="text-red-500">*</span>
                  <input className={`${inputClass} mt-1.5`} required min={groupForm.checkIn || undefined} type="date" value={groupForm.checkOut} onChange={(event) => setGroupForm((current) => ({ ...current, checkOut: event.target.value }))} />
                </label>
                <label className={labelClass}>
                  Expected rooms <span className="text-red-500">*</span>
                  <input className={`${inputClass} mt-1.5`} required min={1} max={500} type="number" value={groupForm.expectedRooms} onChange={(event) => setGroupForm((current) => ({ ...current, expectedRooms: event.target.value }))} />
                </label>
                <label className={labelClass}>
                  Expected guests <span className="text-red-500">*</span>
                  <input className={`${inputClass} mt-1.5`} required min={1} max={5000} type="number" value={groupForm.expectedGuests} onChange={(event) => setGroupForm((current) => ({ ...current, expectedGuests: event.target.value }))} />
                </label>
              </div>
              <label className={labelClass}>
                Release date <span className="font-normal text-slate-400">(optional)</span>
                <input className={`${inputClass} mt-1.5`} max={groupForm.checkIn || undefined} type="date" value={groupForm.releaseDate} onChange={(event) => setGroupForm((current) => ({ ...current, releaseDate: event.target.value }))} />
                <span className={hintClass}>Unsold held rooms should return to public inventory by this date.</span>
              </label>
              <Button type="submit" icon={<FiCalendar />} disabled={action.isPending || companiesQuery.isPending}>
                {action.isPending ? "Creating..." : "Create Group Stay"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Group Stays at {properties.find((property) => property.id === selectedPropertyId)?.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Select a group to manage its status, held rooms, bookings, and folio.</p>
          </div>
          {!groupsQuery.isPending && (
            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                {(groupsQuery.data ?? []).length} {(groupsQuery.data ?? []).length === 1 ? "group" : "groups"}
              </span>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
                {(companiesQuery.data ?? []).filter((company) => company.isActive).length}{" "}
                {(companiesQuery.data ?? []).filter((company) => company.isActive).length === 1 ? "company" : "companies"}
              </span>
            </div>
          )}
        </div>
        {groupsQuery.isPending ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading groups">
            {[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : (groupsQuery.data ?? []).length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(groupsQuery.data ?? []).map((group) => {
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
                  className={`rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${isSelected ? "border-indigo-500 bg-indigo-50 shadow-sm" : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-slate-900">{group.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass[group.status]}`}>
                      {formatEnumLabel(group.status)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{group.company?.legalName ?? "Independent group"} · {group.groupRef}</span>
                  <span className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <FiCalendar className="shrink-0 text-slate-400" aria-hidden="true" />
                    {dateOnly(group.checkIn)} → {dateOnly(group.checkOut)}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5"><FiHome className="text-slate-400" aria-hidden="true" />{group.expectedRooms} expected</span>
                    <span className="flex items-center gap-1.5"><FiClock className="text-slate-400" aria-hidden="true" />{group.heldRoomCount} held</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <FiUsers className="mx-auto text-2xl text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-slate-700">No group stays yet</p>
            <p className="mt-1 text-xs text-slate-500">Use the form above to create this property's first dated group allotment.</p>
          </div>
        )}
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
                <p className="mt-1 text-xs text-slate-500">{activeGroup.company?.legalName ?? "Independent group"} · {activeGroup.groupRef}</p>
              </div>
              {canManage && (
                <label className="text-xs font-medium text-slate-600">
                  Group status
                  <select
                    className="mt-1 block rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    value={activeGroup.status}
                    onChange={(event) => {
                      const status = event.target.value as BookingGroupStatus;
                      const reason = window.prompt(`Reason for changing group status to ${formatEnumLabel(status)}?`);
                      if (reason?.trim()) void run(
                        () => updateGroupStatusApi(activeGroup.id, status, reason.trim()),
                        `Group status changed to ${formatEnumLabel(status)}.`,
                      );
                    }}
                  >
                    {[activeGroup.status, ...groupStatusTransitions[activeGroup.status]].map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-4">
              <div><span className="block text-slate-500">Check-in</span><strong className="mt-1 block text-slate-800">{dateOnly(activeGroup.checkIn)}</strong></div>
              <div><span className="block text-slate-500">Check-out</span><strong className="mt-1 block text-slate-800">{dateOnly(activeGroup.checkOut)}</strong></div>
              <div><span className="block text-slate-500">Expected rooms</span><strong className="mt-1 block text-slate-800">{activeGroup.expectedRooms}</strong></div>
              <div><span className="block text-slate-500">Expected guests</span><strong className="mt-1 block text-slate-800">{activeGroup.expectedGuests}</strong></div>
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
                const pickup = `${adminPath(ADMIN_ROUTES.WALK_IN_BOOKING)}?propertyId=${encodeURIComponent(activeGroup.propertyId)}&bookingGroupId=${encodeURIComponent(activeGroup.id)}&inventoryLockToken=${encodeURIComponent(lock.lockToken)}&roomId=${encodeURIComponent(lock.roomId ?? "")}&from=${dateOnly(activeGroup.checkIn)}&to=${dateOnly(activeGroup.checkOut)}`;
                return (
                  <div key={lock.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div><span className="font-medium text-slate-800">Room {room?.number ?? lock.roomId}</span><span className="mt-0.5 block text-xs text-slate-500">Releases {new Date(lock.expiresAt).toLocaleString("en-IN")}</span></div>
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
    </div>
  );
}
