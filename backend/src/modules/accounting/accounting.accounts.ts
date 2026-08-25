import {
  LedgerAccountType,
  LedgerNormalBalance,
  LedgerSystemKey,
  PaymentMethod,
} from "@/generated/prisma/client.js";

export const systemAccountDefinitions = [
  [
    LedgerSystemKey.CASH,
    "1000",
    "Cash",
    LedgerAccountType.ASSET,
    LedgerNormalBalance.DEBIT,
  ],
  [
    LedgerSystemKey.BANK_CLEARING,
    "1010",
    "Bank clearing",
    LedgerAccountType.CLEARING,
    LedgerNormalBalance.DEBIT,
  ],
  [
    LedgerSystemKey.CARD_CLEARING,
    "1020",
    "Card clearing",
    LedgerAccountType.CLEARING,
    LedgerNormalBalance.DEBIT,
  ],
  [
    LedgerSystemKey.UPI_CLEARING,
    "1030",
    "UPI clearing",
    LedgerAccountType.CLEARING,
    LedgerNormalBalance.DEBIT,
  ],
  [
    LedgerSystemKey.ONLINE_GATEWAY_CLEARING,
    "1040",
    "Online gateway clearing",
    LedgerAccountType.CLEARING,
    LedgerNormalBalance.DEBIT,
  ],
  [
    LedgerSystemKey.MANUAL_SETTLEMENT_CLEARING,
    "1090",
    "Manual settlement clearing",
    LedgerAccountType.CLEARING,
    LedgerNormalBalance.DEBIT,
  ],
  [
    LedgerSystemKey.GUEST_RECEIVABLE,
    "1100",
    "Guest receivable",
    LedgerAccountType.ASSET,
    LedgerNormalBalance.DEBIT,
  ],
  [
    LedgerSystemKey.COMPANY_RECEIVABLE,
    "1110",
    "Company receivable",
    LedgerAccountType.ASSET,
    LedgerNormalBalance.DEBIT,
  ],
  [
    LedgerSystemKey.GUEST_DEPOSIT_LIABILITY,
    "2000",
    "Guest deposits",
    LedgerAccountType.LIABILITY,
    LedgerNormalBalance.CREDIT,
  ],
  [
    LedgerSystemKey.GST_OUTPUT,
    "2100",
    "GST output",
    LedgerAccountType.LIABILITY,
    LedgerNormalBalance.CREDIT,
  ],
  [
    LedgerSystemKey.OTHER_TAX_PAYABLE,
    "2110",
    "Other tax payable",
    LedgerAccountType.LIABILITY,
    LedgerNormalBalance.CREDIT,
  ],
  [
    LedgerSystemKey.ROOM_REVENUE,
    "4000",
    "Room revenue",
    LedgerAccountType.REVENUE,
    LedgerNormalBalance.CREDIT,
  ],
  [
    LedgerSystemKey.FOLIO_REVENUE,
    "4010",
    "Folio revenue",
    LedgerAccountType.REVENUE,
    LedgerNormalBalance.CREDIT,
  ],
  [
    LedgerSystemKey.OTHER_REVENUE,
    "4090",
    "Other revenue",
    LedgerAccountType.REVENUE,
    LedgerNormalBalance.CREDIT,
  ],
  [
    LedgerSystemKey.REFUND_CLEARING,
    "5000",
    "Refund clearing",
    LedgerAccountType.CLEARING,
    LedgerNormalBalance.DEBIT,
  ],
  [
    LedgerSystemKey.CASH_VARIANCE,
    "5010",
    "Cash variance",
    LedgerAccountType.EXPENSE,
    LedgerNormalBalance.DEBIT,
  ],
] as const;

export const tenderAccountForMethod = (
  method: PaymentMethod,
): LedgerSystemKey => {
  switch (method) {
    case PaymentMethod.CASH:
      return LedgerSystemKey.CASH;
    case PaymentMethod.BANK_TRANSFER:
      return LedgerSystemKey.BANK_CLEARING;
    case PaymentMethod.CARD_POS:
      return LedgerSystemKey.CARD_CLEARING;
    case PaymentMethod.UPI_MANUAL:
      return LedgerSystemKey.UPI_CLEARING;
    case PaymentMethod.ONLINE_GATEWAY:
      return LedgerSystemKey.ONLINE_GATEWAY_CLEARING;
    case PaymentMethod.MANUAL:
      return LedgerSystemKey.MANUAL_SETTLEMENT_CLEARING;
  }
};
