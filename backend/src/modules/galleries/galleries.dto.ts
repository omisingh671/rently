export interface GalleryDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string | null;
  unitNumber: string | null;
  roomId: string | null;
  roomName: string | null;
  roomNumber: string | null;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}
