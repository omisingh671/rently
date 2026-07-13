import { ICON_REGISTRY } from "@/configs/iconRegistry";

const {
  FiMessageSquare,
  FiFileText,
} = ICON_REGISTRY;

export function SystemGuideLeadsSection() {
  return (
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
  );
}

