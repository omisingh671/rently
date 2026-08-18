import { useMemo, useState } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiHome,
  FiList,
  FiPlus,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import Button from "@/components/ui/Button";
import {
  displayDate,
  groupStatuses,
  groupStatusClass,
  type GroupStatusFilter,
} from "@/features/commercial/commercial.helpers";
import type { BookingGroupSummary } from "@/features/commercial/types";
import { formatEnumLabel } from "@/utils/formatEnumLabel";

const inputClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const GROUPS_PER_PAGE = 8;

type Props = {
  groups: BookingGroupSummary[];
  propertyName: string;
  isLoading: boolean;
  canManage: boolean;
  onAdd: () => void;
  onOpenGroup: (groupId: string) => void;
};

export default function GroupStaysManager({
  groups,
  propertyName,
  isLoading,
  canManage,
  onAdd,
  onOpenGroup,
}: Props) {
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [statusFilter, setStatusFilter] = useState<GroupStatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.filter((group) => {
      const matchesStatus =
        statusFilter === "ALL" || group.status === statusFilter;
      const matchesSearch =
        !query ||
        group.name.toLowerCase().includes(query) ||
        group.groupRef.toLowerCase().includes(query) ||
        group.company?.legalName.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [groups, search, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / GROUPS_PER_PAGE));
  const visiblePage = Math.min(page, pageCount);
  const firstIndex = (visiblePage - 1) * GROUPS_PER_PAGE;
  const visibleGroups = filteredGroups.slice(firstIndex, firstIndex + GROUPS_PER_PAGE);

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="group flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            aria-controls="group-stays-content"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <FiList aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <h2 className="font-semibold text-slate-900">Manage Group Stays</h2>
              <p className="mt-0.5 text-xs text-slate-500">{propertyName} · Open a group to manage rooms, guests, status, and folio.</p>
            </span>
            <FiChevronDown
              className={`ml-auto size-5 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600 ${isExpanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {canManage && <Button className="w-full sm:w-52" size="sm" icon={<FiPlus />} onClick={onAdd}>Add Group Stay</Button>}
        </div>
      </div>

      {isExpanded && <div id="group-stays-content" className="flex flex-1 flex-col p-5">
        {!isLoading && groups.length > 0 && (
          <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Search groups</span>
              <span className="relative block">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input className={`${inputClass} pl-9`} type="search" placeholder="Search by group, company, or reference" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Status</span>
              <select className={inputClass} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as GroupStatusFilter); setPage(1); }}>
                <option value="ALL">All Statuses</option>
                {groupStatuses.map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}
              </select>
            </label>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2" aria-label="Loading groups">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <FiUsers className="text-2xl text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-slate-700">No Group Stays Yet</p>
            <p className="mt-1 text-xs text-slate-500">Use Add Group Stay to create the first dated room allotment.</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <FiSearch className="text-2xl text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-slate-700">No Matching Group Stays</p>
            <button className="mt-3 text-xs font-semibold text-indigo-600" type="button" onClick={() => { setSearch(""); setStatusFilter("ALL"); setPage(1); }}>Clear Filters</button>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => onOpenGroup(group.id)}
                className="group block w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{group.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{group.company?.legalName ?? "Independent Group"} · {group.groupRef}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${groupStatusClass[group.status]}`}>{formatEnumLabel(group.status)}</span>
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><FiCalendar className="text-slate-400" aria-hidden="true" />{displayDate(group.checkIn)} – {displayDate(group.checkOut)}</span>
                  <span className="flex items-center gap-1"><FiHome className="text-slate-400" aria-hidden="true" />{group.expectedRooms} rooms</span>
                  <span className="flex items-center gap-1"><FiClock className="text-slate-400" aria-hidden="true" />{group.heldRoomCount} held</span>
                  <span className="ml-auto flex items-center gap-1 font-semibold text-indigo-700">Open operations<FiArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                </span>
              </button>
            ))}
          </div>
        )}

        {filteredGroups.length > 0 && (
          <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Showing {firstIndex + 1}–{Math.min(firstIndex + GROUPS_PER_PAGE, filteredGroups.length)} of {filteredGroups.length}</p>
            {pageCount > 1 && (
              <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={visiblePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><Button size="sm" variant="secondary" disabled={visiblePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</Button></div>
            )}
          </div>
        )}
      </div>}
    </section>
  );
}
