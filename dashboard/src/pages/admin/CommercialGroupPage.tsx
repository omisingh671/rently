import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiSlash,
} from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import {
  addGroupChargeApi,
  getGroupApi,
  holdGroupRoomsApi,
  releaseGroupRoomsApi,
  updateGroupDetailsApi,
  updateGroupStatusApi,
  voidGroupChargeApi,
} from "@/features/commercial/api";
import {
  dateOnly,
  displayDate,
  groupStatusClass,
  groupStatusTransitions,
  money,
  toDateTimeLocalValue,
} from "@/features/commercial/commercial.helpers";
import GroupDetailsModal from "@/features/commercial/components/GroupDetailsModal";
import GroupStatusModal from "@/features/commercial/components/GroupStatusModal";
import type {
  BookingGroup,
  BookingGroupStatus,
  UpdateGroupDetailsPayload,
} from "@/features/commercial/types";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { useAdminRooms } from "@/features/rooms/hooks/useAdminRooms";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";
import { formatEnumLabel } from "@/utils/formatEnumLabel";

const inputClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const labelClass = "block text-sm font-medium text-slate-700";

export default function CommercialGroupPage() {
  const { groupId = "" } = useParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  const { setSelectedPropertyId } = useCurrentProperty();
  const role = useAuthStore((state) => state.user?.role);
  const canManage = role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
  const canOperate = canManage || role === "FRONT_DESK";
  const canPostCharges = canManage || role === "ACCOUNTANT";
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [pendingStatus, setPendingStatus] = useState<BookingGroupStatus | null>(null);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [holdForm, setHoldForm] = useState({
    groupId: "",
    releaseDate: "",
    reason: "Inventory held for group allotment",
  });
  const [chargeForm, setChargeForm] = useState({
    description: "",
    amount: "",
    note: "",
  });

  const groupQuery = useQuery({
    queryKey: ADMIN_KEYS.commercial.group(groupId),
    queryFn: () => getGroupApi(groupId),
    enabled: Boolean(groupId),
  });
  const group = groupQuery.data;
  const roomsQuery = useAdminRooms(group?.propertyId, 1, 100, {
    search: "",
    status: "AVAILABLE",
    isActive: "true",
  });

  useEffect(() => {
    if (group?.propertyId) setSelectedPropertyId(group.propertyId);
  }, [group?.propertyId, setSelectedPropertyId]);

  const action = useMutation({
    mutationFn: async (operation: () => Promise<BookingGroup>) => operation(),
    onError: (caught) => setError(normalizeApiError(caught).message),
  });
  const run = async (
    operation: () => Promise<BookingGroup>,
    successMessage: string,
  ) => {
    setError("");
    setSuccess("");
    try {
      const updated = await action.mutateAsync(operation);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.commercial.group(groupId) }),
        queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.commercial.groups(updated.propertyId) }),
      ]);
      setSuccess(successMessage);
      return updated;
    } catch {
      return null;
    }
  };

  const isClosedGroup = group?.status === "CANCELLED" || group?.status === "COMPLETED";
  const canEditGroupDetails = Boolean(
    group &&
      (group.status === "PROSPECT" || group.status === "TENTATIVE") &&
      group.inventoryLocks.length === 0 &&
      group.bookings.length === 0 &&
      group.folioCharges.length === 0,
  );
  const groupDetailsLockedByActivity = Boolean(
    group &&
      (group.status === "PROSPECT" || group.status === "TENTATIVE") &&
      !canEditGroupDetails,
  );
  const activeLocks = useMemo(
    () =>
      group?.inventoryLocks.filter(
        (lock) => !lock.releasedAt && new Date(lock.expiresAt) > new Date(),
      ) ?? [],
    [group],
  );
  const lockedRoomIds = new Set(
    activeLocks.flatMap((lock) => (lock.roomId ? [lock.roomId] : [])),
  );
  const selectedHoldReleaseDate =
    holdForm.groupId === group?.id && holdForm.releaseDate
      ? holdForm.releaseDate
      : toDateTimeLocalValue(group?.releaseDate);
  const now = new Date();
  const groupReleaseCutoffPassed = Boolean(
    group?.releaseDate && new Date(group.releaseDate) <= now,
  );
  const selectedHoldReleaseDatePassed = Boolean(
    selectedHoldReleaseDate && new Date(selectedHoldReleaseDate) <= now,
  );
  const earliestHoldReleaseDate = toDateTimeLocalValue(now.toISOString());

  const submitStatusChange = async (reason: string) => {
    if (!group || !pendingStatus) return false;
    const changed = await run(
      () => updateGroupStatusApi(group.id, pendingStatus, reason),
      `Group status changed to ${formatEnumLabel(pendingStatus)}.`,
    );
    if (
      changed !== null &&
      (pendingStatus === "CANCELLED" || pendingStatus === "COMPLETED")
    ) {
      setSelectedRoomIds([]);
    }
    return changed !== null;
  };

  const submitGroupDetails = async (payload: UpdateGroupDetailsPayload) => {
    if (!group) return false;
    return (
      (await run(
        () => updateGroupDetailsApi(group.id, payload),
        "Group planning details updated.",
      )) !== null
    );
  };

  const submitRoomHold = async () => {
    if (
      !group ||
      groupReleaseCutoffPassed ||
      selectedHoldReleaseDatePassed ||
      !selectedHoldReleaseDate ||
      selectedRoomIds.length === 0 ||
      holdForm.reason.trim().length < 5
    ) return;
    const held = await run(
      () => holdGroupRoomsApi(group.id, {
        roomIds: selectedRoomIds,
        releaseDate: new Date(selectedHoldReleaseDate).toISOString(),
        reason: holdForm.reason,
      }),
      `${selectedRoomIds.length} room${selectedRoomIds.length === 1 ? "" : "s"} held for this group.`,
    );
    if (held) setSelectedRoomIds([]);
  };

  if (!groupId) {
    return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">A group ID is required.</div>;
  }

  if (groupQuery.isPending) {
    return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading group operations...</div>;
  }

  if (groupQuery.error || !group) {
    return (
      <div className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700" to={adminPath(ADMIN_ROUTES.COMMERCIAL)}><FiArrowLeft aria-hidden="true" />Back to Corporate & Groups</Link>
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{normalizeApiError(groupQuery.error).message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800" to={adminPath(ADMIN_ROUTES.COMMERCIAL)}><FiArrowLeft aria-hidden="true" />Back to Corporate & Groups</Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Group Operations</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{group.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{group.company?.legalName ?? "Independent Group"} · {group.groupRef}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${groupStatusClass[group.status]}`}>{formatEnumLabel(group.status)}</span>
        </div>
      </section>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><FiCheckCircle aria-hidden="true" />{success}</div>}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Room Allotment</p>
              <h2 className="mt-1 font-semibold text-slate-900">Stay and inventory</h2>
            </div>
            {canManage && (
              <div className="flex items-end gap-2">
                {canEditGroupDetails && <Button type="button" size="sm" variant="secondary" icon={<FiEdit2 />} onClick={() => { setError(""); setIsEditingGroup(true); }}>Edit Details</Button>}
                <label className="text-xs font-medium text-slate-600">Group Status<select className="mt-1 block rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={group.status} onChange={(event) => { const status = event.target.value as BookingGroupStatus; if (status !== group.status) { setError(""); setPendingStatus(status); } }}>
                  {[group.status, ...groupStatusTransitions[group.status]].map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}
                </select></label>
              </div>
            )}
          </div>

          {groupDetailsLockedByActivity && <p className="rounded-md bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600">Planning details are locked because room holds, guest bookings, or group charges already exist. Status and operational actions remain available.</p>}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-4">
            <div><span className="block text-slate-500">Check-In</span><strong className="mt-1 block text-slate-800">{displayDate(group.checkIn)}</strong></div>
            <div><span className="block text-slate-500">Check-Out</span><strong className="mt-1 block text-slate-800">{displayDate(group.checkOut)}</strong></div>
            <div><span className="block text-slate-500">Expected Rooms</span><strong className="mt-1 block text-slate-800">{group.expectedRooms}</strong></div>
            <div><span className="block text-slate-500">Expected Guests</span><strong className="mt-1 block text-slate-800">{group.expectedGuests}</strong></div>
          </div>

          {isClosedGroup && (
            <div role="status" className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <FiSlash className="mt-0.5 shrink-0 text-lg" aria-hidden="true" />
              <div><h3 className="font-semibold">Room holds unavailable</h3><p className="mt-1 leading-5 text-amber-800">This group is {formatEnumLabel(group.status).toLowerCase()} and closed for new room holds or guest pickups. Historical rooming-list and financial records remain available for review.</p></div>
            </div>
          )}

          {!isClosedGroup && groupReleaseCutoffPassed && (
            <div role="alert" className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <FiClock className="mt-0.5 shrink-0 text-lg" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold">Group release cutoff has passed</h3>
                  <p className="mt-1 leading-5 text-amber-800">
                    The saved cutoff was {group.releaseDate ? new Date(group.releaseDate).toLocaleString("en-IN") : "not set"}. New room holds are paused. {canEditGroupDetails ? "Update it to a future time no later than check-in." : "Planning details are currently locked; move the group back to an editable planning state when allowed, or create a new group plan."}
                  </p>
                </div>
              </div>
              {canEditGroupDetails && <Button className="shrink-0" type="button" size="sm" variant="secondary" icon={<FiEdit2 />} onClick={() => { setError(""); setIsEditingGroup(true); }}>Update Cutoff</Button>}
            </div>
          )}

          {canManage && !isClosedGroup && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-800">Hold Available Rooms</h3><p className="mt-0.5 text-xs text-slate-500">Select exact rooms to remove from public sale.</p></div><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{selectedRoomIds.length} selected</span></div>
              <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-md border border-slate-200 p-2">
                {roomsQuery.isPending ? <p className="p-2 text-sm text-slate-500">Loading available rooms...</p> : (roomsQuery.data?.items ?? []).length > 0 ? (roomsQuery.data?.items ?? []).map((room) => (
                  <label key={room.id} className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm text-slate-700 ${groupReleaseCutoffPassed || lockedRoomIds.has(room.id) ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50"}`}><input className="size-4 accent-indigo-600" type="checkbox" disabled={groupReleaseCutoffPassed || lockedRoomIds.has(room.id)} checked={selectedRoomIds.includes(room.id)} onChange={(event) => setSelectedRoomIds((current) => event.target.checked ? [...current, room.id] : current.filter((id) => id !== room.id))} /><span><strong className="font-medium text-slate-800">Room {room.number}</strong> · {room.name} · Unit {room.unitNumber}{lockedRoomIds.has(room.id) ? " (already held)" : ""}</span></label>
                )) : <p className="p-2 text-sm text-slate-500">No available rooms found for this property.</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>Release rooms at<input className={`${inputClass} mt-1.5`} type="datetime-local" min={earliestHoldReleaseDate} max={toDateTimeLocalValue(group.releaseDate ?? group.checkIn) || undefined} disabled={groupReleaseCutoffPassed} value={selectedHoldReleaseDate} onChange={(event) => setHoldForm((current) => ({ ...current, groupId: group.id, releaseDate: event.target.value }))} /><span className={`mt-1 block text-xs font-normal leading-5 ${selectedHoldReleaseDatePassed ? "text-red-600" : "text-slate-500"}`}>{groupReleaseCutoffPassed ? "Update the expired group cutoff before holding rooms." : selectedHoldReleaseDatePassed ? "Choose a future release time no later than the group cutoff." : "Defaults to the group cutoff. Choose an earlier time only when these rooms should return sooner."}</span></label>
                <label className={labelClass}>Hold reason<input className={`${inputClass} mt-1.5`} placeholder="Why these rooms are reserved" value={holdForm.reason} onChange={(event) => setHoldForm((current) => ({ ...current, reason: event.target.value }))} /></label>
              </div>
              <Button disabled={action.isPending || groupReleaseCutoffPassed || selectedHoldReleaseDatePassed || selectedRoomIds.length === 0 || !selectedHoldReleaseDate || holdForm.reason.trim().length < 5} onClick={() => void submitRoomHold()}>Hold {selectedRoomIds.length || "Selected"} Room{selectedRoomIds.length === 1 ? "" : "s"}</Button>
            </div>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-800">Active Room Holds ({activeLocks.length})</h3>
            {activeLocks.map((lock) => {
              const room = roomsQuery.data?.items.find((item) => item.id === lock.roomId);
              const roomNumber = room?.number ?? "Held Room";
              const pickup = `${adminPath(ADMIN_ROUTES.WALK_IN_BOOKING)}?propertyId=${encodeURIComponent(group.propertyId)}&bookingGroupId=${encodeURIComponent(group.id)}&groupName=${encodeURIComponent(group.name)}&inventoryLockToken=${encodeURIComponent(lock.lockToken)}&roomId=${encodeURIComponent(lock.roomId ?? "")}&roomNumber=${encodeURIComponent(roomNumber)}&from=${dateOnly(group.checkIn)}&to=${dateOnly(group.checkOut)}`;
              return <div key={lock.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"><div><span className="font-medium text-slate-800">{room?.number ? `Room ${room.number}` : "Held Room"}</span><span className="mt-0.5 block text-xs text-slate-500">Releases {new Date(lock.expiresAt).toLocaleString("en-IN")}</span></div><div className="flex gap-2">{canOperate && !isClosedGroup && <Link className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white" to={pickup}>Pick Up Booking</Link>}{canManage && <Button size="sm" variant="danger" outline type="button" onClick={() => void run(() => releaseGroupRoomsApi(group.id, { roomIds: lock.roomId ? [lock.roomId] : undefined, reason: "Released from group operations dashboard" }), "Room released back to inventory.")}>Release</Button>}</div></div>;
            })}
            {activeLocks.length === 0 && <p className="text-sm text-slate-500">No active room holds.</p>}
          </div>
        </section>

        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Folio & Rooming List</p><h2 className="mt-1 font-semibold text-slate-900">Group Financial Summary</h2></div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">Member stays</span><strong className="mt-1 block text-slate-800">{money(group.memberTotal)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">Group charges</span><strong className="mt-1 block text-slate-800">{money(group.groupCharges)}</strong></div>
            <div className="rounded-lg bg-indigo-50 p-3"><span className="block text-xs text-indigo-600">Outstanding balance</span><strong className="mt-1 block text-indigo-900">{money(group.balance)}</strong></div>
          </div>
          {canPostCharges && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Post Group Folio Charge</h3>
              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <label className={labelClass}>Description<input className={`${inputClass} mt-1.5`} placeholder="e.g. Conference hall rental" value={chargeForm.description} onChange={(event) => setChargeForm((current) => ({ ...current, description: event.target.value }))} /></label>
                <label className={labelClass}>Amount<div className="relative mt-1.5"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">₹</span><input className={`${inputClass} pl-7`} min="0.01" step="0.01" type="number" value={chargeForm.amount} onChange={(event) => setChargeForm((current) => ({ ...current, amount: event.target.value }))} /></div></label>
              </div>
              <label className={labelClass}>Internal note <span className="font-normal text-slate-400">(optional)</span><input className={`${inputClass} mt-1.5`} placeholder="Context for the finance team" value={chargeForm.note} onChange={(event) => setChargeForm((current) => ({ ...current, note: event.target.value }))} /></label>
              <Button disabled={action.isPending || !chargeForm.description.trim() || Number(chargeForm.amount) <= 0} onClick={() => void run(() => addGroupChargeApi(group.id, { description: chargeForm.description.trim(), amount: Number(chargeForm.amount), note: chargeForm.note.trim() || undefined }), "Group folio charge posted.").then((result) => { if (result) setChargeForm({ description: "", amount: "", note: "" }); })}>Post Charge</Button>
            </div>
          )}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-800">Group-Level Charges ({group.folioCharges.length})</h3>
            {group.folioCharges.map((charge) => <div key={charge.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><div><span className={charge.status === "VOID" ? "text-slate-400 line-through" : "text-slate-800"}>{charge.description}</span><span className="ml-2 font-semibold">{money(charge.amount)}</span>{charge.status === "VOID" && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">Void</span>}</div>{canPostCharges && charge.status === "ACTIVE" && <button className="text-xs font-medium text-red-700 hover:text-red-800" type="button" onClick={() => { const reason = window.prompt("Reason for voiding this group charge?"); if (reason?.trim()) void run(() => voidGroupChargeApi(group.id, charge.id, reason.trim()), "Group folio charge voided."); }}>Void</button>}</div>)}
            {group.folioCharges.length === 0 && <p className="text-sm text-slate-500">No group-level folio charges.</p>}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-800">Rooming List ({group.bookings.length})</h3>
            {group.bookings.map((booking) => <Link key={booking.id} className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm text-indigo-700 transition hover:bg-indigo-50" to={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}><span><strong>{booking.bookingRef}</strong><span className="ml-2 text-slate-600">{booking.guestNameSnapshot}</span></span><span className="shrink-0 text-xs text-slate-500">{formatEnumLabel(booking.status)}</span></Link>)}
            {group.bookings.length === 0 && <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No guest bookings have been picked up from this group yet.</p>}
          </div>
        </section>
      </div>

      <GroupStatusModal group={group} targetStatus={pendingStatus} isSubmitting={action.isPending} error={pendingStatus ? error : ""} onClose={() => { setPendingStatus(null); setError(""); }} onSubmit={submitStatusChange} />
      {isEditingGroup && <GroupDetailsModal key={group.id} group={group} isSubmitting={action.isPending} error={error} onClose={() => { setIsEditingGroup(false); setError(""); }} onSubmit={submitGroupDetails} />}
    </div>
  );
}
