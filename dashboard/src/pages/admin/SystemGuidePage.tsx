import { useState } from "react";
import { ICON_REGISTRY } from "@/configs/iconRegistry";

const {
  FiGrid,
  FiBriefcase,
  FiHome,
  FiLayers,
  FiUsers,
  FiClock,
  FiLink,
  FiKey,
  FiTool,
  FiDollarSign,
  FiMessageSquare,
  FiFileText,
  FiCalendar,
  FiClipboard,
  FiInfo,
  MdMeetingRoom,
} = ICON_REGISTRY;

interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: "overview", label: "Overview & Architecture", icon: FiGrid },
  { id: "tenancy", label: "Tenants & Properties", icon: FiBriefcase },
  { id: "inventory", label: "Inventory Structure", icon: FiHome },
  { id: "pricing", label: "Products & Pricing", icon: FiDollarSign },
  { id: "leads", label: "Leads & CRM", icon: FiMessageSquare },
  { id: "operations", label: "Operations & Bookings", icon: FiCalendar },
  { id: "permissions", label: "Permissions Matrix", icon: FiUsers },
];

export default function SystemGuidePage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-col gap-6 lg:flex-row min-h-[calc(100vh-8rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 shrink-0">
        <div className="sticky top-0 flex flex-row flex-wrap lg:flex-col gap-1 p-2 rounded-xl border border-slate-200/60 bg-white">
          <div className="hidden lg:block px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            System Guide Modules
          </div>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <div className="p-6 lg:p-8 rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Rently Architecture Overview
                </h1>
                <p className="mt-2 text-slate-500">
                  A high-level understanding of the technology stack,
                  application architecture boundaries, and fundamental
                  guidelines that govern the Rently system.
                </p>
              </div>

              <hr className="border-slate-100" />

              {/* Technology Stack Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <h3 className="font-semibold text-slate-900">
                    Frontend Technology
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                    <li>
                      • <span className="font-medium">Vite + React</span> for
                      quick and performant single-page builds
                    </li>
                    <li>
                      • <span className="font-medium">TypeScript</span> strict
                      mode for end-to-end safety
                    </li>
                    <li>
                      • <span className="font-medium">React Query</span> for
                      declarative server-state management
                    </li>
                    <li>
                      • <span className="font-medium">Zustand</span> for
                      minimal, fast client-side state
                    </li>
                    <li>
                      • <span className="font-medium">Tailwind CSS</span> for
                      responsive utility-first styling
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <h3 className="font-semibold text-slate-900">
                    Backend Technology
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                    <li>
                      • <span className="font-medium">Node.js + Express</span>{" "}
                      running our server framework
                    </li>
                    <li>
                      • <span className="font-medium">Prisma ORM</span> to
                      interact securely with a relational database
                    </li>
                    <li>
                      •{" "}
                      <span className="font-medium">Layered Architecture</span>{" "}
                      separating routing, logic, and queries
                    </li>
                    <li>
                      • <span className="font-medium">Zod validation</span> to
                      validate request boundaries at runtime
                    </li>
                    <li>
                      • <span className="font-medium">DTO-based responses</span>{" "}
                      for clean and predictable contracts
                    </li>
                  </ul>
                </div>
              </div>

              {/* Backend Layers Flow */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-950">
                  Layered Architecture Flow
                </h3>
                <p className="text-sm text-slate-600">
                  The backend follows a strict unidirectional data flow. This
                  keeps operations decoupled and easy to test:
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex-1 text-center p-3.5 bg-white border border-slate-200/80 rounded-lg shadow-sm">
                    <span className="block text-xs font-semibold text-blue-600 uppercase">
                      1. Route
                    </span>
                    <span className="text-sm text-slate-700">
                      Validates shape using Zod schemas
                    </span>
                  </div>
                  <div className="text-center text-slate-400 font-bold hidden sm:block">
                    ➔
                  </div>
                  <div className="flex-1 text-center p-3.5 bg-white border border-slate-200/80 rounded-lg shadow-sm">
                    <span className="block text-xs font-semibold text-emerald-600 uppercase">
                      2. Controller
                    </span>
                    <span className="text-sm text-slate-700">
                      Handles HTTP request/response DTOs
                    </span>
                  </div>
                  <div className="text-center text-slate-400 font-bold hidden sm:block">
                    ➔
                  </div>
                  <div className="flex-1 text-center p-3.5 bg-white border border-slate-200/80 rounded-lg shadow-sm">
                    <span className="block text-xs font-semibold text-purple-600 uppercase">
                      3. Service
                    </span>
                    <span className="text-sm text-slate-700">
                      Orchestrates business rules & state
                    </span>
                  </div>
                  <div className="text-center text-slate-400 font-bold hidden sm:block">
                    ➔
                  </div>
                  <div className="flex-1 text-center p-3.5 bg-white border border-slate-200/80 rounded-lg shadow-sm">
                    <span className="block text-xs font-semibold text-rose-600 uppercase">
                      4. Repository
                    </span>
                    <span className="text-sm text-slate-700">
                      Queries database via Prisma client
                    </span>
                  </div>
                </div>
              </div>

              {/* Core Engineering Guideline Box */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 text-indigo-950">
                <div className="flex items-start gap-3">
                  <FiInfo className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold">
                      Core Principle: Strict Domain Separation
                    </h4>
                    <p className="mt-1 text-sm text-indigo-900/85">
                      Rently is designed as a modular monolith. Avoid tight
                      couplings between modules (e.g. Booking querying Unit
                      database schemas directly). Business modules should remain
                      isolated and interact through clean public APIs, event
                      logic, or shared interfaces, strictly maintaining tenant
                      scoping.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tenancy" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Multi-Tenancy & Properties
                </h1>
                <p className="mt-2 text-slate-500">
                  Understanding how Rently isolates database workspaces for
                  different brand environments and routes administrative scopes.
                </p>
              </div>

              <hr className="border-slate-100" />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-950">
                  The Tenant vs Property Relationship
                </h3>
                <p className="text-sm text-slate-600">
                  Rently isolates brand clients using a multi-tenant hierarchy.
                  A **Tenant** represents the top-level organization/brand
                  (e.g., "Grand Lodgings Group"), whereas a **Property** is a
                  physical hotel, hostel, or apartment complex operated by that
                  tenant (e.g., "Grand Lodgings - Downtown Express").
                </p>

                {/* Tenant Hierarchy CSS Block */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2">
                      <FiBriefcase className="text-blue-600" />
                      <span className="text-sm font-semibold text-slate-900">
                        Tenant (Brand Client Sandbox)
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Attributes: Name, URL Slug, Primary Domain, Brand Colors,
                      Default Currency, Default Timezone.
                    </p>

                    <div className="mt-3 pl-6 border-l-2 border-slate-200 space-y-2">
                      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-md">
                        <div className="flex items-center gap-2">
                          <FiHome className="text-emerald-600" />
                          <span className="text-xs font-semibold text-slate-900">
                            Property A (e.g. Beach Resort)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Scopes: Inventory, Bookings, Local Pricing, Staff
                          Allocations
                        </p>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-md">
                        <div className="flex items-center gap-2">
                          <FiHome className="text-emerald-600" />
                          <span className="text-xs font-semibold text-slate-900">
                            Property B (e.g. City Suites)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Scopes: Inventory, Bookings, Local Pricing, Staff
                          Allocations
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Practical Example */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-950">
                  Example: Onboarding a New Property
                </h3>
                <p className="text-sm text-slate-600">
                  To open a new hotel location for a brand, follow this
                  operational checklist:
                </p>
                <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
                  <div className="flex gap-4">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs shrink-0">
                      1
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Super Admin creates the Property record
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Go to <strong>Properties</strong>, click{" "}
                        <strong>Create Property</strong>, fill in the Name,
                        City, State, and select the corresponding Tenant client
                        owner.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs shrink-0">
                      2
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Assign Administration Scope
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Go to <strong>Assignments</strong>, and grant
                        administrative access to the specific local Admin or
                        Manager by linking their account with the property.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs shrink-0">
                      3
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Establish Local Settings
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        The designated local Admin can now configure pricing,
                        upload image gallery items, and create inventory rooms
                        scoped exclusively under this new location.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
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
          )}

          {activeTab === "pricing" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Products & Pricing System
                </h1>
                <p className="mt-2 text-slate-500">
                  Rently isolates pricing configurations through a highly
                  decoupled model consisting of four core sub-modules: Rate
                  Products, Price Rules (Rates), Taxes, and Coupons. This
                  architecture allows complex billing without modifying physical
                  room counts.
                </p>
              </div>

              <hr className="border-slate-100" />

              {/* 4 Tabs Mapped out with grids */}
              <div className="space-y-6">
                {/* 1. Rate Products */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <FiLayers className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Sub-Module 1: Rate Products
                      </h3>
                      <p className="text-xs text-slate-500">
                        Reusable sellable stay categories linked to physical
                        inventory properties.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    A **Rate Product** represents the commercial categorization
                    of accommodation (e.g. <em>Standard Single</em> vs{" "}
                    <em>Deluxe Family Suite</em>). This acts as a template for
                    stay criteria before actual pricing rules or inventory rooms
                    are attached.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                        Key Field Variables
                      </p>
                      <ul className="mt-1.5 space-y-1 pl-3 list-disc">
                        <li>
                          <code>name</code>: Public commercial label (e.g.
                          "Double Luxury AC")
                        </li>
                        <li>
                          <code>occupancy</code>: Number of guests this product
                          accommodates (e.g. 2)
                        </li>
                        <li>
                          <code>category</code>: Nightly rate (
                          <code>NIGHTLY</code>), Long Stay (
                          <code>LONG_STAY</code>), or Corporate (
                          <code>CORPORATE</code>)
                        </li>
                        <li>
                          <code>hasAC</code>: Boolean toggle declaring whether
                          the category includes AC amenities
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                        Staff Guide & Example
                      </p>
                      <p className="mt-1 text-slate-600">
                        <strong>Onboarding a stay type:</strong> Go to the
                        pricing tab, select "Products", click "Create Rate
                        Product". Define a product "Single Dorm Bed" with
                        Occupancy=1, Category=Nightly, hasAC=False. Once
                        created, you can link this to multiple physical dorm
                        rooms.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Rates (Price Rules) */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <FiDollarSign className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Sub-Module 2: Price Rules (Rates)
                      </h3>
                      <p className="text-xs text-slate-500">
                        The actual pricing engine matching guest parameters to
                        dynamic tariffs.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    A **Price Rule** defines the exact monetary charge for a
                    Rate Product. It features a robust **scoping override
                    mechanism** allowing global property pricing to be
                    overridden at specific floor (Unit) or room-specific levels.
                  </p>

                  {/* Scoping override fallback ladder visual */}
                  <div className="space-y-2 max-w-xl p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-xs font-semibold text-slate-700">
                      Dynamic Rate Scoping Override Ladder:
                    </p>
                    <div className="space-y-1.5 text-[11px] font-medium">
                      <div className="flex justify-between items-center p-2 bg-rose-50 border border-rose-100 text-rose-800 rounded">
                        <span>1. Room Override (Highest Priority)</span>
                        <span>
                          Checks if `roomId` pricing matches guest selection
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-amber-50 border border-amber-100 text-amber-800 rounded">
                        <span>2. Unit Override (Medium Priority)</span>
                        <span>
                          Checks if the parent floor `unitId` pricing matches
                          selection
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-blue-50 border border-blue-200 text-blue-800 rounded">
                        <span>3. Property Default (Fallback Default)</span>
                        <span>
                          Applies default property-wide pricing for the product
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                        Key Field Variables
                      </p>
                      <ul className="mt-1.5 space-y-1 pl-3 list-disc">
                        <li>
                          <code>rateType</code>: Calculates nightly (
                          <code>NIGHTLY</code>), weekly (<code>WEEKLY</code>),
                          or monthly (<code>MONTHLY</code>) rates
                        </li>
                        <li>
                          <code>pricingTier</code>: Groups rate classes (
                          <code>STANDARD</code>, <code>CORPORATE</code>,{" "}
                          <code>SEASONAL</code>)
                        </li>
                        <li>
                          <code>price</code>: The decimal monetary tariff (e.g.
                          $150.00)
                        </li>
                        <li>
                          <code>minNights</code> / <code>maxNights</code>:
                          Enforces length of stay restrictions
                        </li>
                        <li>
                          <code>taxInclusive</code>: Declares if taxes are
                          pre-bundled inside the price tag
                        </li>
                        <li>
                          <code>validFrom</code> / <code>validTo</code>:
                          Calendar dates scoping when the rate can activate
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                        Staff Guide & Example
                      </p>
                      <p className="mt-1 text-slate-600">
                        <strong>Setting up custom summer pricing:</strong>{" "}
                        Select the "Rates" tab. Create a rule for product
                        "Double Luxury AC", setting Applies To=Property-wide,
                        Pricing Tier=Seasonal, Price=$180, Valid From=June 1 to
                        Aug 31. Set a standard default rule at $130 for dates
                        outside this range.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Taxes */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <FiKey className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Sub-Module 3: Tax Mappings
                      </h3>
                      <p className="text-xs text-slate-500">
                        Accommodation slab taxation and flat booking levies.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Taxes are automatically appended by the backend during
                    quotation draft or check-out calculations. Rently supports
                    **slab-based nightly accommodation taxes** (standard GST
                    structure where tax percentage depends on the tariff rate)
                    as well as **flat booking-level fixed taxes**.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                        Key Field Variables
                      </p>
                      <ul className="mt-1.5 space-y-1 pl-3 list-disc">
                        <li>
                          <code>taxType</code>: Calculates percentage (
                          <code>PERCENTAGE</code>) or currency fixed fees (
                          <code>FIXED</code>)
                        </li>
                        <li>
                          <code>rate</code>: Numeric factor (e.g., 18.0 for 18%
                          or 10.0 for a flat $10 fee)
                        </li>
                        <li>
                          <code>calculationMode</code>: Flat application (
                          <code>FLAT</code>) or calculated dynamically by tariff
                          scale (<code>SLAB</code>)
                        </li>
                        <li>
                          <code>minTariff</code> / <code>maxTariff</code>: Only
                          active during <code>SLAB</code> calculations to
                          identify standard tax tiers
                        </li>
                        <li>
                          <code>priority</code>: Numerical order deciding
                          sequence selection if multiple taxes apply
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-2 space-y-2">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                        How to Create Taxes (Practical Step-by-Step Examples)
                      </p>
                      <p className="text-slate-600">
                        To configure taxes, navigate to{" "}
                        <strong>Pricing ➔ Taxes</strong> tab, and click{" "}
                        <strong>Create Tax</strong>. Here are the three most
                        common tax configurations you will need:
                      </p>
                      <div className="grid gap-3 md:grid-cols-3 mt-2">
                        <div className="p-2.5 bg-white border border-slate-200 rounded shadow-sm">
                          <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                            1. Slab-based GST (Accommodation)
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Calculates tax dynamically based on the nightly room
                            tariff:
                          </p>
                          <ul className="list-disc pl-4 text-[11px] text-slate-600 mt-1 space-y-0.5">
                            <li>
                              <strong>Name:</strong> "GST 12%" / "GST 18%"
                            </li>
                            <li>
                              <strong>Scope:</strong> <code>Accommodation</code>
                            </li>
                            <li>
                              <strong>Tax Type:</strong> <code>Percentage</code>
                            </li>
                            <li>
                              <strong>Rate:</strong> 12 / 18
                            </li>
                            <li>
                              <strong>Calculation Mode:</strong>{" "}
                              <code>Slab by nightly tariff</code>
                            </li>
                            <li>
                              <strong>GST 12% Slab:</strong> Min=0, Max=7500,
                              Priority=1
                            </li>
                            <li>
                              <strong>GST 18% Slab:</strong> Min=7500,
                              Max=empty, Priority=2
                            </li>
                          </ul>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded shadow-sm">
                          <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                            2. Flat Fixed Service Charge
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Applies a single, flat dollar/INR charge to the
                            entire booking:
                          </p>
                          <ul className="list-disc pl-4 text-[11px] text-slate-600 mt-1 space-y-0.5">
                            <li>
                              <strong>Name:</strong> "Booking Service Fee"
                            </li>
                            <li>
                              <strong>Scope:</strong> <code>Booking</code>
                            </li>
                            <li>
                              <strong>Tax Type:</strong> <code>Fixed</code>
                            </li>
                            <li>
                              <strong>Rate:</strong> 250 (e.g. flat $250 /
                              Rs.250)
                            </li>
                            <li>
                              <strong>Calculation Mode:</strong>{" "}
                              <code>Flat rule</code>
                            </li>
                            <li>
                              <strong>Min/Max Tariff:</strong> Leave empty
                            </li>
                            <li>
                              <strong>Priority:</strong> 1
                            </li>
                          </ul>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded shadow-sm">
                          <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                            3. Percentage Municipal Tax
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Applies a flat percentage tax on the overall booking
                            subtotal:
                          </p>
                          <ul className="list-disc pl-4 text-[11px] text-slate-600 mt-1 space-y-0.5">
                            <li>
                              <strong>Name:</strong> "Municipal Tourism Tax"
                            </li>
                            <li>
                              <strong>Scope:</strong> <code>Booking</code>
                            </li>
                            <li>
                              <strong>Tax Type:</strong> <code>Percentage</code>
                            </li>
                            <li>
                              <strong>Rate:</strong> 5 (for a flat 5% charge)
                            </li>
                            <li>
                              <strong>Calculation Mode:</strong>{" "}
                              <code>Flat rule</code>
                            </li>
                            <li>
                              <strong>Min/Max Tariff:</strong> Leave empty
                            </li>
                            <li>
                              <strong>Priority:</strong> 1
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Coupons */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                      <FiLayers className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Sub-Module 4: Coupons (Discounts)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Commercial discount codes with usage caps and booking
                        bounds.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Coupons allow guest bookings to receive monetary reductions
                    before taxes are computed. The coupon engine verifies
                    minimum stays, validity, and usage limits at the database
                    repository level to enforce security constraints.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                        Key Field Variables
                      </p>
                      <ul className="mt-1.5 space-y-1 pl-3 list-disc">
                        <li>
                          <code>code</code>: The unique coupon code slug guest
                          enters (e.g. "WELCOME20")
                        </li>
                        <li>
                          <code>discountType</code>: Can be relative percent (
                          <code>PERCENTAGE</code>) or flat money value (
                          <code>FIXED</code>)
                        </li>
                        <li>
                          <code>minNights</code>: Guest must stay a minimum
                          number of nights to trigger the discount
                        </li>
                        <li>
                          <code>minAmount</code>: Guest must spend a minimum
                          subtotal to redeem the code
                        </li>
                        <li>
                          <code>maxUses</code> / <code>usedCount</code>:
                          Controls maximum overall coupon redemptions
                        </li>
                        <li>
                          <code>oncePerUser</code>: Prevents a single guest
                          profile from reusing the coupon code
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                        Staff Guide & Example
                      </p>
                      <p className="mt-1 text-slate-600">
                        <strong>Promotional Coupon Setup:</strong> Select
                        "Coupons" tab. Click "Create Coupon". Set
                        Code="EARLYBIRD", DiscountType=Percentage,
                        DiscountValue=10. Set Min Nights=3, Min Booking
                        Amount=$200, Max Uses=100, Once Per User=True, with
                        active date windows.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "leads" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Leads & CRM
                </h1>
                <p className="mt-2 text-slate-500">
                  How guest interest is collected, tracked, and configured to
                  boost bookings conversions.
                </p>
              </div>

              <hr className="border-slate-100" />

              <div className="grid gap-6 md:grid-cols-2">
                {/* Enquiries block */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <FiMessageSquare className="text-blue-600" />
                    <h3 className="font-semibold text-slate-900">
                      Enquiries Module
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    Captures general, non-binding inquiries from guests. These
                    are typically submitted through a general website contact
                    form.
                  </p>
                  <ul className="text-xs text-slate-500 pl-3 list-disc space-y-1">
                    <li>
                      Captured Details: Name, Email, Contact Number, Message,
                      Associated Property.
                    </li>
                    <li>
                      Status States: <code>NEW</code>, <code>IN_PROGRESS</code>,{" "}
                      <code>RESOLVED</code>, <code>SPAM</code>
                    </li>
                  </ul>
                </div>

                {/* QuoteRequests block */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-indigo-600" />
                    <h3 className="font-semibold text-slate-900">
                      Quotes Module
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    Represents concrete interest in booking a specific product
                    or room category for set dates. Used by reservation staff to
                    draft commercial quotes.
                  </p>
                  <ul className="text-xs text-slate-500 pl-3 list-disc space-y-1">
                    <li>
                      Captured Details: Property, User ID, Product ID, Target
                      Room/Unit (Optional), Check-in/out dates.
                    </li>
                    <li>
                      Status States: <code>PENDING</code>, <code>OFFERED</code>,{" "}
                      <code>ACCEPTED</code>, <code>EXPIRED</code>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Conversion workflow example */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-950">
                  Drafting a Quote Offer
                </h3>
                <p className="text-sm text-slate-600">
                  When a customer submits a Quote request, follow these steps to
                  handle it:
                </p>
                <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 text-sm text-slate-600">
                  <p>
                    <strong>1. Inspect Availability:</strong> Go to{" "}
                    <strong>Quotes</strong>, click on the incoming quote. Check
                    the requested dates and product type (e.g. Double AC Room
                    from June 10 to June 15).
                  </p>
                  <p>
                    <strong>2. Assess Applicable Pricing:</strong> The system
                    automatically queries the pricing tier (weekend adjustments,
                    coupons, active taxes) and drafts the total amount.
                  </p>
                  <p>
                    <strong>3. Send Quote:</strong> Change status to{" "}
                    <code>OFFERED</code> and share the draft details. Once the
                    guest reviews and makes payment, the quote converts into a{" "}
                    <strong>Confirmed Booking</strong> automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "operations" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Operations & Booking Management
                </h1>
                <p className="mt-2 text-slate-500">
                  Deep-dive into our core transaction engine: booking
                  lifecycles, manual payment configurations, snapshot
                  mechanisms, and the visual Room Board.
                </p>
              </div>

              <hr className="border-slate-100" />

              {/* Booking Lifecycle flowchart */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-950">
                  Booking Lifecycle States
                </h3>
                <p className="text-sm text-slate-600">
                  A booking goes through distinct phases from request to
                  departure:
                </p>
                <div className="flex flex-wrap items-center justify-start gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-yellow-100 border border-yellow-200 text-yellow-800 font-medium">
                    1. PENDING (Awaiting Payment)
                  </span>
                  <span className="text-slate-400 font-bold">➔</span>
                  <span className="px-2.5 py-1 rounded bg-blue-100 border border-blue-200 text-blue-800 font-medium">
                    2. CONFIRMED (Reserved)
                  </span>
                  <span className="text-slate-400 font-bold">➔</span>
                  <span className="px-2.5 py-1 rounded bg-indigo-100 border border-indigo-200 text-indigo-800 font-medium">
                    3. CHECKED_IN (Stay Active)
                  </span>
                  <span className="text-slate-400 font-bold">➔</span>
                  <span className="px-2.5 py-1 rounded bg-emerald-100 border border-emerald-200 text-emerald-800 font-medium">
                    4. CHECKED_OUT (Completed)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  * Note: Cancellations can move a booking to{" "}
                  <code>CANCELLED</code> or <code>NO_SHOW</code> states at any
                  point.
                </p>
              </div>

              {/* Key Features */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <h4 className="font-semibold text-slate-950">
                    Guest & Product Snapshotting
                  </h4>
                  <p className="text-xs text-slate-600">
                    To protect transactional integrity, when a booking is
                    created, the system copies critical guest and pricing
                    details into database snapshots:
                  </p>
                  <ul className="text-xs text-slate-500 pl-3 list-disc space-y-1">
                    <li>
                      Guest Name and Email are snapshotted to{" "}
                      <code>guestNameSnapshot</code> and{" "}
                      <code>guestEmailSnapshot</code>
                    </li>
                    <li>
                      The product name and rate are stored to prevent historical
                      changes from mutating retroactively if the base rate is
                      modified.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <h4 className="font-semibold text-slate-950">
                    Room Board Visualizer
                  </h4>
                  <p className="text-xs text-slate-600">
                    The **Room Board** is a visual matrix tool. It lists all
                    physical rooms vertically against dates horizontally,
                    allowing operations managers to drag-and-drop bookings,
                    visualize current occupancy rates, and handle walk-ins
                    efficiently.
                  </p>
                </div>
              </div>

              {/* Managing Booking Details & Staff Actions Section */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <FiClipboard className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Managing Booking Details & Staff Actions
                    </h3>
                    <p className="text-xs text-slate-500">
                      How administrators execute booking lifecycle changes and
                      audit operations.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  When a staff member opens a booking in the{" "}
                  <strong>Booking Details</strong> view, they are presented with
                  a transactional operations hub. Below are the core actions
                  they can perform, supported by backend scoping rules:
                </p>
                <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-600">
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <FiClock className="text-blue-500 w-3.5 h-3.5" />
                        <span>1. Audited Status Transitions</span>
                      </p>
                      <p className="mt-1 text-slate-600">
                        Staff can transition a booking between active phases
                        (e.g. <code>PENDING</code> ➔ <code>CONFIRMED</code> ➔{" "}
                        <code>CHECKED_IN</code> ➔ <code>CHECKED_OUT</code>).
                        Every status mutation creates an entry in the{" "}
                        <code>BookingStatusHistory</code> table, tracking the
                        acting staff user ID, a timestamp, and an optional
                        administrative reason note.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <MdMeetingRoom className="text-purple-500 w-3.5 h-3.5" />
                        <span>2. Room Allocation Mapping</span>
                      </p>
                      <p className="mt-1 text-slate-600">
                        For <code>CONFIRMED</code> bookings, administrators can
                        allocate a specific physical room number to the stay.
                        The room dropdown automatically filters to display
                        vacant physical rooms that match the exact{" "}
                        <code>RoomProduct</code> (category and AC toggle)
                        reserved by the customer.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <FiDollarSign className="text-emerald-500 w-3.5 h-3.5" />
                        <span>3. Recording Offline Payments</span>
                      </p>
                      <p className="mt-1 text-slate-600">
                        If a guest pays in cash, card swipe, or bank wire during
                        check-in, staff can record an offline transaction. They
                        input the Payment Amount, Payment Status (
                        <code>PAID</code>), Provider (<code>MANUAL</code>), and
                        a unique reference transaction code to successfully
                        reconcile the balance.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <FiFileText className="text-amber-500 w-3.5 h-3.5" />
                        <span>4. Locked Contract Snapshots</span>
                      </p>
                      <p className="mt-1 text-slate-600">
                        To secure database integrity, all financial metrics
                        (price per night, subtotal, and tax breakdowns) and
                        guest contact profiles are rendered in read-only cards.
                        These snapshots remain frozen forever, protecting past
                        revenue statements from changing if pricing rules change
                        later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Flow */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-950">
                  Payments & Idempotency Rules
                </h3>
                <p className="text-sm text-slate-600">
                  Payments are mapped to booking records using unique
                  transaction IDs. In the database, the `Payment` table enforces
                  a unique constraint on <code>idempotencyKey</code> to prevent
                  duplicate payment attempts from credit/debit gateways.
                </p>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs font-semibold text-slate-700 uppercase">
                    Payment DB Structure:
                  </p>
                  <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 rounded-lg text-xs overflow-x-auto font-mono">
                    {`{
  id: "pay_987xab31",
  bookingId: "book_3310aa82",
  amount: 240.00,
  currency: "USD",
  status: "PAID",
  idempotencyKey: "razorpay_order_4418_payment_99",
  providerPaymentId: "ch_110aB3x",
  paidAt: "2026-05-26T17:00:00Z"
}`}
                  </pre>
                </div>
              </div>

              {/* Booking and Refund Operations Guide */}
              <div className="space-y-4 border-t border-slate-100 pt-6">
                <h3 className="text-lg font-semibold text-slate-950">
                  Booking & Refund Operations Guide
                </h3>
                <p className="text-sm text-slate-600">
                  Rently handles bookings and financial processing through a highly controlled, multi-stage transaction framework. Review the operational guidelines below for managing booking lifecycles, processing cancellations, and tracking the status of refunds.
                </p>

                <div className="grid gap-4 md:grid-cols-2 text-xs text-slate-600">
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <FiCalendar className="text-indigo-600 w-3.5 h-3.5" />
                      <span>Booking Lifecycle & Transitions</span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      A booking transitions between states based on payment capture and physical presence. Each change is audited and logged in the system's status history:
                    </p>
                    <ul className="pl-3 list-disc space-y-1 text-slate-500">
                      <li><strong>PENDING:</strong> The booking is drafted but unpaid. Reserved rooms are held temporarily.</li>
                      <li><strong>CONFIRMED:</strong> Payment/upfront amount is captured successfully. Physical inventory is officially blocked.</li>
                      <li><strong>CHECKED_IN:</strong> Guest check-in has been completed. Room status dynamically shifts to occupied.</li>
                      <li><strong>CHECKED_OUT:</strong> The stay is completed and closed. Historical data is archived.</li>
                      <li><strong>CANCELLED:</strong> The booking is cancelled. Held inventory is released immediately.</li>
                      <li><strong>NO_SHOW:</strong> Guest failed to arrive. Room is released back into availability.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <FiDollarSign className="text-emerald-600 w-3.5 h-3.5" />
                      <span>Refund Operations & Types</span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Depending on how the guest originally paid, Rently supports two transaction mechanisms for processing refunds:
                    </p>
                    <div className="space-y-2 mt-2">
                      <div className="p-2 bg-white border border-slate-200 rounded">
                        <span className="font-semibold text-slate-900 block">1. Online Gateway Refund</span>
                        <span className="text-[11px] text-slate-500">Automated refunds processed back to the customer's card or banking source via integrated gateways (e.g. Stripe, Razorpay). Runs securely inside database transactions.</span>
                      </div>
                      <div className="p-2 bg-white border border-slate-200 rounded">
                        <span className="font-semibold text-slate-900 block">2. Manual Offline Refund</span>
                        <span className="text-[11px] text-slate-500">For bookings paid via Cash, UPI Transfer, or Direct Wire. The refund is completed physically outside the system, then recorded manually by staff to reconcile balance amounts.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refund Request Status Workflow Visual */}
                <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-semibold text-slate-900 text-sm">
                    Refund Request States & Lifecycle
                  </h4>
                  <p className="text-xs text-slate-600">
                    To maintain transactional accuracy, cancellations trigger refund request records. These records progress through a strict validation workflow visible to both guests and staff:
                  </p>
                  
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 mt-3">
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-center">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Step 1</span>
                      <span className="block font-semibold text-xs text-slate-800 mt-1">No Payment Made</span>
                      <p className="text-[10px] text-slate-500 mt-1">Paid amount is zero; no refund processed.</p>
                    </div>
                    
                    <div className="p-2.5 rounded-lg border border-amber-100 bg-amber-50/50 text-center">
                      <span className="block text-[10px] font-bold uppercase text-amber-500">Step 2</span>
                      <span className="block font-semibold text-xs text-amber-900 mt-1">Requested</span>
                      <p className="text-[10px] text-amber-700 mt-1">Refund request submitted by the customer; pending review.</p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-blue-100 bg-blue-50/50 text-center">
                      <span className="block text-[10px] font-bold uppercase text-blue-500">Step 3</span>
                      <span className="block font-semibold text-xs text-blue-900 mt-1">In Review</span>
                      <p className="text-[10px] text-blue-700 mt-1">Operations team is assessing refund eligibility.</p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-red-100 bg-red-50/50 text-center">
                      <span className="block text-[10px] font-bold uppercase text-red-500">Rejected</span>
                      <span className="block font-semibold text-xs text-red-900 mt-1">Rejected</span>
                      <p className="text-[10px] text-red-700 mt-1">Refund request is denied with explanation note.</p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-orange-100 bg-orange-50/50 text-center">
                      <span className="block text-[10px] font-bold uppercase text-orange-500">Approved</span>
                      <span className="block font-semibold text-xs text-orange-900 mt-1">Refund Pending</span>
                      <p className="text-[10px] text-orange-700 mt-1">Approved; waiting for gateway disbursement or manual payout.</p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/50 text-center">
                      <span className="block text-[10px] font-bold uppercase text-emerald-500">Completed</span>
                      <span className="block font-semibold text-xs text-emerald-900 mt-1">Refunded</span>
                      <p className="text-[10px] text-emerald-700 mt-1">Funds successfully credited and verified.</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-950 mt-4">
                    <div className="flex gap-2">
                      <FiInfo className="text-indigo-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold">Financial Integrity Snapshot:</span>
                        <p className="mt-0.5 text-indigo-900/90 leading-relaxed">
                          The system calculates <code>netPaidAmount = paidAmount - refundedAmount</code>. Any approval changes automatically update <code>refundableAmount</code>. These attributes are secured under database constraint locks to prevent any mismatch in guest billing history.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Access Control & Role Matrix
                </h1>
                <p className="mt-2 text-slate-500">
                  Understand dashboard permissions, route guards, and action
                  restrictions configured for Super Admins, Admins, and
                  Managers.
                </p>
              </div>

              <hr className="border-slate-100" />

              {/* Role Permissions Matrix Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-semibold text-slate-700">
                        Module Capability
                      </th>
                      <th className="p-3 font-semibold text-slate-700 text-center">
                        Super Admin
                      </th>
                      <th className="p-3 font-semibold text-slate-700 text-center">
                        Admin
                      </th>
                      <th className="p-3 font-semibold text-slate-700 text-center">
                        Manager
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 text-slate-900 font-medium">
                        Tenant & Brand Setup
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Full Global)
                      </td>
                      <td className="p-3 text-center text-slate-400">—</td>
                      <td className="p-3 text-center text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-900 font-medium">
                        User Management (Staff Creation)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Full Global)
                      </td>
                      <td className="p-3 text-center text-slate-400">—</td>
                      <td className="p-3 text-center text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-900 font-medium">
                        Property Configurations
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Create/Edit)
                      </td>
                      <td className="p-3 text-center text-slate-400">—</td>
                      <td className="p-3 text-center text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-900 font-medium">
                        Local Manager Creation
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Full Global)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Only for assigned property)
                      </td>
                      <td className="p-3 text-center text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-900 font-medium">
                        Inventory (Units, Rooms, Gallery)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Full)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Scoped Property)
                      </td>
                      <td className="p-3 text-center text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-900 font-medium">
                        Pricing Configurations & Rules
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Full)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Scoped Property)
                      </td>
                      <td className="p-3 text-center text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-900 font-medium">
                        Maintenance Blocks
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Full)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Scoped Property)
                      </td>
                      <td className="p-3 text-center text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-900 font-medium">
                        Operations (Bookings, CRM, Quotes)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Global)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Scoped Property)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Scoped Property)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Explaining PropertyAssignment scoping */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 text-blue-950 space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <FiLink className="text-blue-600" />
                  <span>Property Scoping Mechanism</span>
                </h4>
                <p className="text-sm text-blue-900/85">
                  How does property restriction work? When an Admin or Manager
                  logs in, the backend queries the{" "}
                  <code>PropertyAssignment</code> table. If a user is not linked
                  to a specific Property ID via a PropertyAssignment record,
                  they will receive a <code>403 Forbidden</code> when attempting
                  to fetch inventory, pricing, or bookings for that property.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
