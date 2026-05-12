export type PropertyAssignmentRole = "ADMIN" | "MANAGER";

export type AdminPropertyAssignment = {
  id: string;
  propertyId: string;
  propertyName: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: PropertyAssignmentRole;
  assignedByUserId: string;
  assignedByName: string;
  createdAt: string;
};

export type CreatePropertyAssignmentPayload = {
  propertyId: string;
  userId: string;
  role: PropertyAssignmentRole;
};
