import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./billing.service.js";
import {
  billingDocumentIdParamsSchema,
  billingPropertyIdParamsSchema,
  generateInvoiceSchema,
  generateReceiptSchema,
  listBillingDocumentsQuerySchema,
  publicBillingDocumentsQuerySchema,
  updateBillingSettingSchema,
  voidBillingDocumentSchema,
} from "./billing.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  return userId;
};

const buildPdfFilename = (documentNumber: string) =>
  `${documentNumber.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;

const streamPdf = async (res: Response, document: Awaited<ReturnType<typeof service.getDashboardDocument>>) => {
  const pdf = await service.renderDocumentPdf(document);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${buildPdfFilename(document.documentNumber)}"`,
  );
  res.send(pdf);
};

export const listDashboardDocuments = async (
  req: AuthRequest,
  res: Response,
) => {
  const query = listBillingDocumentsQuerySchema.parse(req.query);
  const data = await service.listDashboardDocuments(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.propertyId !== undefined && { propertyId: query.propertyId }),
    ...(query.type !== undefined && { type: query.type }),
    ...(query.status !== undefined && { status: query.status }),
    ...(query.bookingRef !== undefined && { bookingRef: query.bookingRef }),
    ...(query.guest !== undefined && { guest: query.guest }),
    ...(query.from !== undefined && { from: query.from }),
    ...(query.to !== undefined && { to: query.to }),
  });
  res.json({ success: true, data });
};

export const getDashboardDocument = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = billingDocumentIdParamsSchema.parse(req.params);
  const data = await service.getDashboardDocument(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const generateDashboardInvoice = async (
  req: AuthRequest,
  res: Response,
) => {
  const body = generateInvoiceSchema.parse(req.body);
  const data = await service.generateDashboardInvoice(getUserId(req), body.bookingId);
  res.status(201).json({ success: true, data });
};

export const generateDashboardReceipt = async (
  req: AuthRequest,
  res: Response,
) => {
  const body = generateReceiptSchema.parse(req.body);
  const data = await service.generateDashboardReceipt(getUserId(req), body.paymentId);
  res.status(201).json({ success: true, data });
};

export const downloadDashboardDocument = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = billingDocumentIdParamsSchema.parse(req.params);
  const document = await service.getDashboardDocument(getUserId(req), params.id);
  await streamPdf(res, document);
};

export const retryDashboardDocumentPdf = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = billingDocumentIdParamsSchema.parse(req.params);
  const data = await service.retryDashboardDocumentPdf(
    getUserId(req),
    params.id,
  );
  res.json({ success: true, data });
};

export const voidDashboardDocument = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = billingDocumentIdParamsSchema.parse(req.params);
  const body = voidBillingDocumentSchema.parse(req.body);
  const data = await service.voidDashboardDocument(
    getUserId(req),
    params.id,
    body.reason,
  );
  res.json({ success: true, data });
};

export const getDashboardSetting = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = billingPropertyIdParamsSchema.parse(req.params);
  const data = await service.getDashboardSetting(getUserId(req), params.propertyId);
  res.json({ success: true, data });
};

export const updateDashboardSetting = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = billingPropertyIdParamsSchema.parse(req.params);
  const body = updateBillingSettingSchema.parse(req.body);
  const data = await service.updateDashboardSetting(getUserId(req), params.propertyId, {
    ...(body.legalName !== undefined && { legalName: body.legalName }),
    ...(body.gstin !== undefined && { gstin: body.gstin }),
    ...(body.pan !== undefined && { pan: body.pan }),
    ...(body.billingAddress !== undefined && {
      billingAddress: body.billingAddress,
    }),
    ...(body.invoicePrefix !== undefined && { invoicePrefix: body.invoicePrefix }),
    ...(body.receiptPrefix !== undefined && { receiptPrefix: body.receiptPrefix }),
    ...(body.creditNotePrefix !== undefined && {
      creditNotePrefix: body.creditNotePrefix,
    }),
    ...(body.debitNotePrefix !== undefined && {
      debitNotePrefix: body.debitNotePrefix,
    }),
    ...(body.footerNotes !== undefined && { footerNotes: body.footerNotes }),
  });
  res.json({ success: true, data });
};

export const listPublicBookingDocuments = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = billingDocumentIdParamsSchema.parse(req.params);
  const query = publicBillingDocumentsQuerySchema.parse(req.query);
  const data = await service.listPublicBookingDocuments(
    params.id,
    req.user?.userId,
    query.checkoutToken,
  );
  res.json({ success: true, data });
};

export const downloadPublicDocument = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = billingDocumentIdParamsSchema.parse(req.params);
  const query = publicBillingDocumentsQuerySchema.parse(req.query);
  const document = await service.getPublicDocument(
    params.id,
    req.user?.userId,
    query.checkoutToken,
  );
  await streamPdf(res, document);
};
