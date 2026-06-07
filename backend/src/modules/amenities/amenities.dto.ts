export type AmenityDTO = {
  id: string;
  name: string;
  icon: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type PropertyAmenityAssignmentsDTO = {
  amenityIds: string[];
};
