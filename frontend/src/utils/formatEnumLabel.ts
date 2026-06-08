const ENUM_LABEL_OVERRIDES: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  GUEST: "Guest",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  NO_SHOW: "No-Show",
  IN_REVIEW: "In Review",
  NON_AC: "Non-AC",
  CARD_POS: "Card / POS",
  UPI_MANUAL: "UPI Manual",
  BANK_TRANSFER: "Bank Transfer",
  ONLINE_GATEWAY: "Online Gateway",
  FULL_PAYMENT: "Full Payment",
  CREDIT_NOTE: "Credit Note",
};

export const formatEnumLabel = (value: string | null | undefined): string => {
  if (!value) return "-";

  const override = ENUM_LABEL_OVERRIDES[value];
  if (override) return override;

  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
};
