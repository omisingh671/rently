import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/common/StatusBadge";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { ADMIN_KEYS } from "@/features/admin/config/adminKeys";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";
import { getRoomBoardApi } from "../api";
import { useAdminBooking } from "../hooks/useAdminOperations";
import type { AdminBooking, BookingStatus } from "../types";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiEdit3,
  FiHome,
  FiLogIn,
  FiLogOut,
  FiSlash,
  FiUser,
} from "react-icons/fi";

type RiskAction =
  | "assignRoom"
  | "checkIn"
  | "checkOut"
  | "cancel"
  | "noShow"
  | "statusOverride";

type PendingAction = {
  type: RiskAction;
  title: string;
  message: string;
  confirmLabel: string;
  status?: BookingStatus;
  requiresNote?: boolean;
};

type AssignmentRoom = {
  id: string;
  unitNumber: string;
  number: string;
  name: string;
  status: string;
  isActive: boolean;
};

const bookingStatuses: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatMoney = (value: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));

const getStayLabel = (booking: AdminBooking) => {
  const itemCount = Math.max(booking.items.length, 1);

  if (booking.bookingType === "MULTI_ROOM" || itemCount > 1) {
    return `${itemCount}-room stay`;
  }

  if (booking.productName === "Booking option") {
    return booking.targetType === "UNIT" ? "Private unit stay" : "Room stay";
  }

  return booking.productName;
};

const getAssignedLabel = (booking: AdminBooking) =>
  booking.items.length > 0
    ? booking.items.map((item) => item.targetLabel).join(" + ")
    : booking.targetLabel;

const hasAssignedTarget = (booking: AdminBooking) =>
  booking.items.length > 0 &&
  booking.items.every((item) => item.roomId !== null || item.unitId !== null) &&
  (booking.roomId !== null || booking.unitId !== null);

const getActionDefaults = (action: RiskAction): PendingAction => {
  if (action === "checkIn") {
    return {
      type: action,
      title: "Confirm Check In",
      message:
        "This will mark the guest as checked in and write an audit entry.",
      confirmLabel: "Confirm Check In",
      status: "CHECKED_IN",
    };
  }

  if (action === "checkOut") {
    return {
      type: action,
      title: "Confirm Check Out",
      message: "This will close the active stay and write an audit entry.",
      confirmLabel: "Confirm Check Out",
      status: "CHECKED_OUT",
    };
  }

  if (action === "cancel") {
    return {
      type: action,
      title: "Cancel Booking",
      message: "This will cancel the booking and write an audit entry.",
      confirmLabel: "Cancel Booking",
      status: "CANCELLED",
      requiresNote: true,
    };
  }

  if (action === "noShow") {
    return {
      type: action,
      title: "Mark No-Show",
      message:
        "This will mark the guest as no-show and close normal check-in actions.",
      confirmLabel: "Mark No-Show",
      status: "NO_SHOW",
      requiresNote: true,
    };
  }

  if (action === "statusOverride") {
    return {
      type: action,
      title: "Correct Booking Status",
      message:
        "Use this only to fix an operational mistake. The correction will be audited.",
      confirmLabel: "Apply Correction",
      requiresNote: true,
    };
  }

  return {
    type: action,
    title: "Change Assigned Room",
    message:
      "This will change the room used for this stay. The backend will reject unavailable rooms.",
    confirmLabel: "Confirm Room Change",
  };
};

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canOverrideCheckedInRoom = useAuthStore((state) =>
    state.hasAnyRole(["SUPER_ADMIN", "ADMIN"]),
  );
  const canUseAdminCorrection = useAuthStore((state) =>
    state.hasAnyRole(["SUPER_ADMIN", "ADMIN"]),
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<BookingStatus>("PENDING");
  const [actionError, setActionError] = useState("");

  const {
    data: booking,
    isPending,
    isFetching,
    isError,
    error,
    updateBooking,
    isMutating,
  } = useAdminBooking(id);

  const roomsQuery = useQuery({
    queryKey: booking
      ? ADMIN_KEYS.operations.roomBoard({
          propertyId: booking.propertyId,
          from: booking.checkIn,
          to: booking.checkOut,
        })
      : ADMIN_KEYS.operations.all(),
    queryFn: async () => {
      if (!booking) throw new Error("Booking required");
      return getRoomBoardApi(booking.propertyId, {
        from: booking.checkIn,
        to: booking.checkOut,
      });
    },
    enabled: !!booking,
  });

  const rooms = useMemo(
    () =>
      roomsQuery.data?.units.flatMap((unit) =>
        unit.rooms.map((room) => ({
          id: room.roomId,
          unitNumber: room.unitNumber,
          number: room.roomNumber,
          name: room.roomName,
          status: room.boardStatus,
          isActive: room.isActive,
        })),
      ) ?? [],
    [roomsQuery.data?.units],
  );

  const openAction = (type: RiskAction) => {
    setActionError("");
    const nextAction = getActionDefaults(type);
    if (type === "assignRoom" && booking?.status === "CHECKED_IN") {
      nextAction.requiresNote = true;
      nextAction.message =
        "Changing room after check-in is exceptional. Confirm the change and add an audit note.";
    }
    setPendingAction(nextAction);
    setNote("");
    if (type === "assignRoom" && booking) {
      const preselect =
        booking.roomId ??
        rooms.find((r) => r.status === "AVAILABLE" && r.isActive)?.id ??
        rooms[0]?.id ??
        "";
      setSelectedRoomId(preselect);
    }
    if (type === "statusOverride" && booking) {
      setSelectedStatus(booking.status);
    }
  };

  const closeAction = () => {
    setPendingAction(null);
    setNote("");
    setActionError("");
  };

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!booking || !pendingAction) return;

    try {
      setActionError("");

      if (pendingAction.type === "assignRoom") {
        if (!selectedRoomId) {
          setActionError("Select a room before confirming.");
          return;
        }

        if (pendingAction.requiresNote && !note.trim()) {
          setActionError("Note is required for this action.");
          return;
        }

        await updateBooking({
          roomId: selectedRoomId,
          ...(note.trim() && { note: note.trim() }),
        });
      } else if (pendingAction.type === "statusOverride") {
        if (!note.trim()) {
          setActionError("Audit note is required for status correction.");
          return;
        }

        await updateBooking({
          status: selectedStatus,
          statusOverride: true,
          note: note.trim(),
        });
      } else if (pendingAction.status) {
        if (pendingAction.requiresNote && !note.trim()) {
          setActionError("Note is required for this action.");
          return;
        }

        await updateBooking({
          status: pendingAction.status,
          ...(note.trim() && { note: note.trim() }),
        });
      }

      closeAction();
    } catch (err) {
      setActionError(normalizeApiError(err).message);
    }
  };

  const canCheckIn =
    booking?.status === "CONFIRMED" &&
    booking !== undefined &&
    hasAssignedTarget(booking);
  const canCheckOut = booking?.status === "CHECKED_IN";
  const canAdminCancelAfterCheckIn =
    booking?.status === "CHECKED_IN" && canUseAdminCorrection;
  const canCancel =
    booking?.status === "PENDING" ||
    booking?.status === "CONFIRMED" ||
    canAdminCancelAfterCheckIn;
  const canMarkNoShow = booking?.status === "CONFIRMED";
  const canAssignRoom =
    booking !== undefined &&
    booking.bookingType !== "MULTI_ROOM" &&
    booking.status !== "CHECKED_OUT" &&
    booking.status !== "CANCELLED" &&
    booking.status !== "NO_SHOW";

  if (isPending) {
    return <PageState message="Loading booking details..." />;
  }

  if (isError || !booking) {
    return (
      <PageState
        message={normalizeApiError(error).message || "Could not load booking."}
        isError
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<FiArrowLeft />}
            onClick={() => navigate(adminPath(ADMIN_ROUTES.BOOKINGS))}
          >
            Bookings
          </Button>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {booking.bookingRef}
            </h2>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {booking.propertyName} / {getStayLabel(booking)}
            {isFetching ? " / refreshing..." : ""}
          </p>
        </div>
      </div>

      {(actionError || roomsQuery.isError) && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError || "Could not load rooms for assignment."}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Booking Summary
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoItem
                icon={<FiUser />}
                label="Guest"
                value={booking.guestNameSnapshot}
              />
              <InfoItem label="Email" value={booking.guestEmailSnapshot} />
              <InfoItem
                label="Contact"
                value={booking.guestContactSnapshot ?? "Not provided"}
              />
              <InfoItem label="Guest count" value={`${booking.guestCount}`} />
              <InfoItem
                icon={<FiCalendar />}
                label="Check in"
                value={formatDate(booking.checkIn)}
              />
              <InfoItem
                label="Check out"
                value={formatDate(booking.checkOut)}
              />
              <InfoItem
                icon={<FiHome />}
                label="Stay/Product"
                value={getStayLabel(booking)}
              />
              <InfoItem
                label="Assigned room/unit"
                value={getAssignedLabel(booking)}
              />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Amount & Payment
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <InfoItem
                label="Total amount"
                value={formatMoney(booking.totalAmount)}
              />
              <InfoItem
                label="Upfront/token"
                value={formatMoney(booking.upfrontAmount)}
              />
              <InfoItem
                label="Payment policy"
                value={booking.paymentPolicy.replaceAll("_", " ")}
              />
            </div>
          </section>

          <InternalNotesSection
            key={booking.id}
            initialValue={booking.internalNotes ?? ""}
            isMutating={isMutating}
            onSave={(value) =>
              updateBooking({
                internalNotes: value.trim().length > 0 ? value.trim() : null,
              })
            }
          />

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Status History
            </h3>
            <div className="mt-4 space-y-3">
              {booking.statusHistory.length === 0 ? (
                <p className="text-sm text-slate-500">No audit history yet.</p>
              ) : (
                booking.statusHistory.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={event.toStatus} />
                      <span className="text-slate-500">
                        {event.fromStatus
                          ? `from ${event.fromStatus.replaceAll("_", " ")}`
                          : "initial status"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateTime(event.createdAt)} by{" "}
                      {event.actorName ?? "System"}
                    </div>
                    {event.note && (
                      <p className="mt-2 text-slate-700">{event.note}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Operational Actions
            </h3>
            <div className="mt-4 grid gap-3">
              {canAssignRoom && (
                <Button
                  type="button"
                  size="md"
                  variant="secondary"
                  icon={<FiHome />}
                  disabled={isMutating}
                  onClick={() => openAction("assignRoom")}
                  fullWidth
                >
                  {booking.roomId ? "Change Room" : "Assign Room"}
                </Button>
              )}
              {canCheckIn && (
                <Button
                  type="button"
                  size="md"
                  variant="success"
                  outline
                  icon={<FiLogIn />}
                  disabled={isMutating}
                  onClick={() => openAction("checkIn")}
                  fullWidth
                >
                  Check In
                </Button>
              )}
              {canCheckOut && (
                <Button
                  type="button"
                  size="md"
                  variant="info"
                  outline
                  icon={<FiLogOut />}
                  disabled={isMutating}
                  onClick={() => openAction("checkOut")}
                  fullWidth
                >
                  Check Out
                </Button>
              )}
              {canMarkNoShow && (
                <Button
                  type="button"
                  size="md"
                  variant="warning"
                  outline
                  icon={<FiAlertTriangle />}
                  disabled={isMutating}
                  onClick={() => openAction("noShow")}
                  fullWidth
                >
                  Mark No-Show
                </Button>
              )}
              {canCancel && (
                <Button
                  type="button"
                  size="md"
                  variant="danger"
                  outline
                  icon={<FiSlash />}
                  disabled={isMutating}
                  onClick={() => openAction("cancel")}
                  fullWidth
                >
                  Cancel Booking
                </Button>
              )}
              {canUseAdminCorrection && (
                <>
                  <Button
                    type="button"
                    size="md"
                    variant="secondary"
                    icon={<FiEdit3 />}
                    disabled={isMutating}
                    onClick={() => openAction("statusOverride")}
                    fullWidth
                  >
                    Fix Status Mistake
                  </Button>
                  <Button
                    type="button"
                    size="md"
                    variant="secondary"
                    disabled
                    fullWidth
                  >
                    Payment Correction
                  </Button>
                </>
              )}
            </div>
            {booking.bookingType === "MULTI_ROOM" && (
              <p className="mt-3 text-xs text-slate-500">
                Multi-room assignment changes should be handled from the room
                board.
              </p>
            )}
            {booking.status === "CHECKED_IN" && !canOverrideCheckedInRoom && (
              <p className="mt-3 text-xs text-slate-500">
                Room changes after check-in require confirmation and an audit
                note.
              </p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Refund/payment correction needs a dedicated payment operation API.
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Current Assignment
            </h3>
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              {getAssignedLabel(booking)}
            </div>
          </section>
        </aside>
      </div>

      <ConfirmationModal
        action={pendingAction}
        note={note}
        selectedRoomId={selectedRoomId}
        selectedStatus={selectedStatus}
        rooms={rooms}
        isSubmitting={isMutating}
        errorMessage={actionError}
        onNoteChange={setNote}
        onRoomChange={setSelectedRoomId}
        onStatusChange={setSelectedStatus}
        onClose={closeAction}
        onSubmit={submitAction}
      />
    </div>
  );
}

function PageState({
  message,
  isError = false,
}: {
  message: string;
  isError?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className={isError ? "text-red-700" : "text-slate-500"}>{message}</p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function InternalNotesSection({
  initialValue,
  isMutating,
  onSave,
}: {
  initialValue: string;
  isMutating: boolean;
  onSave: (value: string) => Promise<AdminBooking>;
}) {
  const [value, setValue] = useState(initialValue);
  const [errorMessage, setErrorMessage] = useState("");

  const saveInternalNotes = async () => {
    try {
      setErrorMessage("");
      await onSave(value);
    } catch (err) {
      setErrorMessage(normalizeApiError(err).message);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">
          Internal Notes
        </h3>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<FiEdit3 />}
          disabled={isMutating}
          onClick={() => void saveInternalNotes()}
        >
          Save notes
        </Button>
      </div>
      <textarea
        value={value}
        maxLength={5000}
        disabled={isMutating}
        onChange={(event) => setValue(event.target.value)}
        className="mt-4 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        placeholder="Add internal notes for operations..."
      />
      {errorMessage && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
    </section>
  );
}

function ConfirmationModal({
  action,
  note,
  selectedRoomId,
  selectedStatus,
  rooms,
  isSubmitting,
  errorMessage,
  onNoteChange,
  onRoomChange,
  onStatusChange,
  onClose,
  onSubmit,
}: {
  action: PendingAction | null;
  note: string;
  selectedRoomId: string;
  selectedStatus: BookingStatus;
  rooms: AssignmentRoom[];
  isSubmitting: boolean;
  errorMessage: string;
  onNoteChange: (value: string) => void;
  onRoomChange: (value: string) => void;
  onStatusChange: (value: BookingStatus) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const canSubmit =
    !isSubmitting &&
    (action?.type !== "assignRoom" || selectedRoomId !== "") &&
    (action?.type === "assignRoom" || !action?.requiresNote || note.trim().length > 0);

  return (
    <Modal
      isOpen={action !== null}
      onClose={onClose}
      title={action?.title}
      size="md"
      disableBackdropClose={isSubmitting}
      disableEscapeClose={isSubmitting}
    >
      {action && (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            <p>{action.message}</p>
          </div>

          {action.type === "assignRoom" && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Room</span>
              <select
                value={selectedRoomId}
                disabled={isSubmitting}
                onChange={(event) => onRoomChange(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              >
                <option value="">Select room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Unit {room.unitNumber} / Room {room.number} ({room.name}) -{" "}
                    {room.status}
                  </option>
                ))}
              </select>
            </label>
          )}

          {action.type === "statusOverride" && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Correct status</span>
              <select
                value={selectedStatus}
                disabled={isSubmitting}
                onChange={(event) =>
                  onStatusChange(event.target.value as BookingStatus)
                }
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              >
                {bookingStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm">
            <span className="font-medium text-slate-700">
              {action.requiresNote ? "Audit note" : "Optional note"}
            </span>
            <textarea
              value={note}
              required={action.requiresNote}
              maxLength={1000}
              disabled={isSubmitting}
              onChange={(event) => onNoteChange(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              placeholder="Reason or audit note..."
            />
          </label>

          {errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={action.type === "cancel" ? "danger" : "primary"}
              icon={<FiCheckCircle />}
              disabled={!canSubmit}
            >
              {action.confirmLabel}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
