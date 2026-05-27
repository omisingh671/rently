import type { BillingDocumentDTO, BillingSettingDTO } from "./billing.dto.js";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatMoney = (value: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "-";

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];

export const buildBillingDocumentHtml = (
  document: BillingDocumentDTO,
  setting: BillingSettingDTO,
) => {
  const guest = asRecord(document.guestSnapshot);
  const booking = asRecord(document.bookingSnapshot);
  const property = asRecord(document.propertySnapshot);
  const payment = asRecord(document.paymentSnapshot);
  const lineItems = asArray(document.lineItems);
  const title =
    document.type === "INVOICE"
      ? "Tax Invoice"
      : document.type === "RECEIPT"
        ? "Payment Receipt"
        : "Credit Note";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; }
      .page { padding: 36px; }
      .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 18px; }
      .brand { font-size: 22px; font-weight: 700; }
      .muted { color: #64748b; }
      .title { text-align: right; }
      .title h1 { margin: 0 0 8px; font-size: 26px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 24px; }
      .box { border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; }
      .box h2 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; vertical-align: top; }
      th { background: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; }
      .num { text-align: right; white-space: nowrap; }
      .totals { margin-left: auto; margin-top: 18px; width: 280px; }
      .totals div { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e2e8f0; }
      .totals .grand { font-weight: 700; font-size: 15px; border-bottom: 2px solid #0f172a; }
      .footer { margin-top: 34px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #64748b; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="header">
        <div>
          <div class="brand">${escapeHtml(setting.legalName ?? property.name ?? "Rently")}</div>
          <div class="muted">${escapeHtml(setting.billingAddress ?? property.address ?? "")}</div>
          <div class="muted">${escapeHtml(property.city ?? "")}${property.state ? `, ${escapeHtml(property.state)}` : ""}</div>
          ${setting.gstin ? `<div>GSTIN: ${escapeHtml(setting.gstin)}</div>` : ""}
          ${setting.pan ? `<div>PAN: ${escapeHtml(setting.pan)}</div>` : ""}
        </div>
        <div class="title">
          <h1>${escapeHtml(title)}</h1>
          <div><strong>${escapeHtml(document.documentNumber)}</strong></div>
          <div class="muted">Issued: ${escapeHtml(formatDate(document.issuedAt))}</div>
          <div class="muted">Status: ${escapeHtml(document.status)}</div>
        </div>
      </section>

      <section class="grid">
        <div class="box">
          <h2>Guest</h2>
          <div><strong>${escapeHtml(guest.name)}</strong></div>
          <div>${escapeHtml(guest.email)}</div>
          <div>${escapeHtml(guest.contactNumber)}</div>
        </div>
        <div class="box">
          <h2>Booking</h2>
          <div>Ref: <strong>${escapeHtml(booking.bookingRef)}</strong></div>
          <div>Stay: ${escapeHtml(formatDate(String(booking.checkIn ?? "")))} - ${escapeHtml(formatDate(String(booking.checkOut ?? "")))}</div>
          ${payment.id ? `<div>Payment: ${escapeHtml(payment.method)} / ${escapeHtml(payment.purpose)}</div>` : ""}
        </div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="num">Qty</th>
            <th class="num">Rate</th>
            <th class="num">Tax</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems
            .map(
              (item) => `<tr>
                <td><strong>${escapeHtml(item.description)}</strong><br /><span class="muted">${escapeHtml(item.targetLabel)}</span></td>
                <td class="num">${escapeHtml(item.quantity)}</td>
                <td class="num">${formatMoney(String(item.rate ?? 0))}</td>
                <td class="num">${formatMoney(String(item.tax ?? 0))}</td>
                <td class="num">${formatMoney(String(item.total ?? 0))}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>

      <section class="totals">
        <div><span>Subtotal</span><strong>${formatMoney(document.subtotal)}</strong></div>
        <div><span>Discount</span><strong>${formatMoney(document.discount)}</strong></div>
        <div><span>Taxable</span><strong>${formatMoney(document.taxable)}</strong></div>
        <div><span>Tax</span><strong>${formatMoney(document.tax)}</strong></div>
        <div class="grand"><span>Total</span><span>${formatMoney(document.total)}</span></div>
        <div><span>Paid</span><strong>${formatMoney(document.paid)}</strong></div>
        <div><span>Balance</span><strong>${formatMoney(document.balance)}</strong></div>
      </section>

      <section class="footer">
        ${document.notes ? `<p>${escapeHtml(document.notes)}</p>` : ""}
        ${setting.footerNotes ? `<p>${escapeHtml(setting.footerNotes)}</p>` : ""}
      </section>
    </main>
  </body>
</html>`;
};
