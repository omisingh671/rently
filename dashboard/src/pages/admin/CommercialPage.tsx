import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
const money = (value: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
const dateOnly = (value: string) => value.slice(0, 10);
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
  const run = async (operation: () => Promise<BookingGroup | unknown>) => {
    setError("");
    try {
      const result = await action.mutateAsync(operation);
      const group =
        typeof result === "object" && result !== null && "groupRef" in result
          ? (result as BookingGroup)
          : undefined;
      await refreshCommercial(group);
      return result;
    } catch {
      return null;
    }
  };

  const activeGroup = groupQuery.data;
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
    const created = await run(() =>
      createCompanyApi(selectedPropertyId, {
        legalName: companyForm.legalName.trim(),
        gstin: companyForm.gstin.trim() || undefined,
        stateCode: companyForm.stateCode.trim() || undefined,
        billingAddress: companyForm.billingAddress.trim() || undefined,
        contactEmail: companyForm.contactEmail.trim() || undefined,
        creditLimit: Number(companyForm.creditLimit),
        paymentTermsDays: Number(companyForm.paymentTermsDays),
      }),
    );
    if (!created) return;
    setCompanyForm({ legalName: "", gstin: "", stateCode: "", billingAddress: "", contactEmail: "", creditLimit: "0", paymentTermsDays: "0" });
  };

  const submitGroup = async (event: FormEvent) => {
    event.preventDefault();
    const created = await run(() =>
      createGroupApi(selectedPropertyId, {
        companyId: groupForm.companyId || undefined,
        name: groupForm.name.trim(),
        checkIn: groupForm.checkIn,
        checkOut: groupForm.checkOut,
        expectedRooms: Number(groupForm.expectedRooms),
        expectedGuests: Number(groupForm.expectedGuests),
        releaseDate: groupForm.releaseDate || undefined,
      }),
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Corporate & Group Stays</h1>
        <p className="mt-1 text-sm text-slate-500">Manage company billing identities, room blocks, pickup bookings, rooming lists, and group folios.</p>
      </div>

      <PropertySearchSelect
        className="max-w-md"
        selectedPropertyId={selectedPropertyId}
        selectedPropertyName={selectedProperty?.name}
        onChange={(propertyId) => {
          setSelectedGroupId("");
          setSelectedRoomIds([]);
          setSelectedPropertyId(propertyId || null);
        }}
      />

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {canManage && (
        <div className="grid gap-6 xl:grid-cols-2">
          <form onSubmit={submitCompany} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Create company account</h2>
            <input className={inputClass} required placeholder="Legal name" value={companyForm.legalName} onChange={(event) => setCompanyForm((current) => ({ ...current, legalName: event.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={inputClass} placeholder="GSTIN (optional)" value={companyForm.gstin} onChange={(event) => setCompanyForm((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} />
              <input className={inputClass} placeholder="State code (e.g. 29)" maxLength={2} value={companyForm.stateCode} onChange={(event) => setCompanyForm((current) => ({ ...current, stateCode: event.target.value }))} />
              <input className={inputClass} type="email" placeholder="Billing contact email" value={companyForm.contactEmail} onChange={(event) => setCompanyForm((current) => ({ ...current, contactEmail: event.target.value }))} />
              <input className={inputClass} min={0} type="number" placeholder="Credit limit" value={companyForm.creditLimit} onChange={(event) => setCompanyForm((current) => ({ ...current, creditLimit: event.target.value }))} />
              <input className={inputClass} min={0} max={365} type="number" placeholder="Payment terms (days)" value={companyForm.paymentTermsDays} onChange={(event) => setCompanyForm((current) => ({ ...current, paymentTermsDays: event.target.value }))} />
            </div>
            <textarea className="min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500" placeholder="Billing address" value={companyForm.billingAddress} onChange={(event) => setCompanyForm((current) => ({ ...current, billingAddress: event.target.value }))} />
            <Button type="submit" disabled={action.isPending}>Create company</Button>
          </form>

          <form onSubmit={submitGroup} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Create group / corporate stay</h2>
            <input className={inputClass} required placeholder="Group name" value={groupForm.name} onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))} />
            <select className={inputClass} value={groupForm.companyId} onChange={(event) => setGroupForm((current) => ({ ...current, companyId: event.target.value }))}>
              <option value="">Independent group</option>
              {(companiesQuery.data ?? []).filter((company) => company.isActive).map((company) => <option key={company.id} value={company.id}>{company.legalName}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-600">Check-in<input className={`${inputClass} mt-1`} required type="date" value={groupForm.checkIn} onChange={(event) => setGroupForm((current) => ({ ...current, checkIn: event.target.value }))} /></label>
              <label className="text-xs text-slate-600">Check-out<input className={`${inputClass} mt-1`} required type="date" value={groupForm.checkOut} onChange={(event) => setGroupForm((current) => ({ ...current, checkOut: event.target.value }))} /></label>
              <label className="text-xs text-slate-600">Expected rooms<input className={`${inputClass} mt-1`} required min={1} type="number" value={groupForm.expectedRooms} onChange={(event) => setGroupForm((current) => ({ ...current, expectedRooms: event.target.value }))} /></label>
              <label className="text-xs text-slate-600">Expected guests<input className={`${inputClass} mt-1`} required min={1} type="number" value={groupForm.expectedGuests} onChange={(event) => setGroupForm((current) => ({ ...current, expectedGuests: event.target.value }))} /></label>
            </div>
            <label className="text-xs text-slate-600">Optional release date<input className={`${inputClass} mt-1`} type="date" value={groupForm.releaseDate} onChange={(event) => setGroupForm((current) => ({ ...current, releaseDate: event.target.value }))} /></label>
            <Button type="submit" disabled={action.isPending}>Create group</Button>
          </form>
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Groups at {properties.find((property) => property.id === selectedPropertyId)?.name}</h2>
        {groupsQuery.isPending ? <p className="mt-3 text-sm text-slate-500">Loading groups...</p> : (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {(groupsQuery.data ?? []).map((group) => (
              <button key={group.id} type="button" onClick={() => setSelectedGroupId(group.id)} className={`rounded-md border p-3 text-left ${selectedGroupId === group.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <span className="block font-medium text-slate-900">{group.name}</span>
                <span className="block text-xs text-slate-500">{group.groupRef} · {formatEnumLabel(group.status)}</span>
                <span className="mt-1 block text-xs text-slate-600">{dateOnly(group.checkIn)} → {dateOnly(group.checkOut)} · {group.heldRoomCount} held</span>
              </button>
            ))}
            {!groupsQuery.isPending && (groupsQuery.data ?? []).length === 0 && <p className="text-sm text-slate-500">No groups configured.</p>}
          </div>
        )}
      </section>

      {activeGroup && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">{activeGroup.name} room block</h2>
                <p className="text-xs text-slate-500">{activeGroup.company?.legalName ?? "Independent group"} · {activeGroup.groupRef}</p>
              </div>
              {canManage && (
                <select
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={activeGroup.status}
                  onChange={(event) => {
                    const status = event.target.value as BookingGroupStatus;
                    const reason = window.prompt(`Reason for changing group status to ${formatEnumLabel(status)}?`);
                    if (reason?.trim()) void run(() => updateGroupStatusApi(activeGroup.id, status, reason.trim()));
                  }}
                >
                  {[activeGroup.status, ...groupStatusTransitions[activeGroup.status]].map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}
                </select>
              )}
            </div>
            {canManage && (
              <>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">
                  {(roomsQuery.data?.items ?? []).map((room) => (
                    <label key={room.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" disabled={lockedRoomIds.has(room.id)} checked={selectedRoomIds.includes(room.id)} onChange={(event) => setSelectedRoomIds((current) => event.target.checked ? [...current, room.id] : current.filter((id) => id !== room.id))} />
                      {room.number} · {room.name} · Unit {room.unitNumber}{lockedRoomIds.has(room.id) ? " (already held)" : ""}
                    </label>
                  ))}
                </div>
                <input className={inputClass} type="datetime-local" value={holdForm.releaseDate} onChange={(event) => setHoldForm((current) => ({ ...current, releaseDate: event.target.value }))} />
                <input className={inputClass} placeholder="Hold reason" value={holdForm.reason} onChange={(event) => setHoldForm((current) => ({ ...current, reason: event.target.value }))} />
                <Button disabled={action.isPending || selectedRoomIds.length === 0 || !holdForm.releaseDate} onClick={() => void run(() => holdGroupRoomsApi(activeGroup.id, { roomIds: selectedRoomIds, releaseDate: new Date(holdForm.releaseDate).toISOString(), reason: holdForm.reason })).then((result) => { if (result) setSelectedRoomIds([]); })}>Hold selected rooms</Button>
              </>
            )}
            <div className="space-y-2">
              {activeLocks.map((lock) => {
                const room = roomsQuery.data?.items.find((item) => item.id === lock.roomId);
                const pickup = `${adminPath(ADMIN_ROUTES.WALK_IN_BOOKING)}?propertyId=${encodeURIComponent(activeGroup.propertyId)}&bookingGroupId=${encodeURIComponent(activeGroup.id)}&inventoryLockToken=${encodeURIComponent(lock.lockToken)}&roomId=${encodeURIComponent(lock.roomId ?? "")}&from=${dateOnly(activeGroup.checkIn)}&to=${dateOnly(activeGroup.checkOut)}`;
                return (
                  <div key={lock.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 p-3 text-sm">
                    <div><span className="font-medium text-slate-800">Room {room?.number ?? lock.roomId}</span><span className="block text-xs text-slate-500">Release {new Date(lock.expiresAt).toLocaleString("en-IN")}</span></div>
                    <div className="flex gap-2">
                      {canOperate && <Link className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white" to={pickup}>Pick up booking</Link>}
                      {canManage && <button className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700" type="button" onClick={() => run(() => releaseGroupRoomsApi(activeGroup.id, { roomIds: lock.roomId ? [lock.roomId] : undefined, reason: "Released from group operations dashboard" }))}>Release</button>}
                    </div>
                  </div>
                );
              })}
              {activeLocks.length === 0 && <p className="text-sm text-slate-500">No active room holds.</p>}
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div><span className="block text-xs text-slate-500">Member stays</span>{money(activeGroup.memberTotal)}</div>
              <div><span className="block text-xs text-slate-500">Group charges</span>{money(activeGroup.groupCharges)}</div>
              <div><span className="block text-xs text-slate-500">Balance</span><strong>{money(activeGroup.balance)}</strong></div>
            </div>
            {canPostCharges && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-slate-800">Post group folio charge</h3>
                <input className={inputClass} placeholder="Description" value={chargeForm.description} onChange={(event) => setChargeForm((current) => ({ ...current, description: event.target.value }))} />
                <input className={inputClass} min="0.01" step="0.01" type="number" placeholder="Amount" value={chargeForm.amount} onChange={(event) => setChargeForm((current) => ({ ...current, amount: event.target.value }))} />
                <input className={inputClass} placeholder="Note (optional)" value={chargeForm.note} onChange={(event) => setChargeForm((current) => ({ ...current, note: event.target.value }))} />
                <Button disabled={action.isPending || !chargeForm.description.trim() || Number(chargeForm.amount) <= 0} onClick={() => void run(() => addGroupChargeApi(activeGroup.id, { description: chargeForm.description.trim(), amount: Number(chargeForm.amount), note: chargeForm.note.trim() || undefined })).then((result) => { if (result) setChargeForm({ description: "", amount: "", note: "" }); })}>Post charge</Button>
              </div>
            )}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              {activeGroup.folioCharges.map((charge) => (
                <div key={charge.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm">
                  <div><span className={charge.status === "VOID" ? "text-slate-400 line-through" : "text-slate-800"}>{charge.description}</span><span className="ml-2 font-medium">{money(charge.amount)}</span></div>
                  {canPostCharges && charge.status === "ACTIVE" && <button className="text-xs font-medium text-red-700" type="button" onClick={() => { const reason = window.prompt("Reason for voiding this group charge?"); if (reason?.trim()) void run(() => voidGroupChargeApi(activeGroup.id, charge.id, reason.trim())); }}>Void</button>}
                </div>
              ))}
              {activeGroup.folioCharges.length === 0 && <p className="text-sm text-slate-500">No group-level folio charges.</p>}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Rooming list ({activeGroup.bookings.length})</h3>
              {activeGroup.bookings.map((booking) => <Link key={booking.id} className="mt-2 block rounded-md bg-slate-50 p-3 text-sm text-indigo-700" to={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}>{booking.bookingRef} · {booking.guestNameSnapshot} · {formatEnumLabel(booking.status)}</Link>)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
