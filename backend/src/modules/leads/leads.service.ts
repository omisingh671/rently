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
import { recordPropertyAudit } from "@/common/services/property-audit.service.js";
import {
  PropertyAuditAction,
  PropertyAuditEntityType,
} from "@/generated/prisma/enums.js";

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

  const { previous, updated } = await repo.updateEnquiryById(
    enquiryId,
    input.status,
    actor.id,
    input.note,
  );
  if (previous.status !== updated.status) {
    await recordPropertyAudit({
      propertyId: enquiry.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.ENQUIRY,
      entityId: enquiryId,
      action: PropertyAuditAction.STATUS_CHANGED,
      ...(input.note !== undefined && { reason: input.note }),
      previousData: { status: previous.status },
      nextData: { status: updated.status },
    });
  }

  return mapEnquiry(updated);
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

  const { previous, updated } = await repo.updateQuoteById(
    quoteId,
    input.status,
    actor.id,
    input.note,
  );
  if (previous.status !== updated.status) {
    await recordPropertyAudit({
      propertyId: quote.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.QUOTE,
      entityId: quoteId,
      action: PropertyAuditAction.STATUS_CHANGED,
      ...(input.note !== undefined && { reason: input.note }),
      previousData: { status: previous.status },
      nextData: { status: updated.status },
    });
  }

  return mapQuote(updated);
};
