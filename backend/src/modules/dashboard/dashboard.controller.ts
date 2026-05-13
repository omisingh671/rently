import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./dashboard.service.js";
import {
  createAmenitySchema,
  createAssignmentSchema,
  createCouponSchema,
  createDashboardUserSchema,
  createManualBookingSchema,
  createTenantSchema,
  createRoomPricingSchema,
  createRoomProductSchema,
  createPropertySchema,
  createRoomSchema,
  createTaxSchema,
  createUnitSchema,
  createMaintenanceSchema,
  idParamsSchema,
  listAmenitiesQuerySchema,
  listAssignmentsQuerySchema,
  listBookingsQuerySchema,
  listCouponsQuerySchema,
  listLeadsQuerySchema,
  listMaintenanceQuerySchema,
  listRoomPricingQuerySchema,
  listRoomProductsQuerySchema,
  listPropertiesQuerySchema,
  listRoomsQuerySchema,
  listTaxesQuerySchema,
  listTenantsQuerySchema,
  listUnitsQuerySchema,
  listUsersQuerySchema,
  propertyIdParamsSchema,
  checkManualBookingAvailabilitySchema,
  updateAmenitySchema,
  updateBookingStatusSchema,
  updateCouponSchema,
  updateLeadStatusSchema,
  updateMaintenanceSchema,
  updateDashboardUserSchema,
  updatePropertySchema,
  updateRoomPricingSchema,
  updateRoomProductSchema,
  updateRoomSchema,
  updateTaxSchema,
  updateTenantSchema,
  updateUnitSchema,
} from "./dashboard.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  return userId;
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const data = await service.getDashboardContext(getUserId(req));
  res.json({ success: true, data });
};

export const getSummary = async (req: AuthRequest, res: Response) => {
  const data = await service.getDashboardSummary(getUserId(req));
  res.json({ success: true, data });
};

export const listTenants = async (req: AuthRequest, res: Response) => {
  const query = listTenantsQuerySchema.parse(req.query);
  const data = await service.listTenants(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
  });
  res.json({ success: true, data });
};

export const listActiveTenants = async (req: AuthRequest, res: Response) => {
  const data = await service.listActiveTenants(getUserId(req));
  res.json({ success: true, data });
};

export const getTenantById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getTenantById(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const createTenant = async (req: AuthRequest, res: Response) => {
  const body = createTenantSchema.parse(req.body);
  const data = await service.createTenant(getUserId(req), {
    name: body.name,
    ...(body.slug !== undefined && { slug: body.slug }),
    ...(body.primaryDomain !== undefined &&
      body.primaryDomain !== null && { primaryDomain: body.primaryDomain }),
    ...(body.status !== undefined && { status: body.status }),
    brandName: body.brandName,
    ...(body.logoUrl !== undefined &&
      body.logoUrl !== null && { logoUrl: body.logoUrl }),
    ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
    ...(body.secondaryColor !== undefined && {
      secondaryColor: body.secondaryColor,
    }),
    ...(body.supportEmail !== undefined &&
      body.supportEmail !== null && { supportEmail: body.supportEmail }),
    ...(body.supportPhone !== undefined &&
      body.supportPhone !== null && { supportPhone: body.supportPhone }),
    ...(body.defaultCurrency !== undefined && {
      defaultCurrency: body.defaultCurrency,
    }),
    ...(body.payAtCheckInEnabled !== undefined && {
      payAtCheckInEnabled: body.payAtCheckInEnabled,
    }),
    ...(body.bookingTokenAmount !== undefined && {
      bookingTokenAmount: body.bookingTokenAmount,
    }),
    ...(body.timezone !== undefined && { timezone: body.timezone }),
  });
  res.status(201).json({ success: true, data });
};

export const updateTenant = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateTenantSchema.parse(req.body);
  const data = await service.updateTenant(getUserId(req), params.id, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.slug !== undefined && { slug: body.slug }),
    ...(body.primaryDomain !== undefined && {
      primaryDomain: body.primaryDomain,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.brandName !== undefined && { brandName: body.brandName }),
    ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
    ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
    ...(body.secondaryColor !== undefined && {
      secondaryColor: body.secondaryColor,
    }),
    ...(body.supportEmail !== undefined && { supportEmail: body.supportEmail }),
    ...(body.supportPhone !== undefined && { supportPhone: body.supportPhone }),
    ...(body.defaultCurrency !== undefined && {
      defaultCurrency: body.defaultCurrency,
    }),
    ...(body.payAtCheckInEnabled !== undefined && {
      payAtCheckInEnabled: body.payAtCheckInEnabled,
    }),
    ...(body.bookingTokenAmount !== undefined && {
      bookingTokenAmount: body.bookingTokenAmount,
    }),
    ...(body.timezone !== undefined && { timezone: body.timezone }),
  });
  res.json({ success: true, data });
};

export const listProperties = async (req: AuthRequest, res: Response) => {
  const query = listPropertiesQuerySchema.parse(req.query);
  const data = await service.listProperties(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.tenantId !== undefined && { tenantId: query.tenantId }),
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const getPropertyById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getPropertyById(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const createProperty = async (req: AuthRequest, res: Response) => {
  const body = createPropertySchema.parse(req.body);
  const data = await service.createProperty(getUserId(req), {
    tenantId: body.tenantId,
    name: body.name,
    address: body.address,
    city: body.city,
    state: body.state,
    ...(body.status !== undefined && { status: body.status }),
  });
  res.status(201).json({ success: true, data });
};

export const updateProperty = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updatePropertySchema.parse(req.body);
  const data = await service.updateProperty(getUserId(req), params.id, {
    ...(body.tenantId !== undefined && { tenantId: body.tenantId }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.address !== undefined && { address: body.address }),
    ...(body.city !== undefined && { city: body.city }),
    ...(body.state !== undefined && { state: body.state }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
  res.json({ success: true, data });
};

export const listAdmins = async (req: AuthRequest, res: Response) => {
  const query = listUsersQuerySchema.parse(req.query);
  const data = await service.listAdmins(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const createAdmin = async (req: AuthRequest, res: Response) => {
  const body = createDashboardUserSchema.parse(req.body);
  const data = await service.createAdmin(getUserId(req), {
    fullName: body.fullName,
    email: body.email,
    password: body.password,
    ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
    ...(body.contactNumber !== undefined && {
      contactNumber: body.contactNumber,
    }),
  });
  res.status(201).json({ success: true, data });
};

export const updateAdmin = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateDashboardUserSchema.parse(req.body);
  const data = await service.updateAdmin(getUserId(req), params.id, {
    ...(body.fullName !== undefined && { fullName: body.fullName }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
    ...(body.contactNumber !== undefined && {
      contactNumber: body.contactNumber,
    }),
  });
  res.json({ success: true, data });
};

export const listManagers = async (req: AuthRequest, res: Response) => {
  const query = listUsersQuerySchema.parse(req.query);
  const data = await service.listManagers(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const createManager = async (req: AuthRequest, res: Response) => {
  const body = createDashboardUserSchema.parse(req.body);
  const data = await service.createManager(getUserId(req), {
    fullName: body.fullName,
    email: body.email,
    password: body.password,
    ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
    ...(body.contactNumber !== undefined && {
      contactNumber: body.contactNumber,
    }),
  });
  res.status(201).json({ success: true, data });
};

export const updateManager = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateDashboardUserSchema.parse(req.body);
  const data = await service.updateManager(getUserId(req), params.id, {
    ...(body.fullName !== undefined && { fullName: body.fullName }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
    ...(body.contactNumber !== undefined && {
      contactNumber: body.contactNumber,
    }),
  });
  res.json({ success: true, data });
};

export const listPropertyAssignments = async (
  req: AuthRequest,
  res: Response,
) => {
  const query = listAssignmentsQuerySchema.parse(req.query);
  const data = await service.listPropertyAssignments(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.propertyId !== undefined && { propertyId: query.propertyId }),
    ...(query.role !== undefined && { role: query.role }),
  });
  res.json({ success: true, data });
};

export const createPropertyAssignment = async (
  req: AuthRequest,
  res: Response,
) => {
  const body = createAssignmentSchema.parse(req.body);
  const data = await service.createPropertyAssignment(getUserId(req), body);
  res.status(201).json({ success: true, data });
};

export const deletePropertyAssignment = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  await service.deletePropertyAssignment(getUserId(req), params.id);
  res.status(204).send();
};

export const listAmenities = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listAmenitiesQuerySchema.parse(req.query);
  const data = await service.listAmenities(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const getAmenityById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getAmenityById(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const createAmenity = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createAmenitySchema.parse(req.body);
  const data = await service.createAmenity(
    getUserId(req),
    params.propertyId,
    {
      name: body.name,
      ...(body.icon !== undefined && { icon: body.icon }),
    },
  );
  res.status(201).json({ success: true, data });
};

export const updateAmenity = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateAmenitySchema.parse(req.body);
  const data = await service.updateAmenity(getUserId(req), params.id, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.icon !== undefined && { icon: body.icon }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
  res.json({ success: true, data });
};

export const listUnits = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listUnitsQuerySchema.parse(req.query);
  const data = await service.listUnits(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const getUnitById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getUnitById(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const createUnit = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createUnitSchema.parse(req.body);
  const data = await service.createUnit(getUserId(req), params.propertyId, {
    unitNumber: body.unitNumber,
    floor: body.floor,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.amenityIds !== undefined && { amenityIds: body.amenityIds }),
  });
  res.status(201).json({ success: true, data });
};

export const updateUnit = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateUnitSchema.parse(req.body);
  const data = await service.updateUnit(getUserId(req), params.id, {
    ...(body.unitNumber !== undefined && { unitNumber: body.unitNumber }),
    ...(body.floor !== undefined && { floor: body.floor }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.amenityIds !== undefined && { amenityIds: body.amenityIds }),
  });
  res.json({ success: true, data });
};

export const deleteUnit = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  await service.deleteUnit(getUserId(req), params.id);
  res.status(204).send();
};

export const listRooms = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listRoomsQuerySchema.parse(req.query);
  const data = await service.listRooms(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const getRoomById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getRoomById(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const createRoom = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createRoomSchema.parse(req.body);
  const data = await service.createRoom(getUserId(req), params.propertyId, {
    unitId: body.unitId,
    name: body.name,
    number: body.number,
    rent: body.rent,
    ...(body.hasAC !== undefined && { hasAC: body.hasAC }),
    ...(body.maxOccupancy !== undefined && {
      maxOccupancy: body.maxOccupancy,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.amenityIds !== undefined && { amenityIds: body.amenityIds }),
  });
  res.status(201).json({ success: true, data });
};

export const updateRoom = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateRoomSchema.parse(req.body);
  const data = await service.updateRoom(getUserId(req), params.id, {
    ...(body.unitId !== undefined && { unitId: body.unitId }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.number !== undefined && { number: body.number }),
    ...(body.rent !== undefined && { rent: body.rent }),
    ...(body.hasAC !== undefined && { hasAC: body.hasAC }),
    ...(body.maxOccupancy !== undefined && {
      maxOccupancy: body.maxOccupancy,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.amenityIds !== undefined && { amenityIds: body.amenityIds }),
  });
  res.json({ success: true, data });
};

export const deleteRoom = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  await service.deleteRoom(getUserId(req), params.id);
  res.status(204).send();
};

export const listMaintenanceBlocks = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listMaintenanceQuerySchema.parse(req.query);
  const data = await service.listMaintenanceBlocks(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.targetType !== undefined && { targetType: query.targetType }),
  });
  res.json({ success: true, data });
};

export const getMaintenanceBlockById = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getMaintenanceBlockById(
    getUserId(req),
    params.id,
  );
  res.json({ success: true, data });
};

export const createMaintenanceBlock = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createMaintenanceSchema.parse(req.body);
  const data = await service.createMaintenanceBlock(
    getUserId(req),
    params.propertyId,
    {
      targetType: body.targetType,
      ...(body.unitId !== undefined && { unitId: body.unitId }),
      ...(body.roomId !== undefined && { roomId: body.roomId }),
      ...(body.reason !== undefined && { reason: body.reason }),
      startDate: body.startDate,
      endDate: body.endDate,
    },
  );
  res.status(201).json({ success: true, data });
};

export const updateMaintenanceBlock = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateMaintenanceSchema.parse(req.body);
  const data = await service.updateMaintenanceBlock(getUserId(req), params.id, {
    ...(body.targetType !== undefined && { targetType: body.targetType }),
    ...(body.unitId !== undefined && { unitId: body.unitId }),
    ...(body.roomId !== undefined && { roomId: body.roomId }),
    ...(body.reason !== undefined && { reason: body.reason }),
    ...(body.startDate !== undefined && { startDate: body.startDate }),
    ...(body.endDate !== undefined && { endDate: body.endDate }),
  });
  res.json({ success: true, data });
};

export const deleteMaintenanceBlock = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  await service.deleteMaintenanceBlock(getUserId(req), params.id);
  res.status(204).send();
};

export const listRoomProducts = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listRoomProductsQuerySchema.parse(req.query);
  const data = await service.listRoomProducts(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.category !== undefined && { category: query.category }),
  });
  res.json({ success: true, data });
};

export const createRoomProduct = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createRoomProductSchema.parse(req.body);
  const data = await service.createRoomProduct(
    getUserId(req),
    params.propertyId,
    {
      name: body.name,
      occupancy: body.occupancy,
      hasAC: body.hasAC,
      category: body.category,
    },
  );
  res.status(201).json({ success: true, data });
};

export const updateRoomProduct = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateRoomProductSchema.parse(req.body);
  const data = await service.updateRoomProduct(getUserId(req), params.id, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.occupancy !== undefined && { occupancy: body.occupancy }),
    ...(body.hasAC !== undefined && { hasAC: body.hasAC }),
    ...(body.category !== undefined && { category: body.category }),
  });
  res.json({ success: true, data });
};

export const listRoomPricing = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listRoomPricingQuerySchema.parse(req.query);
  const data = await service.listRoomPricing(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.productId !== undefined && { productId: query.productId }),
    ...(query.rateType !== undefined && { rateType: query.rateType }),
    ...(query.pricingTier !== undefined && { pricingTier: query.pricingTier }),
  });
  res.json({ success: true, data });
};

export const createRoomPricing = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createRoomPricingSchema.parse(req.body);
  const data = await service.createRoomPricing(
    getUserId(req),
    params.propertyId,
    {
      productId: body.productId,
      ...(body.unitId !== undefined && { unitId: body.unitId }),
      ...(body.roomId !== undefined && { roomId: body.roomId }),
      ...(body.rateType !== undefined && { rateType: body.rateType }),
      ...(body.pricingTier !== undefined && {
        pricingTier: body.pricingTier,
      }),
      ...(body.minNights !== undefined && { minNights: body.minNights }),
      ...(body.maxNights !== undefined && { maxNights: body.maxNights }),
      ...(body.taxInclusive !== undefined && {
        taxInclusive: body.taxInclusive,
      }),
      price: body.price,
      validFrom: body.validFrom,
      ...(body.validTo !== undefined && { validTo: body.validTo }),
    },
  );
  res.status(201).json({ success: true, data });
};

export const updateRoomPricing = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateRoomPricingSchema.parse(req.body);
  const data = await service.updateRoomPricing(getUserId(req), params.id, {
    ...(body.productId !== undefined && { productId: body.productId }),
    ...(body.unitId !== undefined && { unitId: body.unitId }),
    ...(body.roomId !== undefined && { roomId: body.roomId }),
    ...(body.rateType !== undefined && { rateType: body.rateType }),
    ...(body.pricingTier !== undefined && { pricingTier: body.pricingTier }),
    ...(body.minNights !== undefined && { minNights: body.minNights }),
    ...(body.maxNights !== undefined && { maxNights: body.maxNights }),
    ...(body.taxInclusive !== undefined && {
      taxInclusive: body.taxInclusive,
    }),
    ...(body.price !== undefined && { price: body.price }),
    ...(body.validFrom !== undefined && { validFrom: body.validFrom }),
    ...(body.validTo !== undefined && { validTo: body.validTo }),
  });
  res.json({ success: true, data });
};

export const deleteRoomPricing = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  await service.deleteRoomPricing(getUserId(req), params.id);
  res.status(204).send();
};

export const listTaxes = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listTaxesQuerySchema.parse(req.query);
  const data = await service.listTaxes(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.taxType !== undefined && { taxType: query.taxType }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const createTax = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createTaxSchema.parse(req.body);
  const data = await service.createTax(getUserId(req), params.propertyId, {
    name: body.name,
    rate: body.rate,
    ...(body.taxType !== undefined && { taxType: body.taxType }),
    ...(body.appliesTo !== undefined && { appliesTo: body.appliesTo }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
  res.status(201).json({ success: true, data });
};

export const updateTax = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateTaxSchema.parse(req.body);
  const data = await service.updateTax(getUserId(req), params.id, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.rate !== undefined && { rate: body.rate }),
    ...(body.taxType !== undefined && { taxType: body.taxType }),
    ...(body.appliesTo !== undefined && { appliesTo: body.appliesTo }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
  res.json({ success: true, data });
};

export const listCoupons = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listCouponsQuerySchema.parse(req.query);
  const data = await service.listCoupons(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.discountType !== undefined && {
      discountType: query.discountType,
    }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const createCoupon = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createCouponSchema.parse(req.body);
  const data = await service.createCoupon(
    getUserId(req),
    params.propertyId,
    {
      code: body.code,
      name: body.name,
      ...(body.discountType !== undefined && {
        discountType: body.discountType,
      }),
      discountValue: body.discountValue,
      ...(body.maxUses !== undefined && { maxUses: body.maxUses }),
      ...(body.minNights !== undefined && { minNights: body.minNights }),
      ...(body.minAmount !== undefined && { minAmount: body.minAmount }),
      validFrom: body.validFrom,
      ...(body.validTo !== undefined && { validTo: body.validTo }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  );
  res.status(201).json({ success: true, data });
};

export const updateCoupon = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateCouponSchema.parse(req.body);
  const data = await service.updateCoupon(getUserId(req), params.id, {
    ...(body.code !== undefined && { code: body.code }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.discountType !== undefined && {
      discountType: body.discountType,
    }),
    ...(body.discountValue !== undefined && {
      discountValue: body.discountValue,
    }),
    ...(body.maxUses !== undefined && { maxUses: body.maxUses }),
    ...(body.minNights !== undefined && { minNights: body.minNights }),
    ...(body.minAmount !== undefined && { minAmount: body.minAmount }),
    ...(body.validFrom !== undefined && { validFrom: body.validFrom }),
    ...(body.validTo !== undefined && { validTo: body.validTo }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
  res.json({ success: true, data });
};

export const listBookings = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listBookingsQuerySchema.parse(req.query);
  const data = await service.listBookings(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
  });
  res.json({ success: true, data });
};

export const createManualBooking = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createManualBookingSchema.parse(req.body);
  const data = await service.createManualBooking(getUserId(req), params.propertyId, {
    bookingType: body.bookingType,
    ...(body.spaceId !== undefined && { spaceId: body.spaceId }),
    ...(body.spaceIds !== undefined && { spaceIds: body.spaceIds }),
    from: body.from,
    to: body.to,
    guests: body.guests,
    guestName: body.guestName,
    guestEmail: body.guestEmail,
    ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
    ...(body.contactNumber !== undefined && {
      contactNumber: body.contactNumber,
    }),
    ...(body.internalNotes !== undefined && {
      internalNotes: body.internalNotes,
    }),
  });
  res.status(201).json({ success: true, data });
};

export const checkManualBookingAvailability = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = checkManualBookingAvailabilitySchema.parse(req.body);
  const data = await service.checkManualBookingAvailability(
    getUserId(req),
    params.propertyId,
    {
      spaceIds: body.spaceIds,
      from: body.from,
      to: body.to,
      guests: body.guests,
    },
  );
  res.json({ success: true, data });
};

export const updateBooking = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateBookingStatusSchema.parse(req.body);
  const data = await service.updateBooking(getUserId(req), params.id, {
    ...(body.status !== undefined && { status: body.status }),
    ...(body.internalNotes !== undefined && {
      internalNotes: body.internalNotes,
    }),
    ...(body.note !== undefined && { note: body.note }),
  });
  res.json({ success: true, data });
};

export const listEnquiries = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listLeadsQuerySchema.parse(req.query);
  const data = await service.listEnquiries(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
    ...(query.source !== undefined && { source: query.source }),
  });
  res.json({ success: true, data });
};

export const updateEnquiry = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateLeadStatusSchema.parse(req.body);
  const data = await service.updateEnquiry(getUserId(req), params.id, {
    status: body.status,
  });
  res.json({ success: true, data });
};

export const listQuotes = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listLeadsQuerySchema.parse(req.query);
  const data = await service.listQuotes(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
  });
  res.json({ success: true, data });
};

export const updateQuote = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateLeadStatusSchema.parse(req.body);
  const data = await service.updateQuote(getUserId(req), params.id, {
    status: body.status,
  });
  res.json({ success: true, data });
};
