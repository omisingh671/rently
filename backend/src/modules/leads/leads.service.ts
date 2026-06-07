import { HttpError } from "@/common/errors/http-error.js";
import {
  getActor,
  assertPropertyInScope,
} from "@/common/services/scoping.service.js";
import * as repo from "./leads.repository.js";
import { mapEnquiry, mapQuote } from "./leads.mapper.js";
import { normalizePaginationResult } from "@/common/types/pagination.js";
import type {
  DashboardLeadListInput,
  UpdateDashboardLeadInput,
} from "./leads.inputs.js";
import type { DashboardEnquiryDTO, DashboardQuoteDTO } from "./leads.dto.js";

const ensureEnquiryExists = async (enquiryId: string) => {
  const enquiry = await repo.findEnquiryById(enquiryId);
  if (!enquiry) {
    throw new HttpError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found");
  }
  return enquiry;
};

const ensureQuoteExists = async (quoteId: string) => {
  const quote = await repo.findQuoteById(quoteId);
  if (!quote) {
    throw new HttpError(404, "QUOTE_NOT_FOUND", "Quote not found");
  }
  return quote;
};

export const listEnquiries = async (
  userId: string,
  filters: DashboardLeadListInput,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, filters.propertyId);

  const { items, total } = await repo.listEnquiriesPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapEnquiry),
  );
};

export const updateEnquiry = async (
  userId: string,
  enquiryId: string,
  input: UpdateDashboardLeadInput,
): Promise<DashboardEnquiryDTO> => {
  const actor = await getActor(userId);
  const enquiry = await ensureEnquiryExists(enquiryId);
  await assertPropertyInScope(actor, enquiry.propertyId);

  const updatedEnquiry = await repo.updateEnquiryById(enquiryId, {
    status: input.status,
  });

  return mapEnquiry(updatedEnquiry);
};

export const listQuotes = async (
  userId: string,
  filters: DashboardLeadListInput,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, filters.propertyId);

  const { items, total } = await repo.listQuotesPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapQuote),
  );
};

export const updateQuote = async (
  userId: string,
  quoteId: string,
  input: UpdateDashboardLeadInput,
): Promise<DashboardQuoteDTO> => {
  const actor = await getActor(userId);
  const quote = await ensureQuoteExists(quoteId);
  await assertPropertyInScope(actor, quote.propertyId);

  const updatedQuote = await repo.updateQuoteById(quoteId, {
    status: input.status,
  });

  return mapQuote(updatedQuote);
};
