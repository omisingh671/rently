export interface GalleryItem {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string | null;
  unitNumber: string | null;
  roomId: string | null;
  roomName: string | null;
  roomNumber: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGalleryPayload {
  propertyId: string;
  unitId?: string | null;
  roomId?: string | null;
  file: File;
}
