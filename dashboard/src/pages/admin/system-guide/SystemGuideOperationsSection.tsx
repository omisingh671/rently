import { ICON_REGISTRY } from "@/configs/iconRegistry";

const {
  FiClipboard,
  FiClock,
  MdMeetingRoom,
  FiDollarSign,
  FiFileText,
  FiCalendar,
  FiInfo,
} = ICON_REGISTRY;

export function SystemGuideOperationsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Operations & Booking Management
        </h1>
        <p className="mt-2 text-slate-500">
          Deep-dive into our core transaction engine: booking
          lifecycles, front-desk operations, cashier reconciliation,
          room/unit assignment rules, folio handling, and the visual
          Room Board.
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

        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
          <h4 className="font-semibold text-slate-950">
            Front-Desk Operations Board
          </h4>
          <p className="text-xs text-slate-600">
            The operations board follows the selected property timezone
            and business date. It groups arrivals, departures,
            in-house guests, late arrivals, unassigned stays,
            balance-due bookings, refund attention, housekeeping work,
            and maintenance conflicts into one daily cockpit.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
          <h4 className="font-semibold text-slate-950">
            Folio, Housekeeping & Maintenance Controls
          </h4>
          <p className="text-xs text-slate-600">
            Booking details support audited folio charges, voids,
            housekeeping transitions, maintenance conflict checks,
            emergency maintenance overrides, and status corrections
            with required notes where operational risk is higher.
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
                administrative reason note. Check-in also verifies the
                arrival date, identity confirmation, inspected room
                readiness, and balance-due override notes when needed.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <MdMeetingRoom className="text-purple-500 w-3.5 h-3.5" />
                <span>2. Room Allocation Mapping</span>
              </p>
              <p className="mt-1 text-slate-600">
                For <code>CONFIRMED</code> bookings, administrators can
                allocate a specific physical room or a complete unit to
                the stay. Single-room and multi-room bookings require
                exact concrete room assignments. Whole-unit bookings
                keep their <code>UNIT</code> assignment and display the
                assigned unit with all child rooms, such as Unit 300
                (300-A, 300-B, 300-C). During check-in the backend
                expands that unit into its concrete rooms for
                availability and housekeeping validation without
                reducing the booking to one room.
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
                input the payment amount, method, received date,
                optional payer detail, and required reference proof for
                referenced offline methods. Successful payments feed the
                cashier summary and booking balance immediately.
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

      {/* Front Desk Operations Board */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <FiCalendar className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Front-Desk Operations Board & Cashier History
            </h3>
            <p className="text-xs text-slate-500">
              Daily operating view for arrivals, attention queues,
              employee collections, and payment/refund history.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
            <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
              1. Business-Date Summary
            </p>
            <p>
              The board follows the selected property timezone and
              business date. Summary counters surface arrivals,
              departures, in-house guests, late arrivals, unassigned
              bookings, outstanding balances, refund attention,
              housekeeping work, and maintenance conflicts.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
            <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
              2. Immediate Attention Queues
            </p>
            <p>
              Late arrivals, bookings without assignments, dirty or
              cleaning rooms, and maintenance conflicts are grouped as
              actionable queues. Operators can jump directly from these
              rows into the booking detail or room-board workflow.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
            <p className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
              3. Cashier By Employee
            </p>
            <p>
              The cashier card shows a grand total and employee-level
              rows by method, expected cash, refunds, and net
              collection. Employee rows are visible by default; each row
              expands to a scrollable <strong>Payment History</strong>{" "}
              list so long histories stay inside the card.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-950">
          <div className="flex gap-2">
            <FiInfo className="text-indigo-600 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              Cashier history contains both payments and refunds with
              booking reference, guest name, method, timestamp, and
              signed amount. It is designed for repeated front-desk
              reconciliation without hiding employee rows behind a
              global details toggle.
            </p>
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
              <li><strong>CHECKED_IN:</strong> Guest check-in has been completed after identity, assignment, inspection, date, and balance checks pass.</li>
              <li><strong>CHECKED_OUT:</strong> The stay is completed and closed. Occupied rooms are marked dirty for housekeeping follow-up.</li>
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
  );
}

