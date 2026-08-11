import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  format,
  isAfter,
  isBefore,
  startOfMonth,
} from "date-fns";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { FiCalendar, FiChevronDown } from "react-icons/fi";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { getManualBookingCalendarAvailabilityApi } from "@/features/operations/api";
import type {
  ConcreteComfortOption,
  ManualBookingCalendarAvailabilityDay,
  ManualBookingCalendarAvailabilityResponse,
} from "@/features/operations/types";

type Props = {
  propertyId: string;
  from: string;
  to: string;
  guests: number;
  comfortOption: ConcreteComfortOption | "ALL";
  disabled?: boolean;
  onChange: (from: string, to: string) => void;
};

const parseDateValue = (value: string) =>
  value ? new Date(`${value}T00:00:00`) : undefined;

const todayDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const mergeCalendarResults = (
  results: ManualBookingCalendarAvailabilityResponse[],
): ManualBookingCalendarAvailabilityResponse => {
  const byDate = new Map<string, ManualBookingCalendarAvailabilityDay[]>();
  for (const result of results) {
    for (const day of result.days) {
      const values = byDate.get(day.date) ?? [];
      values.push(day);
      byDate.set(day.date, values);
    }
  }

  const days = Array.from(byDate.entries()).map(([date, values]) => {
    if (values.some((value) => value.status === "AVAILABLE")) {
      return { date, status: "AVAILABLE" as const, reason: null };
    }
    if (values.every((value) => value.status === "CLOSED")) {
      const reasons = new Set(values.map((value) => value.reason));
      return {
        date,
        status: "CLOSED" as const,
        reason: reasons.size === 1 ? values[0]?.reason ?? null : null,
      };
    }
    return { date, status: "SOLD_OUT" as const, reason: null };
  });

  return {
    startDate: results[0]?.startDate ?? "",
    endDate: results[0]?.endDate ?? "",
    days,
  };
};

export default function WalkInStayDatePicker({
  propertyId,
  from,
  to,
  guests,
  comfortOption,
  disabled = false,
  onChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => todayDate(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(today));
  const [numberOfMonths, setNumberOfMonths] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches ? 2 : 1,
  );
  const [popoverPosition, setPopoverPosition] = useState({
    top: 0,
    left: 0,
    maxHeight: 470,
  });
  const selected = useMemo<DateRange | undefined>(() => {
    const selectedFrom = parseDateValue(from);
    if (!selectedFrom) return undefined;
    return { from: selectedFrom, to: parseDateValue(to) };
  }, [from, to]);
  const queryStartDate = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    return isBefore(monthStart, today) ? today : monthStart;
  }, [displayMonth, today]);
  const queryEndDate = useMemo(
    () => addDays(queryStartDate, 62),
    [queryStartDate],
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const updateMonths = () => setNumberOfMonths(media.matches ? 2 : 1);
    media.addEventListener("change", updateMonths);
    return () => media.removeEventListener("change", updateMonths);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const viewportMargin = 12;
    const gap = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const estimatedWidth = numberOfMonths === 2 ? 660 : 340;
    const popoverWidth = popoverRef.current?.offsetWidth ?? estimatedWidth;
    const popoverHeight = popoverRef.current?.offsetHeight ?? 470;
    const availableBelow = Math.max(
      160,
      window.innerHeight - triggerRect.bottom - gap - viewportMargin,
    );
    const availableAbove = Math.max(
      160,
      triggerRect.top - gap - viewportMargin,
    );
    const shouldOpenAbove =
      availableBelow < popoverHeight && availableAbove > availableBelow;
    const maxHeight = shouldOpenAbove ? availableAbove : availableBelow;
    const renderedHeight = Math.min(popoverHeight, maxHeight);
    const left = Math.min(
      Math.max(viewportMargin, triggerRect.left),
      Math.max(viewportMargin, window.innerWidth - popoverWidth - viewportMargin),
    );
    const top = shouldOpenAbove
      ? Math.max(viewportMargin, triggerRect.top - renderedHeight - gap)
      : triggerRect.bottom + gap;

    setPopoverPosition({ top, left, maxHeight });
  }, [numberOfMonths]);

  useEffect(() => {
    if (!isOpen) return;

    updatePopoverPosition();
    const frame = window.requestAnimationFrame(updatePopoverPosition);
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [isOpen, updatePopoverPosition]);

  const calendarQuery = useQuery({
    queryKey: ADMIN_KEYS.operations.bookingCalendarAvailability({
      propertyId,
      startDate: format(queryStartDate, "yyyy-MM-dd"),
      endDate: format(queryEndDate, "yyyy-MM-dd"),
      guests,
      comfortOption,
    }),
    queryFn: async () => {
      const comfortOptions: ConcreteComfortOption[] =
        comfortOption === "ALL" ? ["AC", "NON_AC"] : [comfortOption];
      const results = await Promise.all(
        comfortOptions.map((option) =>
          getManualBookingCalendarAvailabilityApi(propertyId, {
            startDate: format(queryStartDate, "yyyy-MM-dd"),
            endDate: format(queryEndDate, "yyyy-MM-dd"),
            guests,
            comfortOption: option,
          }),
        ),
      );
      return mergeCalendarResults(results);
    },
    enabled: isOpen && !disabled && propertyId.length > 0,
    staleTime: 60_000,
    retry: false,
  });

  const unavailableDays = useMemo(
    () =>
      (calendarQuery.data?.days ?? [])
        .filter((day) => day.status !== "AVAILABLE")
        .map((day) => parseDateValue(day.date))
        .filter((day): day is Date => day !== undefined),
    [calendarQuery.data?.days],
  );
  const soldOutDays = useMemo(
    () =>
      (calendarQuery.data?.days ?? [])
        .filter((day) => day.status === "SOLD_OUT")
        .map((day) => parseDateValue(day.date))
        .filter((day): day is Date => day !== undefined),
    [calendarQuery.data?.days],
  );
  const closedDays = useMemo(
    () =>
      (calendarQuery.data?.days ?? [])
        .filter((day) => day.status === "CLOSED")
        .map((day) => parseDateValue(day.date))
        .filter((day): day is Date => day !== undefined),
    [calendarQuery.data?.days],
  );

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      onChange("", "");
      return;
    }

    onChange(
      format(range.from, "yyyy-MM-dd"),
      range.to ? format(range.to, "yyyy-MM-dd") : "",
    );
    if (range.to) setIsOpen(false);
  };

  const openCalendar = () => {
    if (disabled) return;
    if (!isOpen) setDisplayMonth(startOfMonth(selected?.from ?? today));
    setIsOpen((value) => !value);
  };
  const formatDisplayDate = (value: string) =>
    format(parseDateValue(value)!, "EEE, MMM d");
  const selectedDateLabel =
    from && to
      ? `${formatDisplayDate(from)} — ${formatDisplayDate(to)}`
      : from
        ? `${formatDisplayDate(from)} — Select Check-Out`
        : "Choose Stay Dates";
  const choosingCheckout = Boolean(selected?.from && !selected.to);
  const firstAllowedMonth = startOfMonth(today);
  const selectedFrom = selected?.from;
  const firstUnavailableAfterCheckIn =
    choosingCheckout && selectedFrom
      ? [...unavailableDays]
          .filter((day) => isAfter(day, selectedFrom))
          .sort((left, right) => left.getTime() - right.getTime())[0]
      : undefined;
  const disabledDays =
    choosingCheckout && selectedFrom
      ? (date: Date) =>
          isBefore(date, selectedFrom) ||
          Boolean(
            firstUnavailableAfterCheckIn &&
              isAfter(date, firstUnavailableAfterCheckIn),
          )
      : [{ before: today }, ...unavailableDays];

  const calendarPopover = isOpen && !disabled ? (
    <div
      ref={popoverRef}
      className="walk-in-date-picker fixed z-[100] w-max max-w-[calc(100vw-1.5rem)] overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
      style={{
        top: popoverPosition.top,
        left: popoverPosition.left,
        maxHeight: popoverPosition.maxHeight,
      }}
    >
      <DayPicker
        mode="range"
        selected={selected}
        onSelect={handleSelect}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        numberOfMonths={numberOfMonths}
        startMonth={firstAllowedMonth}
        endMonth={addMonths(firstAllowedMonth, 12)}
        disabled={disabledDays}
        excludeDisabled
        min={1}
        modifiers={{ soldOut: soldOutDays, closed: closedDays }}
        modifiersClassNames={{
          soldOut: "walk-in-date-sold-out",
          closed: "walk-in-date-closed",
        }}
        autoFocus
        footer={
          calendarQuery.isFetching
            ? "Checking live availability..."
            : calendarQuery.isError
              ? "Live date status is temporarily unavailable. Final availability will still be checked."
              : choosingCheckout
                ? "Choose a check-out date. Sold-out dates can be used as check-out boundaries."
                : "Choose a check-in date, then a check-out date."
        }
      />
      <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <span>
          <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-400" />
          Sold Out
        </span>
        <span>
          <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          Property Closed
        </span>
        <button
          type="button"
          className="ml-auto font-semibold text-indigo-600 hover:text-indigo-700"
          onClick={() => handleSelect(undefined)}
        >
          Clear Dates
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label="Select Stay Dates"
        aria-expanded={isOpen && !disabled}
        onClick={openCalendar}
        className="flex h-12 w-full items-center gap-3 rounded-md border border-slate-300 bg-white px-3 text-left outline-none transition hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
      >
        <FiCalendar className="h-5 w-5 shrink-0 text-slate-500" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium leading-4 text-slate-500">
            Select Dates
          </span>
          <span className="block truncate text-sm font-semibold leading-5 text-slate-900">
            {selectedDateLabel}
          </span>
        </span>
        <FiChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {calendarPopover && createPortal(calendarPopover, document.body)}
    </div>
  );
}
