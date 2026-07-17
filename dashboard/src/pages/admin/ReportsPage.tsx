import { useMemo, useState } from "react";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { useDashboardAnalytics } from "@/features/dashboard/hooks";
import Button from "@/components/ui/Button";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import PropertySearchSelect from "@/features/properties/components/PropertySearchSelect";

// Date helpers
const getPastDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayStr = () => getPastDateStr(0);

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) => `${value}%`;

type TabType = "occupancy" | "revenue" | "sources" | "performance";

export default function ReportsPage() {
  const { properties, selectedPropertyId, setSelectedPropertyId } =
    useCurrentProperty();

  const [propertyFilterMode, setPropertyFilterMode] = useState<"current" | "all">("current");
  const activePropertyId = propertyFilterMode === "all" ? "" : selectedPropertyId;

  const [datePreset, setDatePreset] = useState<"7d" | "30d" | "thisMonth" | "custom">("30d");
  const [dateRange, setDateRange] = useState({
    from: getPastDateStr(30),
    to: getTodayStr(),
  });

  const [activeTab, setActiveTab] = useState<TabType>("occupancy");

  // Handle preset clicks
  const handlePresetChange = (preset: "7d" | "30d" | "thisMonth") => {
    setDatePreset(preset);
    const to = getTodayStr();
    let from = getPastDateStr(30);

    if (preset === "7d") {
      from = getPastDateStr(7);
    } else if (preset === "thisMonth") {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      from = `${year}-${month}-01`;
    }

    setDateRange({ from, to });
  };

  const analyticsQuery = useDashboardAnalytics({
    startDate: dateRange.from,
    endDate: dateRange.to,
    ...(activePropertyId && { propertyId: activePropertyId }),
  });

  const analytics = analyticsQuery.data;

  // CSV Export logic
  const handleExportCSV = () => {
    if (!analytics) return;

    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const filename = `report_${activeTab}_${dateRange.from}_to_${dateRange.to}.csv`;

    switch (activeTab) {
      case "occupancy":
        headers = ["Date", "Total Rooms", "Available Nights", "Occupied Nights", "Occupancy Rate (%)"];
        rows = analytics.occupancy.map((item) => [
          item.date,
          item.totalRooms,
          item.availableNights,
          item.occupiedNights,
          item.occupancyRate,
        ]);
        break;
      case "revenue":
        headers = ["Date", "Subtotal (INR)", "Discount (INR)", "Tax (INR)", "Total (INR)", "Paid (INR)", "Refunds (INR)", "Net Revenue (INR)"];
        rows = analytics.revenue.map((item) => [
          item.date,
          item.subtotal,
          item.discount,
          item.tax,
          item.total,
          item.paid,
          item.refunds,
          item.netRevenue,
        ]);
        break;
      case "sources":
        headers = ["Booking Source", "Bookings Count", "Gross Revenue (INR)"];
        rows = analytics.sources.map((item) => [
          item.source,
          item.count,
          item.revenue,
        ]);
        break;
      case "performance":
        headers = ["Property Name", "Occupancy Rate (%)", "Total Rooms", "Available Nights", "Occupied Nights", "Gross Revenue (INR)", "Net Revenue (INR)", "ADR (INR)", "RevPAR (INR)"];
        rows = analytics.properties.map((item) => [
          item.propertyName,
          item.occupancyRate,
          item.totalRooms,
          item.availableNights,
          item.occupiedNights,
          item.grossRevenue,
          item.netRevenue,
          item.adr,
          item.revpar,
        ]);
        break;
    }

    const csvRows = [headers.join(",")];
    for (const row of rows) {
      const values = row.map((val) => {
        const escaped = ("" + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper metrics computed from analytics
  const summaryMetrics = useMemo(() => {
    if (!analytics) return null;

    const totalAvailable = analytics.occupancy.reduce((sum, item) => sum + item.availableNights, 0);
    const totalOccupied = analytics.occupancy.reduce((sum, item) => sum + item.occupiedNights, 0);
    const avgOccupancy = totalAvailable === 0 ? 0 : Math.round((totalOccupied / totalAvailable) * 100);

    const grossRevenue = analytics.revenue.reduce((sum, item) => sum + item.total, 0);
    const netRevenue = analytics.revenue.reduce((sum, item) => sum + item.netRevenue, 0);
    const totalDiscounts = analytics.revenue.reduce((sum, item) => sum + item.discount, 0);
    const totalTaxes = analytics.revenue.reduce((sum, item) => sum + item.tax, 0);

    return {
      avgOccupancy,
      totalAvailable,
      totalOccupied,
      grossRevenue,
      netRevenue,
      totalDiscounts,
      totalTaxes,
    };
  }, [analytics]);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Analyze property occupancy, revenues, marketing channels, and operational metrics.
          </p>
        </div>
        <div className="flex gap-2">
          {analytics && (
            <Button type="button" size="sm" variant="dark" onClick={handleExportCSV}>
              Export Current Tab as CSV
            </Button>
          )}
        </div>
      </div>

      {/* Date preset & range filters */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col flex-wrap gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Properties switcher */}
            <PropertySearchSelect
              className="min-w-56"
              selectedPropertyId={activePropertyId}
              selectedPropertyName={properties.find((property) => property.id === activePropertyId)?.name}
              allowAll
              onChange={(propertyId) => {
                setPropertyFilterMode(propertyId === "" ? "all" : "current");
                setSelectedPropertyId(propertyId || null);
              }}
            />

            {/* Presets */}
            <div className="inline-flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => handlePresetChange("7d")}
                className={`rounded-l-md border border-slate-200 px-3 py-2 text-xs font-medium ${
                  datePreset === "7d"
                    ? "bg-slate-100 text-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("30d")}
                className={`border-t border-b border-slate-200 px-3 py-2 text-xs font-medium ${
                  datePreset === "30d"
                    ? "bg-slate-100 text-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("thisMonth")}
                className={`rounded-r-md border border-slate-200 px-3 py-2 text-xs font-medium ${
                  datePreset === "thisMonth"
                    ? "bg-slate-100 text-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
              value={dateRange.from}
              onChange={(e) => {
                setDatePreset("custom");
                setDateRange((prev) => ({ ...prev, from: e.target.value }));
              }}
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
              value={dateRange.to}
              onChange={(e) => {
                setDatePreset("custom");
                setDateRange((prev) => ({ ...prev, to: e.target.value }));
              }}
            />
          </div>
        </div>
      </section>

      {/* KPI Overviews */}
      {summaryMetrics && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Occupancy</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">{formatPercent(summaryMetrics.avgOccupancy)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {summaryMetrics.totalOccupied} of {summaryMetrics.totalAvailable} room nights
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gross Bookings</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">{formatMoney(summaryMetrics.grossRevenue)}</p>
            <p className="mt-1 text-xs text-slate-500">Value of reservations created</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Revenue</p>
            <p className="mt-2 text-3xl font-bold text-[#3b82f6]">{formatMoney(summaryMetrics.netRevenue)}</p>
            <p className="mt-1 text-xs text-slate-500">Payments net of processed refunds</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Taxes & Discounts</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">{formatMoney(summaryMetrics.totalTaxes)}</p>
            <p className="mt-1 text-xs text-slate-500">Discounts given: {formatMoney(summaryMetrics.totalDiscounts)}</p>
          </div>
        </section>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("occupancy")}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === "occupancy"
                ? "border-slate-800 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Occupancy Daily
          </button>
          <button
            onClick={() => setActiveTab("revenue")}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === "revenue"
                ? "border-slate-800 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Revenue & Collections
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === "sources"
                ? "border-slate-800 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Sources & Conversions
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === "performance"
                ? "border-slate-800 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Property & Managers
          </button>
        </nav>
      </div>

      {/* Main Reports Content */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {analyticsQuery.isPending ? (
          <div className="py-20 text-center text-slate-500">Loading reports data...</div>
        ) : analyticsQuery.isError ? (
          <div className="py-20 text-center text-rose-500">Could not retrieve analytics. Please try again.</div>
        ) : !analytics ? (
          <div className="py-20 text-center text-slate-500">No report data matches selected filters.</div>
        ) : (
          <div>
            {/* Tab: Occupancy */}
            {activeTab === "occupancy" && (
              <div className="divide-y divide-slate-100">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Total Rooms</th>
                      <th className="px-4 py-3 text-center">Available Nights</th>
                      <th className="px-4 py-3 text-center">Occupied Nights</th>
                      <th className="px-4 py-3 text-right">Occupancy Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {analytics.occupancy.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center" colSpan={5}>No occupancy records for this range.</td>
                      </tr>
                    ) : (
                      analytics.occupancy.map((item) => (
                        <tr key={item.date}>
                          <td className="px-4 py-3 font-semibold text-slate-900">{item.date}</td>
                          <td className="px-4 py-3 text-center">{item.totalRooms}</td>
                          <td className="px-4 py-3 text-center">{item.availableNights}</td>
                          <td className="px-4 py-3 text-center">{item.occupiedNights}</td>
                          <td className="px-4 py-3 text-right font-bold">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-slate-800">{formatPercent(item.occupancyRate)}</span>
                              <div className="hidden h-2 w-16 overflow-hidden rounded bg-slate-100 sm:block">
                                <div
                                  className="h-full bg-slate-700 rounded"
                                  style={{ width: `${item.occupancyRate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Revenue */}
            {activeTab === "revenue" && (
              <div className="divide-y divide-slate-100">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                      <th className="px-4 py-3 text-right">Discounts</th>
                      <th className="px-4 py-3 text-right">Tax</th>
                      <th className="px-4 py-3 text-right">Gross Total</th>
                      <th className="px-4 py-3 text-right">Collected</th>
                      <th className="px-4 py-3 text-right">Refunds</th>
                      <th className="px-4 py-3 text-right text-blue-600">Net Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {analytics.revenue.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center" colSpan={8}>No transactions recorded in this range.</td>
                      </tr>
                    ) : (
                      analytics.revenue.map((item) => (
                        <tr key={item.date}>
                          <td className="px-4 py-3 font-semibold text-slate-900">{item.date}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(item.subtotal)}</td>
                          <td className="px-4 py-3 text-right text-rose-600">-{formatMoney(item.discount)}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(item.tax)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.total)}</td>
                          <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{formatMoney(item.paid)}</td>
                          <td className="px-4 py-3 text-right text-amber-600">-{formatMoney(item.refunds)}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-600">{formatMoney(item.netRevenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Sources & Conversions */}
            {activeTab === "sources" && (
              <div className="p-6 space-y-8">
                {/* Source splits */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-4">Booking Source Splits</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    {analytics.sources.map((item) => {
                      const totalBookings = analytics.conversions.totalBookings;
                      const countPercent = totalBookings === 0 ? 0 : Math.round((item.count / totalBookings) * 100);
                      const totalRev = analytics.sources.reduce((sum, s) => sum + s.revenue, 0);
                      const revPercent = totalRev === 0 ? 0 : Math.round((item.revenue / totalRev) * 100);

                      return (
                        <div key={item.source} className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                          <h4 className="text-sm font-bold tracking-wider text-slate-500 uppercase">{formatEnumLabel(item.source)}</h4>
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-semibold">Bookings Count</p>
                              <p className="text-2xl font-bold mt-1 text-slate-800">{item.count}</p>
                              <p className="text-xs text-slate-500">{countPercent}% of bookings</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-semibold">Revenue Share</p>
                              <p className="text-2xl font-bold mt-1 text-slate-800">{formatMoney(item.revenue)}</p>
                              <p className="text-xs text-slate-500">{revPercent}% of revenue</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Conversion Funnels */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-4">Lead Conversion Funnel</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <article className="rounded-xl border border-slate-200 p-5">
                      <p className="text-sm font-semibold text-slate-800">Public Enquiries</p>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-xs text-slate-500">Received</span>
                          <p className="text-xl font-bold mt-1">{analytics.conversions.totalEnquiries}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Converted</span>
                          <p className="text-xl font-bold mt-1 text-emerald-700">{analytics.conversions.convertedEnquiries}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Conversion Rate</span>
                          <p className="text-xl font-bold mt-1 text-[#3b82f6]">{formatPercent(analytics.conversions.enquiryConversionRate)}</p>
                        </div>
                      </div>
                    </article>

                    <article className="rounded-xl border border-slate-200 p-5">
                      <p className="text-sm font-semibold text-slate-800">Quotes Requests</p>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-xs text-slate-500">Requested</span>
                          <p className="text-xl font-bold mt-1">{analytics.conversions.totalQuotes}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Converted</span>
                          <p className="text-xl font-bold mt-1 text-emerald-700">{analytics.conversions.convertedQuotes}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Conversion Rate</span>
                          <p className="text-xl font-bold mt-1 text-[#3b82f6]">{formatPercent(analytics.conversions.quoteConversionRate)}</p>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Performance */}
            {activeTab === "performance" && (
              <div className="space-y-8">
                {/* Properties */}
                <div>
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-800">Properties Performance Overview</h3>
                  </div>
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-100/50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Property</th>
                        <th className="px-4 py-3 text-center">Rooms</th>
                        <th className="px-4 py-3 text-center">Nights (Avail / Booked)</th>
                        <th className="px-4 py-3 text-right">Occupancy Rate</th>
                        <th className="px-4 py-3 text-right">Gross Revenue</th>
                        <th className="px-4 py-3 text-right">Net Revenue</th>
                        <th className="px-4 py-3 text-right">ADR</th>
                        <th className="px-4 py-3 text-right">RevPAR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {analytics.properties.length === 0 ? (
                        <tr>
                          <td className="px-4 py-8 text-center" colSpan={8}>No properties analytics matching filter.</td>
                        </tr>
                      ) : (
                        analytics.properties.map((item) => (
                          <tr key={item.propertyId}>
                            <td className="px-4 py-3 font-semibold text-slate-900">{item.propertyName}</td>
                            <td className="px-4 py-3 text-center">{item.totalRooms}</td>
                            <td className="px-4 py-3 text-center">{item.availableNights} / {item.occupiedNights}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatPercent(item.occupancyRate)}</td>
                            <td className="px-4 py-3 text-right">{formatMoney(item.grossRevenue)}</td>
                            <td className="px-4 py-3 text-right text-blue-600 font-semibold">{formatMoney(item.netRevenue)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatMoney(item.adr)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatMoney(item.revpar)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Managers */}
                <div>
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-800">Manager & Admin Activities</h3>
                  </div>
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-100/50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3 text-center">Walk-ins Created</th>
                        <th className="px-4 py-3 text-center">Check-ins Processed</th>
                        <th className="px-4 py-3 text-center">Check-outs Processed</th>
                        <th className="px-4 py-3 text-right">Payments Recorded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {analytics.managers.length === 0 ? (
                        <tr>
                          <td className="px-4 py-8 text-center" colSpan={6}>No managers or admins activity log.</td>
                        </tr>
                      ) : (
                        analytics.managers.map((item) => (
                          <tr key={item.managerId}>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{item.managerName}</div>
                              <div className="text-xs text-slate-500">{item.email}</div>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium uppercase text-slate-500">{formatEnumLabel(item.role)}</td>
                            <td className="px-4 py-3 text-center">{item.walkinsCreated}</td>
                            <td className="px-4 py-3 text-center">{item.checkInsProcessed}</td>
                            <td className="px-4 py-3 text-center">{item.checkOutsProcessed}</td>
                            <td className="px-4 py-3 text-right font-medium">{item.paymentsRecorded}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
