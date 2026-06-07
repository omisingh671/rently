import type { CreateGalleryInput } from "./galleries.schema.js";

export type { CreateGalleryInput };

export interface ListGalleriesFilters {
  propertyId?: string | string[];
  unitId?: string;
  roomId?: string;
}
