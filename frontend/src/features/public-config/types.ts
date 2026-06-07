export interface PublicContact {
  supportEmail: string | null;
  supportPhone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "PROPERTY" | "TENANT";
}

export interface PublicPropertySummary {
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

export interface PublicTenantConfig {
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
  contact: PublicContact;
  selectedProperty: PublicPropertySummary | null;
  properties: PublicPropertySummary[];
  propertyContacts: PublicPropertySummary[];
}
