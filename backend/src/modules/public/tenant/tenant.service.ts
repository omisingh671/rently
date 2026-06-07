import type { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./tenant.repository.js";
import type { TenantResolutionInput } from "./tenant.inputs.js";
import type {
  PublicTenantConfigDTO,
  PublicContactDTO,
  PublicPropertySummaryDTO,
} from "./tenant.dto.ts";

export interface PublicPropertyScope {
  propertyId?: string;
  city?: string;
}

export interface PublicRequestScope {
  tenant: NonNullable<Awaited<ReturnType<typeof repo.findDefaultTenant>>>;
  property: Awaited<ReturnType<typeof repo.findActivePropertyBySlug>> | null;
  propertyScope: PublicPropertyScope;
}

const hasPropertyContact = (property: PublicPropertySummaryDTO) =>
  property.supportEmail !== null ||
  property.supportPhone !== null ||
  property.latitude !== null ||
  property.longitude !== null;

const mapPropertySummary = (property: {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  address: string;
  supportEmail: string | null;
  supportPhone: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
}): PublicPropertySummaryDTO => ({
  id: property.id,
  slug: property.slug,
  name: property.name,
  city: property.city,
  state: property.state,
  address: property.address,
  supportEmail: property.supportEmail ?? null,
  supportPhone: property.supportPhone ?? null,
  latitude: property.latitude === null ? null : Number(property.latitude),
  longitude: property.longitude === null ? null : Number(property.longitude),
});

const buildContact = (
  tenant: NonNullable<Awaited<ReturnType<typeof repo.findDefaultTenant>>>,
  property: PublicPropertySummaryDTO | null,
): PublicContactDTO => {
  if (
    property &&
    (property.supportEmail !== null ||
      property.supportPhone !== null ||
      property.latitude !== null ||
      property.longitude !== null)
  ) {
    return {
      supportEmail: property.supportEmail ?? tenant.supportEmail ?? null,
      supportPhone: property.supportPhone ?? tenant.supportPhone ?? null,
      address: property.address,
      latitude: property.latitude,
      longitude: property.longitude,
      source: "PROPERTY",
    };
  }

  return {
    supportEmail: tenant.supportEmail ?? null,
    supportPhone: tenant.supportPhone ?? null,
    address: null,
    latitude: null,
    longitude: null,
    source: "TENANT",
  };
};

const mapTenantConfig = (
  tenant: NonNullable<Awaited<ReturnType<typeof repo.findDefaultTenant>>>,
  properties: PublicPropertySummaryDTO[],
  selectedProperty: PublicPropertySummaryDTO | null,
): PublicTenantConfigDTO => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  brandName: tenant.brandName,
  logoUrl: tenant.logoUrl ?? null,
  primaryColor: tenant.primaryColor,
  secondaryColor: tenant.secondaryColor,
  supportEmail: tenant.supportEmail ?? null,
  supportPhone: tenant.supportPhone ?? null,
  defaultCurrency: tenant.defaultCurrency,
  timezone: tenant.timezone,
  contact: buildContact(tenant, selectedProperty),
  selectedProperty,
  properties,
  propertyContacts:
    selectedProperty !== null
      ? hasPropertyContact(selectedProperty)
        ? [selectedProperty]
        : []
      : properties.filter(hasPropertyContact),
});

export const resolveTenant = async (input: TenantResolutionInput = {}) => {
  if (input.tenantId) {
    const tenant = await repo.findActiveTenantById(input.tenantId);
    if (tenant) {
      return tenant;
    }

    throw new HttpError(404, "TENANT_NOT_FOUND", "Tenant not found");
  }

  if (input.tenantSlug) {
    const tenant = await repo.findActiveTenantBySlug(input.tenantSlug);
    if (tenant) {
      return tenant;
    }

    throw new HttpError(404, "TENANT_NOT_FOUND", "Tenant not found");
  }

  throw new HttpError(
    400,
    "TENANT_REQUIRED",
    "Tenant identity is required",
  );
};

export const resolvePublicScope = async (
  input: TenantResolutionInput = {},
): Promise<PublicRequestScope> => {
  const tenant = await resolveTenant(input);

  if (input.propertySlug !== undefined) {
    const property = await repo.findActivePropertyBySlug(
      tenant.id,
      input.propertySlug,
    );

    if (!property) {
      throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
    }

    return {
      tenant,
      property,
      propertyScope: { propertyId: property.id },
    };
  }

  return {
    tenant,
    property: null,
    propertyScope:
      input.city !== undefined
        ? { city: input.city }
        : {},
  };
};

export const getTenantConfig = async (
  input: TenantResolutionInput = {},
): Promise<PublicTenantConfigDTO> => {
  const scope = await resolvePublicScope(input);
  const properties = await repo.listActivePublicProperties(scope.tenant.id);
  const selectedProperty =
    scope.property === null ? null : mapPropertySummary(scope.property);
  const mappedProperties =
    selectedProperty === null ? properties.map(mapPropertySummary) : [selectedProperty];

  return mapTenantConfig(scope.tenant, mappedProperties, selectedProperty);
};
