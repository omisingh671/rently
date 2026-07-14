export const E2E = {
  password: process.env.E2E_PASSWORD ?? "E2eOnly@12345",
  guestEmail: "guest.e2e@rently.test",
  managerEmail: "manager.e2e@rently.test",
  tenantSlug: "e2e-rently",
  propertyName: "Hyderabad E2E Residence",
  otherPropertyId: "00000000-0000-4000-8000-000000000002",
  backendUrl: "http://127.0.0.1:4100",
  frontendUrl: "http://127.0.0.1:4173",
  dashboardUrl: "http://127.0.0.1:4174",
} as const;

export const isoDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const propertyIsoDate = (offsetDays = 0) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
