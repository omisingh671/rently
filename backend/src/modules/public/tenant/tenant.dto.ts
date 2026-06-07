export interface PublicTenantConfigDTO {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  defaultCurrency: string;
  timezone: string;
  contact: PublicContactDTO;
  selectedProperty: PublicPropertySummaryDTO | null;
  properties: PublicPropertySummaryDTO[];
  propertyContacts: PublicPropertySummaryDTO[];
}

export interface PublicContactDTO {
  supportEmail: string | null;
  supportPhone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "PROPERTY" | "TENANT";
}

export interface PublicPropertySummaryDTO {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  address: string;
  supportEmail: string | null;
  supportPhone: string | null;
  latitude: number | null;
  longitude: number | null;
}
