export type Amenity = {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
};

export type CreateAmenityPayload = {
  name: string;
  icon?: string;
};

export type UpdateAmenityPayload = {
  name?: string;
  icon?: string;
  isActive?: boolean;
};

export type UpdateAmenityVariables = {
  amenityId: string;
  payload: UpdateAmenityPayload;
};
