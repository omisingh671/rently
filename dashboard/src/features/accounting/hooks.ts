import { useQuery } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { getReconciliationApi, listJournalApi } from "./api";
import type { AccountingQuery } from "./types";

export const useAccountingJournal = (params: AccountingQuery, enabled: boolean) =>
  useQuery({
    queryKey: ADMIN_KEYS.accounting.journal(params),
    queryFn: () => listJournalApi(params),
    enabled,
  });

export const useAccountingReconciliation = (params: AccountingQuery, enabled: boolean) =>
  useQuery({
    queryKey: ADMIN_KEYS.accounting.reconciliation(params),
    queryFn: () => getReconciliationApi(params),
    enabled,
  });
