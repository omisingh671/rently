import { ICON_REGISTRY } from "@/configs/iconRegistry";

const {
  FiHome,
  FiKey,
  MdMeetingRoom,
  FiTool,
} = ICON_REGISTRY;

export function SystemGuideInventorySection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Inventory Structure
        </h1>
        <p className="mt-2 text-slate-500">
          Explaining the operational hierarchy of rooms and properties,
          local amenities, and maintenance blocking rules.
        </p>
      </div>

      <hr className="border-slate-100" />

      {/* Hierarchy Concept */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-950">
          Property ➔ Unit ➔ Room Hierarchy
        </h3>
        <p className="text-sm text-slate-600">
          Physical spaces are organized in a strict hierarchy inside the
          Rently model:
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FiHome className="text-blue-600" />
              <span className="font-semibold text-slate-900">
                Property
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              The top operational node representing a building or site
              (e.g. <em>Oakwood Heights</em>). Contains general
              amenities, taxes, coupons, and local staff mappings.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FiKey className="text-emerald-600" />
              <span className="font-semibold text-slate-900">Unit</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              A sub-division within the property, representing a
              specific block, floor, or large apartment unit (e.g.{" "}
              <em>Floor 3</em> or <em>Penthouse 4B</em>).
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <MdMeetingRoom className="text-purple-600 text-lg" />
              <span className="font-semibold text-slate-900">Room</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              The actual unit of stay that is booked by guests (e.g.{" "}
              <em>Room 301</em>). Contains attributes such as floor
              level, rent, max occupancy, and real-time status.
            </p>
          </div>
        </div>
      </div>

      {/* Amenities and Maintenance */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-950">
            Amenities cataloging
          </h4>
          <p className="text-sm text-slate-600">
            Amenities (like WiFi, AC, Geyser, Parking) are created in a
            global catalog. They are then dynamically linked to
            Properties, Units, or specific Rooms through mapping tables
            (`PropertyAmenity`, `UnitAmenity`, `RoomAmenity`).
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-slate-950">
            Maintenance Blocks
          </h4>
          <p className="text-sm text-slate-600">
            A maintenance block is used to withdraw inventory from
            availability during specific dates. The block can be
            configured to target an entire property, a specific unit
            floor, or a single room for repairs or deep cleaning.
          </p>
        </div>
      </div>

      {/* Example Block */}
      <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/30 text-amber-900 space-y-3">
        <h4 className="font-bold flex items-center gap-2 text-amber-950 text-base">
          <FiTool className="text-amber-600" />
          <span>
            Example Scenario: Restricting Room 102 for Maintenance
          </span>
        </h4>
        <p className="text-sm text-amber-800">
          Imagine Room 102 suffers a water leak. Follow these steps to
          block bookings during the repair:
        </p>
        <ol className="list-decimal pl-5 text-xs text-amber-800/90 space-y-1.5">
          <li>
            Navigate to <strong>Maintenance</strong>, click{" "}
            <strong>Create Block Window</strong>.
          </li>
          <li>
            Set <strong>Target Type</strong> to <code>ROOM</code> and
            select <strong>Room 102</strong> from the dropdown list.
          </li>
          <li>
            Specify the start date and end date (e.g., May 27 to May
            30).
          </li>
          <li>
            The public booking engine will now dynamically exclude Room
            102 when checking room availability within these dates,
            preventing double bookings.
          </li>
        </ol>
      </div>
    </div>
  );
}

