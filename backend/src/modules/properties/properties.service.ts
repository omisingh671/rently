import { Prisma, UserRole } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { prisma } from "@/db/prisma.js";
import {
  getActor,
  getPropertyScope,
  assertPropertyInScope,
  ensurePropertyExists,
} from "@/common/services/scoping.service.js";

import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  ListFilters,
} from "./properties.inputs.js";

import type { PropertyDTO } from "./properties.dto.js";
import * as repo from "./properties.repository.js";

type PropertyRecord = {
  id: string;
  tenantId: string;
  tenant: {
    name: string;
  };
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  supportEmail: string | null;
  supportPhone: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  status: PropertyDTO["status"];
  isActive: boolean;
  createdAt: Date;
  amenities?: Array<{
    amenityId: string;
  }>;
};

const mapProperty = (p: PropertyRecord): PropertyDTO => ({
  id: p.id,
  tenantId: p.tenantId,
  tenantName: p.tenant.name,
  slug: p.slug,
  name: p.name,
  address: p.address,
  city: p.city,
  state: p.state,
  supportEmail: p.supportEmail ?? null,
  supportPhone: p.supportPhone ?? null,
  latitude: p.latitude === null ? null : Number(p.latitude),
  longitude: p.longitude === null ? null : Number(p.longitude),
  status: p.status,
  isActive: p.isActive,
  createdAt: p.createdAt,
  amenityIds: p.amenities?.map((a) => a.amenityId) ?? [],
});

const ensureTenantExists = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    throw new HttpError(404, "TENANT_NOT_FOUND", "Tenant not found");
  }
  return tenant;
};

const buildSlug = (name: string, city: string) => {
  const slug = `${name}-${city}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "property";
};

export const createProperty = async (
  userId: string,
  data: CreatePropertyInput,
): Promise<PropertyDTO> => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  await ensureTenantExists(data.tenantId);

  try {
    const property = await repo.createProperty({
      tenantId: data.tenantId,
      createdByUserId: data.createdByUserId,
      slug: data.slug ?? buildSlug(data.name, data.city),
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      ...(data.supportEmail !== undefined && {
        supportEmail: data.supportEmail,
      }),
      ...(data.supportPhone !== undefined && {
        supportPhone: data.supportPhone,
      }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.amenityIds !== undefined && {
        amenities: {
          createMany: {
            data: data.amenityIds.map((id) => ({ amenityId: id })),
          },
        },
      }),
    });

    return mapProperty(property);
  } catch {
    throw new HttpError(409, "PROPERTY_EXISTS", "Property already exists");
  }
};

export const getPropertyById = async (
  userId: string,
  id: string,
): Promise<PropertyDTO> => {
  const actor = await getActor(userId);
  if (
    actor.role !== UserRole.SUPER_ADMIN &&
    actor.role !== UserRole.ADMIN &&
    actor.role !== UserRole.MANAGER &&
    actor.role !== UserRole.FRONT_DESK &&
    actor.role !== UserRole.ACCOUNTANT
  ) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  await assertPropertyInScope(actor, id);

  const property = await repo.findPropertyById(id);

  if (!property) {
    throw new HttpError(404, "NOT_FOUND", "Property not found");
  }

  return mapProperty(property);
};

export const updateProperty = async (
  userId: string,
  id: string,
  data: UpdatePropertyInput,
): Promise<PropertyDTO> => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  await ensurePropertyExists(id);

  try {
    await repo.updatePropertyById(id, {
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.supportEmail !== undefined && {
        supportEmail: data.supportEmail,
      }),
      ...(data.supportPhone !== undefined && {
        supportPhone: data.supportPhone,
      }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    let property;

    if (data.amenityIds !== undefined) {
      if (data.amenityIds.length > 0) {
        const validCount = await repo.countActiveAmenitiesByIds(
          data.amenityIds,
        );

        if (validCount !== data.amenityIds.length) {
          throw new HttpError(
            400,
            "INVALID_AMENITY",
            "One or more amenities are invalid or inactive",
          );
        }
      }

      property = await repo.replacePropertyAmenities(id, data.amenityIds);
    } else {
      property = await repo.findPropertyById(id);
    }

    if (!property) {
      throw new HttpError(404, "NOT_FOUND", "Property not found");
    }

    return mapProperty(property);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpError(409, "PROPERTY_EXISTS", "Property already exists");
    }

    throw err;
  }
};

export const listProperties = async (
  userId: string,
  filters: ListFilters,
) => {
  const actor = await getActor(userId);
  if (
    actor.role !== UserRole.SUPER_ADMIN &&
    actor.role !== UserRole.ADMIN &&
    actor.role !== UserRole.MANAGER &&
    actor.role !== UserRole.FRONT_DESK &&
    actor.role !== UserRole.ACCOUNTANT
  ) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  const scope = await getPropertyScope(actor);
  const propertyIds = scope.isGlobal ? undefined : scope.propertyIds;

  if (propertyIds !== undefined && propertyIds.length === 0) {
    return {
      items: [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const [items, total] = await Promise.all([
    repo.listProperties({
      ...filters,
      ...(propertyIds !== undefined && { propertyIds }),
    }),
    repo.countProperties({
      ...filters,
      ...(propertyIds !== undefined && { propertyIds }),
    }),
  ]);

  return {
    items: items.map(mapProperty),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
};
