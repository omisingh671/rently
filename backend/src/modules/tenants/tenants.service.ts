import { HttpError } from "@/common/errors/http-error.js";
import { logError } from "@/common/observability/logger.js";
import { storageProvider } from "@/common/services/storage.js";
import { Prisma, UserRole, type Tenant } from "@/generated/prisma/client.js";
import * as repo from "./tenants.repository.js";
import { getActor } from "@/common/services/scoping.service.js";
import type {
  TenantListInput,
  CreateTenantInput,
  UpdateTenantInput,
} from "./tenants.inputs.js";
import type { TenantDTO } from "./tenants.dto.js";

const normalizePaginationResult = <T>(
  page: number,
  limit: number,
  total: number,
  items: T[],
) => ({
  items,
  pagination: {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  },
});

const mapTenant = (tenant: Tenant): TenantDTO => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  primaryDomain: tenant.primaryDomain ?? null,
  status: tenant.status,
  brandName: tenant.brandName,
  logoUrl: tenant.logoUrl ?? null,
  primaryColor: tenant.primaryColor,
  secondaryColor: tenant.secondaryColor,
  supportEmail: tenant.supportEmail ?? null,
  supportPhone: tenant.supportPhone ?? null,
  defaultCurrency: tenant.defaultCurrency,
  timezone: tenant.timezone,
  createdAt: tenant.createdAt,
  updatedAt: tenant.updatedAt,
});

const ensureTenantExists = async (tenantId: string) => {
  const tenant = await repo.findTenantById(tenantId);
  if (!tenant) {
    throw new HttpError(404, "TENANT_NOT_FOUND", "Tenant not found");
  }

  return tenant;
};

const buildTenantSlug = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "tenant";
};

const withSlugSuffix = (baseSlug: string, suffix: number) => {
  if (suffix === 0) {
    return baseSlug;
  }

  const suffixText = `-${suffix}`;
  const maxBaseLength = 80 - suffixText.length;
  const base = baseSlug.slice(0, maxBaseLength).replace(/-+$/g, "");
  return `${base}${suffixText}`;
};

const generateUniqueTenantSlug = async (name: string) => {
  const baseSlug = buildTenantSlug(name);

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = withSlugSuffix(baseSlug, suffix);
    const existingTenant = await repo.findTenantBySlug(candidate);

    if (!existingTenant) {
      return candidate;
    }
  }

  throw new HttpError(
    409,
    "TENANT_SLUG_EXHAUSTED",
    "Could not generate a unique tenant slug",
  );
};

export const listTenants = async (
  userId: string,
  filters: TenantListInput,
) => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  const { items, total } = await repo.listTenantsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapTenant),
  );
};

export const listActiveTenants = async (
  userId: string,
): Promise<TenantDTO[]> => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  const tenants = await repo.listActiveTenantOptions();
  return tenants.map(mapTenant);
};

export const getTenantById = async (
  userId: string,
  tenantId: string,
): Promise<TenantDTO> => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  const tenant = await ensureTenantExists(tenantId);
  return mapTenant(tenant);
};

export const createTenant = async (
  userId: string,
  input: CreateTenantInput,
): Promise<TenantDTO> => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  try {
    const slug = input.slug ?? (await generateUniqueTenantSlug(input.name));
    const tenant = await repo.createTenant({
      name: input.name,
      slug,
      ...(input.primaryDomain !== undefined && {
        primaryDomain: input.primaryDomain,
      }),
      ...(input.status !== undefined && { status: input.status }),
      brandName: input.brandName,
      ...(input.primaryColor !== undefined && {
        primaryColor: input.primaryColor,
      }),
      ...(input.secondaryColor !== undefined && {
        secondaryColor: input.secondaryColor,
      }),
      ...(input.supportEmail !== undefined && {
        supportEmail: input.supportEmail,
      }),
      ...(input.supportPhone !== undefined && {
        supportPhone: input.supportPhone,
      }),
      ...(input.defaultCurrency !== undefined && {
        defaultCurrency: input.defaultCurrency,
      }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
    });

    return mapTenant(tenant);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "TENANT_EXISTS",
        "Tenant slug or domain already exists",
      );
    }

    throw error;
  }
};

export const updateTenant = async (
  userId: string,
  tenantId: string,
  input: UpdateTenantInput,
): Promise<TenantDTO> => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }
  await ensureTenantExists(tenantId);

  try {
    const tenant = await repo.updateTenantById(tenantId, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.primaryDomain !== undefined && {
        primaryDomain: input.primaryDomain,
      }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.brandName !== undefined && { brandName: input.brandName }),
      ...(input.primaryColor !== undefined && {
        primaryColor: input.primaryColor,
      }),
      ...(input.secondaryColor !== undefined && {
        secondaryColor: input.secondaryColor,
      }),
      ...(input.supportEmail !== undefined && {
        supportEmail: input.supportEmail,
      }),
      ...(input.supportPhone !== undefined && {
        supportPhone: input.supportPhone,
      }),
      ...(input.defaultCurrency !== undefined && {
        defaultCurrency: input.defaultCurrency,
      }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
    });

    return mapTenant(tenant);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "TENANT_EXISTS",
        "Tenant slug or domain already exists",
      );
    }

    throw error;
  }
};

const deleteStoredLogo = async (logoUrl: string, tenantId: string) => {
  try {
    await storageProvider.deleteFile(logoUrl);
  } catch (error) {
    logError("Failed to delete tenant logo from storage", error, {
      tenantId,
      logoUrl,
    });
  }
};

export const uploadTenantLogo = async (
  userId: string,
  tenantId: string,
  file: Express.Multer.File,
): Promise<TenantDTO> => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  const tenant = await ensureTenantExists(tenantId);
  const logoUrl = await storageProvider.uploadFile(file, `tenant-${tenant.id}`);

  let updatedTenant: Tenant;
  try {
    updatedTenant = await repo.updateTenantById(tenant.id, { logoUrl });
  } catch (error) {
    await deleteStoredLogo(logoUrl, tenant.id);
    throw error;
  }

  if (tenant.logoUrl && tenant.logoUrl !== logoUrl) {
    await deleteStoredLogo(tenant.logoUrl, tenant.id);
  }

  return mapTenant(updatedTenant);
};

export const removeTenantLogo = async (
  userId: string,
  tenantId: string,
): Promise<TenantDTO> => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  const tenant = await ensureTenantExists(tenantId);
  const updatedTenant = await repo.updateTenantById(tenant.id, { logoUrl: null });

  if (tenant.logoUrl) {
    await deleteStoredLogo(tenant.logoUrl, tenant.id);
  }

  return mapTenant(updatedTenant);
};
