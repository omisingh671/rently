export type CreateAmenityInput = {
  name: string;
  icon?: string;
};

export type UpdateAmenityInput = {
  name?: string;
  icon?: string;
  isActive?: boolean;
};

export type ListAmenitiesFilters = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
};
