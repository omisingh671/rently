# Rently Financial Posting Design

Status: Phase 0 accepted; Phase 1 implemented locally on 2026-08-25

Scope: Phase 1 runtime, local schema/migration SQL, isolated verification, and read-only dashboard UI. No deployment or production execution.

## 1. Decision this document makes

Rently should add accounting as an append-only projection of the existing operational records. `Booking`, `Payment`, `PaymentRefund`, `BookingFolioCharge`, `BillingDocument`, `GroupFolioCharge`, and `PropertyDailyClose` remain the operational sources of truth.

The future ledger must:

- create one deterministic financial event per source transition;
- create balanced, immutable journal entries from those events;
- reverse entries instead of editing or deleting them;
- retain property, tenant, business date, currency, booking/group/company, actor, source record, and correlation context;
- remain reconcilable to the existing booking balance calculation;
- never calculate or write a second booking balance.

This proposal recognizes revenue when an invoice, debit note, or credit note is issued. Payments received before an invoice are guest deposits. A receipt and a daily close are evidence/control records and must not create duplicate journal entries.

## 2. Current operational balance remains authoritative

The current balance path is intentionally unchanged:

```text
operational balance
  = booking.totalAmount
  + sum(ACTIVE booking folio charges)
  - sum(SUCCEEDED payments)
  + sum(SUCCEEDED refunds)
```

Cancelled and no-show bookings are presented as non-collectible by the current booking mappers. The ledger must not replace this product behavior. It provides accounting history and reconciliation only.

Primary current owners:

- payment acceptance and gateway finalization: `backend/src/modules/payments/payments.service.ts`
- refunds: `backend/src/modules/bookings/bookings.payments.ts`
- folio charges and reversals: `backend/src/modules/bookings/bookings.folio.ts`
- lifecycle charges/no-show: `backend/src/modules/bookings/bookings.lifecycle.ts`
- stay extensions and room moves: `backend/src/modules/bookings/bookings.stay-extension.ts` and `bookings.room-move.ts`
- invoices, receipts, credit notes, and debit notes: `backend/src/modules/billing/billing.service.ts`
- group folio: `backend/src/modules/commercial/commercial.service.ts`
- business-date close: `backend/src/modules/reporting/reporting.service.ts`

## 3. Current financial-event map

`BD` below means the event timestamp converted once to the property's tenant timezone and stored as an immutable business date.

| # | Flow and current owner | Operational record and amount/tax | Scope, actor, reversal, idempotency, and audit |
|---:|---|---|---|
| 1 | Public token payment; `createManualPayment`, gateway intent/finalization | `Payment`, purpose `TOKEN`; server-owned upfront amount; payment itself has no tax split | `propertyId`, `bookingId`, guest `userId`; gateway finalization may be system/webhook initiated; BD from `paidAt`; reverse through `PaymentRefund`; unique payment idempotency key and provider identifiers; receipt/payment metadata and webhook inbox provide evidence. |
| 2 | Full public payment; same payment service | `Payment`, purpose `FULL_PAYMENT`; server-owned current balance; no tax split | Same safeguards as token payment. It is still a deposit if no invoice existed immediately before it. |
| 3 | Dashboard/manual balance payment; same payment service | `Payment`, purpose `BALANCE`; amount supplied by staff but capped by server balance | `receivedByUserId`/actor metadata identify staff; BD from `paidAt`; unique idempotency key; manual proof metadata; reversible only through `PaymentRefund`. |
| 4 | Partial payment; dashboard branch of manual payment | Same `Payment`; positive amount up to balance | Same as #3. Public callers cannot choose an arbitrary partial amount. Multiple payments are valid; each payment ID is a separate event. |
| 5 | Refund; `recordBookingRefundForBooking` and gateway refund completion | `PaymentRefund`; amount is bounded by remaining refundable amount; no independent tax split | Links booking, original payment, property, guest, optional refund request, and staff actor in metadata; BD from `processedAt`; unique idempotency key/provider refund ID; only `SUCCEEDED` posts. No reverse-refund model exists today. |
| 6 | Booking cancellation with possible refund; public booking service and dashboard lifecycle | `Booking` status/timestamps plus `BookingStatusHistory`; optional `BookingRefundRequest`; cancellation does not create a `PaymentRefund` | Property/booking/guest or staff actor are retained; optimistic booking version protects transition; refund is a later explicit workflow. Cancellation alone is non-posting. Existing issued revenue is not automatically credited today. |
| 7 | No-show; `markBookingNoShowInTransaction` | `Booking`, `BookingStatusHistory`, and `BookingOperationEvent(NO_SHOW)`; no financial amount | Actor, property, booking, timestamp, and note are retained; lifecycle reversal can return to confirmed; any refund is separate. No-show alone is non-posting and no retained-fee revenue event exists. |
| 8 | Folio incidental/penalty/adjustment; `createBookingFolioChargeInTransaction` | Positive `BookingFolioCharge`; generic charges do not carry a reliable base/tax split | Property, booking, creator, note, and operation event are retained; BD from `createdAt`; optimistic booking version reduces concurrent duplicates but there is no charge idempotency key. If an invoice exists, a debit note is attempted. |
| 9 | Folio void; `voidBookingFolioChargeInTransaction` | Existing charge changes from `ACTIVE` to `VOID`; original row and amount remain | Voider, reason, timestamp, operation event, and reversal document ID are retained; repeated calls currently return not-found after the first void; a reversal note is created only if a related issued debit/credit note exists. |
| 10 | Early check-in fee; `checkInBookingInTransaction` | `BookingFolioCharge(ADJUSTMENT)` with policy fingerprint/snapshot; tax split is not explicit | Same transaction as versioned check-in; actor and check-in audit exist. The check-in event records the fee but not the charge ID. No debit note is created when an invoice already exists; this is a Phase 1 blocker. |
| 11 | Late-checkout extension; `ensureLateCheckoutExtensionCharge` | `BookingFolioCharge(EXTENSION)` with base, tax, total, tax breakdown, tariff, and policy snapshot | Property/booking/creator; BD from `createdAt`; exact-stay metadata matching makes creation repeat-safe, and a prior void is treated as an audited waiver; debit note is attempted after an invoice exists. |
| 12 | Room upgrade; `createRoomMoveAdjustmentCharge` | Positive `BookingFolioCharge(ADJUSTMENT)` with base/tax differences and pricing fingerprint | Same versioned room-move transaction; actor and room-move operation event link the charge; debit note after an invoice; no standalone charge idempotency key. |
| 13 | Room downgrade credit; same room-move owner | Negative `BookingFolioCharge(ADJUSTMENT)` with base/tax differences | Same scope/audit as #12; credit note after an invoice; before invoice the signed charge is included in the later invoice. |
| 14 | Invoice; `createInvoiceForBooking` | `BillingDocument(INVOICE)` with frozen booking/property/tenant/guest/price/tax/line snapshots | Requires full operational payment; unique `documentKey` per booking and property document number; BD from `issuedAt`; source actor is not stored; void changes document status but currently creates no accounting reversal. |
| 15 | Receipt; `createReceiptForPayment` | `BillingDocument(RECEIPT)` for one successful payment; tax is zero | Unique `documentKey` per payment; BD follows `paidAt`; payment snapshot retained. It is evidence only: posting it would duplicate the payment journal. |
| 16 | Credit note; folio credit or debit-note reversal | `BillingDocument(CREDIT_NOTE)` linked to booking and folio charge, with frozen values | Unique key derived from folio charge; BD from `issuedAt`; creator actor is not stored on the document. It reverses revenue/tax/guest control; voiding the document currently has no journal reversal. |
| 17 | Debit note; folio charge or credit-note reversal | `BillingDocument(DEBIT_NOTE)` linked to booking and folio charge, with frozen values | Same controls as #16. Metadata keys are not consistent across all extension sources, so tax can fall back to zero incorrectly. |
| 18 | Group folio charge/void; commercial service | `GroupFolioCharge` with signed amount/status, creator, voider, reason, and property | Property/group/company context and `PropertyAuditEvent` exist; daily-close guard applies; no idempotency key, billing document, payment allocation, tax split, or AR settlement record exists. It must remain non-posting until group/company billing is designed. |
| 19 | Daily close; `closePropertyBusinessDate` | `PropertyDailyClose` snapshots successful payment/refund counts and totals plus operational counts | Unique property/business-date row, closer, note, and property audit; repeat/concurrent calls return the same close. It is a control boundary, not a summarized journal source. |

## 4. Blocking fidelity gaps before ledger posting

Financial dual-write must not start until every item is complete. Slice 1 resolved the first document-fidelity subset:

1. **Complete:** folio amounts now resolve through one canonical base/tax/total/component reader. New charge sources store canonical keys, while legacy `baseDifference`/`taxDifference` records remain supported and mismatched snapshots fail closed.
2. **Complete:** early-check-in fees retain the created charge ID in check-in audit metadata and create the idempotent debit note when an invoice already exists.
3. **Complete:** invoice eligibility and its paid/balance snapshot use net paid after successful refunds.
4. **Complete:** a successful refund against an issued invoice creates an immutable refund credit note before the refund journal is posted. Cancellation by itself remains non-posting.
5. **Complete:** invoice retries return the existing issued snapshot; the legacy mutation branch was removed.
6. **Complete:** directly voiding an issued billing document captures the actor and atomically reverses both document recognition and any deposit application.
7. **Complete:** dashboard refund requests require a caller idempotency key; the dashboard generates one request key and retrying the same payload reuses it.
8. **Complete:** daily-close monetary aggregation uses `Prisma.Decimal` through persistence and converts only at the DTO boundary.
9. Group folio requires a billing party, tax policy, document, settlement/allocation, and reversal contract before company AR can post.
10. Historical records with missing timestamps, actors, tax breakdowns, or document relationships must be reported for review rather than silently guessed.

## 5. Canonical event contract for Phase 1

Every future event should carry the following immutable envelope. Names are a design contract, not a schema change in this phase.

```text
eventType
eventVersion
sourceType
sourceId
sourceTransition                 // for example SUCCEEDED or ISSUED
idempotencyKey                   // unique: fin:v1:<sourceType>:<sourceId>:<transition>
occurredAt
businessDate
tenantId
propertyId
currency
amount
taxAmount
bookingId?
bookingGroupId?
companyId?
actorKind                        // USER, GUEST, WEBHOOK, SYSTEM, BACKFILL
actorUserId?
correlationId?
reversalOfEventId?
sourceSnapshot                   // only accounting-relevant frozen values
```

Rules:

- A source transition and its event/journal are committed in the same database transaction where the current code already owns a transaction.
- Gateway events post only after the operational record reaches `SUCCEEDED`.
- The unique event key is derived from the source record, never from a random retry-time value.
- Reprocessing returns the existing event and journal after verifying source, amount, currency, property, and transition match.
- `businessDate` is calculated once from the effective timestamp and property timezone. It is never recomputed after a timezone/configuration change.
- Journal lines use decimal database values only. JavaScript `number` must not be used for accounting arithmetic.

### Posting event keys

Initial keys:

- `BOOKING_DEPOSIT_RECEIVED`
- `BOOKING_PAYMENT_RECEIVED`
- `BOOKING_REFUND_SUCCEEDED`
- `BOOKING_INVOICE_ISSUED`
- `BOOKING_DEBIT_NOTE_ISSUED`
- `BOOKING_CREDIT_NOTE_ISSUED`
- `BILLING_DOCUMENT_VOIDED`

Reserved for later phases:

- `COMPANY_DIRECT_BILL`
- `COMPANY_PAYMENT_RECEIVED`
- `COMPANY_PAYMENT_ALLOCATED`
- `CASH_VARIANCE_POSTED`
- `MANUAL_FINANCIAL_ADJUSTMENT`

Operational/control keys such as cancellation, no-show, folio charge creation, receipt issuance, and daily close completion may be recorded in the event stream but are `NON_POSTING`. `ROOM_REVENUE_POSTED`, `TAX_POSTED`, `FOLIO_CHARGE_POSTED`, and `FOLIO_CHARGE_REVERSED` are journal line classifications derived from the invoice/note source event, not additional independent journals. This prevents the same revenue from being posted twice.

## 6. Initial chart of accounts

The ledger is property-scoped. Tenant consolidation is a read/reporting dimension, not a reason to remove property identity.

| Code | Key | Type | Use |
|---:|---|---|---|
| 1100 | `CASH_ON_HAND` | Asset | Successful manual cash receipts/refunds. |
| 1110 | `BANK_TRANSFER_CLEARING` | Asset | Manual bank-transfer settlement. |
| 1120 | `UPI_CLEARING` | Asset | Manual UPI settlement. |
| 1130 | `CARD_POS_CLEARING` | Asset | Manual card/POS settlement. |
| 1140 | `ONLINE_GATEWAY_CLEARING` | Asset | Successful gateway collections/refunds before bank reconciliation. |
| 1150 | `MANUAL_SETTLEMENT_CLEARING` | Asset | Existing generic `MANUAL` method until it is reconciled to a specific tender method. |
| 1200 | `GUEST_RECEIVABLE_CONTROL` | Asset/control | Invoices, debit notes, credit notes, payments, and refunds by booking. Temporary credit balances represent guest credit due. |
| 1210 | `COMPANY_RECEIVABLE_CONTROL` | Asset/control | Reserved for Phase 2 company AR; no posting in Phase 1. |
| 2100 | `GUEST_DEPOSIT_LIABILITY` | Liability | Successful money received before an invoice/note creates receivable. |
| 2200 | `OUTPUT_TAX_PAYABLE` | Liability/control | Output tax, with component/rate/jurisdiction dimensions from the frozen tax snapshot. |
| 4100 | `ROOM_REVENUE` | Revenue | Gross accommodation revenue from issued invoice lines. |
| 4110 | `FOLIO_INCIDENTAL_REVENUE` | Revenue | Generic incidental/penalty folio base amounts. |
| 4120 | `STAY_EXTENSION_REVENUE` | Revenue | Early/late checkout and stay-extension base amounts. |
| 4130 | `ROOM_ADJUSTMENT_REVENUE` | Revenue | Room upgrade/downgrade base differences. |
| 4190 | `ACCOMMODATION_DISCOUNT` | Contra revenue | Frozen booking discount, posted separately so gross-to-net reconciles. |
| 4900 | `MANUAL_ADJUSTMENT_CLEARING` | Control | Reserved; restricted and always requires reason/approval in a later phase. |

Payment method selects the tender account. A mapping must be configuration-backed and fail closed if a new method is introduced without an account mapping.

## 7. Posting rules

### 7.1 Payment received before an invoice

```text
Dr tender/clearing account             payment amount
  Cr GUEST_DEPOSIT_LIABILITY           payment amount
```

`TOKEN` always uses `BOOKING_DEPOSIT_RECEIVED`. `BALANCE` and `FULL_PAYMENT` use `BOOKING_PAYMENT_RECEIVED`; whether the credit goes to deposit or receivable is determined by issued billing documents immediately before that payment transition.

### 7.2 Invoice issued

For the frozen invoice:

```text
Dr GUEST_RECEIVABLE_CONTROL            invoice total
Dr ACCOMMODATION_DISCOUNT              booking discount
  Cr ROOM_REVENUE                      gross room subtotal
  Cr mapped folio revenue              folio base amounts
  Cr OUTPUT_TAX_PAYABLE                frozen tax components
```

Then apply existing unapplied booking deposits, up to the invoice receivable:

```text
Dr GUEST_DEPOSIT_LIABILITY             applied amount
  Cr GUEST_RECEIVABLE_CONTROL          applied amount
```

Both sections belong to the one `BOOKING_INVOICE_ISSUED` journal transaction. Signed line math must balance exactly. Rounding differences are rejected; they are not posted to an unexplained account.

### 7.3 Payment received after an invoice/debit note

```text
Dr tender/clearing account             payment amount
  Cr GUEST_RECEIVABLE_CONTROL          payment amount
```

Allocation is booking-scoped and oldest-issued-document first. A payment cannot be allocated across another property.

### 7.4 Debit note

```text
Dr GUEST_RECEIVABLE_CONTROL            note total
  Cr mapped revenue                    note base
  Cr OUTPUT_TAX_PAYABLE                note tax
```

### 7.5 Credit note

```text
Dr mapped revenue                      note base
Dr OUTPUT_TAX_PAYABLE                  note tax
  Cr GUEST_RECEIVABLE_CONTROL          note total
```

### 7.6 Successful refund

If it returns an unapplied deposit:

```text
Dr GUEST_DEPOSIT_LIABILITY             refund amount
  Cr tender/clearing account           refund amount
```

If it returns an invoiced/credited amount:

```text
Dr GUEST_RECEIVABLE_CONTROL            refund amount
  Cr tender/clearing account           refund amount
```

The refund must allocate against the original payment and the booking's available deposit/credit position. A refund must never directly debit revenue or tax; the required credit note does that first.

### 7.7 Folio timing

- Before invoice: a folio charge/credit is operational and non-posting; the later invoice includes it once.
- After invoice: the idempotent debit/credit note is the posting source.
- Void before invoice: no journal; the inactive charge is excluded from the invoice.
- Void after note: an opposite note and reversing journal are required.

### 7.8 Receipt and daily close

- Receipt: no journal. Reconcile one receipt to one successful payment.
- Daily close: no journal. It freezes the property/business-date control totals and prevents later operational posting into that closed date.
- A later cashier close may create `CASH_VARIANCE_POSTED` only for an approved counted-versus-system variance, never for the whole day's cash total.

## 8. Reversal rules

1. Posted journal entries are immutable.
2. A reversal creates a new event and journal with equal opposite lines, `reversalOfEventId`, its own actor/reason/timestamp/business date, and the original source reference.
3. Reversing a folio charge after billing uses the issued opposite billing note as the source.
4. Voiding an invoice/note reverses its journal and any deposit application in the same accounting transaction. It does not delete the original document or journal.
5. A lifecycle reversal (for example no-show back to confirmed) is non-posting unless it also reverses an independently posted billing document.
6. A failed/pending/cancelled payment or refund never posts. A later success posts once; a later provider status correction must be an explicit reversal/correction event.

## 9. Reconciliation contract

Each reconciliation runs by property and business date, with drill-down to booking and source record.

Required checks:

1. Every posting-eligible source transition has exactly one financial event and one balanced journal transaction.
2. Every journal transaction has total debits equal total credits and a valid property/source.
3. Successful payments by method equal tender-account debits; successful refunds equal tender-account credits.
4. Booking deposit liability plus guest-control balance reconciles to the same source payments, refunds, and issued billing documents used by the operational flow.
5. Issued invoice/debit-note totals minus credit-note/reversal totals reconcile to journal revenue, discount, tax, and guest-control lines.
6. Receipt IDs reconcile one-to-one with successful payments but do not add ledger value.
7. Daily-close payment/refund counts and totals reconcile to successful `paidAt`/`processedAt` events in the stored property business date.
8. Any missing event, duplicate, property mismatch, tax mismatch, actor gap, or amount difference appears in an exception report; reconciliation never auto-edits operational data.

The reconciliation report must show the raw operational formula even when the UI clamps a cancelled/no-show booking balance to zero.

## 10. Migration and backfill approach for a later phase

No migration or backfill is part of Phase 0.

When approved later:

1. Add append-only event/journal tables and constraints in a reviewed migration. DevOps will manually execute the reviewed SQL in production; application tooling must not run production migrations.
2. Deploy journal creation in shadow mode: operational writes remain authoritative, journals are created in the same database transaction, and reconciliation is observed before any accounting UI depends on them.
3. Backfill property by property with a dry-run first. Read immutable/frozen sources in chronological order: successful payments, issued/voided billing documents, successful refunds, and document reversals.
4. Use deterministic keys such as `fin:v1:PAYMENT:<id>:SUCCEEDED`. The backfill can safely resume and rerun.
5. Prefer `paidAt`, `issuedAt`, `processedAt`, and `voidedAt`; use `createdAt` only as a flagged legacy fallback.
6. Use billing-document snapshots for historical revenue/tax. Do not reconstruct an old invoice from the current mutable booking.
7. Do not independently backfill folio charges already included in an invoice. Only issued debit/credit notes after the invoice post separately.
8. Quarantine ambiguous legacy rows instead of guessing tax, actor, property, currency, or allocation.
9. Require zero unexplained reconciliation difference before enabling reports that treat the ledger as available.

## 11. Phase 1 implementation boundary

Implementation result (2026-08-25): the append-only tenant chart of accounts,
balanced journal entries/lines, deterministic payment/document/refund posting,
deposit application, void reversals, dry-run-first backfill utility,
property-scoped reconciliation API, and Billing-page journal drilldown are now
implemented locally. Company/group AR remains deliberately non-posting for
Phase 2. The migration SQL is a DevOps handoff and has only been executed by
Codex against `rently_gate0_e2e`.

Phase 1 did not start company AR, cashier shifts, bank reconciliation, budgeting, or tenant consolidation.

Phase 1 should be split into reviewable steps:

1. tax/document fidelity fixes and focused tests;
2. append-only event/journal schema plus reviewed SQL handoff;
3. payment/refund posting with idempotency tests;
4. invoice/note posting and reversal tests;
5. dry-run reconciliation and isolated `_e2e` validation;
6. shadow-mode rollout documentation.

No Docker, deployment, GitHub Actions, Redis, production database access, or automatic production migration is required by this design.
