import { API_BASE_URL } from "@/configs/appConfig";

export const resolveTenantAssetUrl = (assetUrl: string | null): string | null => {
  if (!assetUrl) return null;
  if (/^https?:\/\//i.test(assetUrl)) return assetUrl;

  return `${API_BASE_URL}${assetUrl}`;
};
