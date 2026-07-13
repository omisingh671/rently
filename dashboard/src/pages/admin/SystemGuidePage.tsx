import { useState } from "react";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import { SystemGuideOverviewSection } from "./system-guide/SystemGuideOverviewSection";
import { SystemGuideTenancySection } from "./system-guide/SystemGuideTenancySection";
import { SystemGuideInventorySection } from "./system-guide/SystemGuideInventorySection";
import { SystemGuidePricingSection } from "./system-guide/SystemGuidePricingSection";
import { SystemGuideLeadsSection } from "./system-guide/SystemGuideLeadsSection";
import { SystemGuideOperationsSection } from "./system-guide/SystemGuideOperationsSection";
import { SystemGuidePermissionsSection } from "./system-guide/SystemGuidePermissionsSection";

const {
  FiGrid,
  FiBriefcase,
  FiHome,
  FiUsers,
  FiDollarSign,
  FiMessageSquare,
  FiCalendar,
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
          {activeTab === "overview" && <SystemGuideOverviewSection />}

          {activeTab === "tenancy" && <SystemGuideTenancySection />}

          {activeTab === "inventory" && <SystemGuideInventorySection />}

          {activeTab === "pricing" && <SystemGuidePricingSection />}

          {activeTab === "leads" && <SystemGuideLeadsSection />}

          {activeTab === "operations" && <SystemGuideOperationsSection />}

          {activeTab === "permissions" && <SystemGuidePermissionsSection />}
        </div>
      </main>
    </div>
  );
}
