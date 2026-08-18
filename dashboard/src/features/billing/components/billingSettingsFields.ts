import type {
  BillingSetting,
  BillingSettingSnapshot,
} from "@/features/billing/types";

export type BillingSettingsFormState = {
  legalName: string;
  gstin: string;
  pan: string;
  billingAddress: string;
  invoicePrefix: string;
  receiptPrefix: string;
  creditNotePrefix: string;
  debitNotePrefix: string;
  footerNotes: string;
  stateCode: string;
  sacCode: string;
};

export const BILLING_SETTING_FIELD_LABELS: Record<
  keyof BillingSettingsFormState,
  string
> = {
  legalName: "Legal name",
  gstin: "GSTIN",
  pan: "PAN",
  billingAddress: "Billing address",
  invoicePrefix: "Invoice prefix",
  receiptPrefix: "Receipt prefix",
  creditNotePrefix: "Credit note prefix",
  debitNotePrefix: "Debit note prefix",
  footerNotes: "Footer notes",
  stateCode: "Supplier state code",
  sacCode: "SAC code",
};

export const toBillingSettingsFormState = (
  setting: BillingSetting | BillingSettingSnapshot,
): BillingSettingsFormState => ({
  legalName: setting.legalName ?? "",
  gstin: setting.gstin ?? "",
  pan: setting.pan ?? "",
  billingAddress: setting.billingAddress ?? "",
  invoicePrefix: setting.invoicePrefix,
  receiptPrefix: setting.receiptPrefix,
  creditNotePrefix: setting.creditNotePrefix,
  debitNotePrefix: setting.debitNotePrefix,
  footerNotes: setting.footerNotes ?? "",
  stateCode: setting.stateCode ?? "",
  sacCode: setting.sacCode,
});

export const getChangedBillingSettingFields = (
  previous: BillingSettingsFormState,
  next: BillingSettingsFormState,
) =>
  (
    Object.keys(BILLING_SETTING_FIELD_LABELS) as Array<
      keyof BillingSettingsFormState
    >
  ).filter((field) => previous[field] !== next[field]);
