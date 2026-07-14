import { ICON_REGISTRY } from "@/configs/iconRegistry";

const {
  FiLayers,
  FiDollarSign,
  FiKey,
} = ICON_REGISTRY;

export function SystemGuidePricingSection() {
  return (
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
  );
}

