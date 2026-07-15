import { useState } from "react";
import { resolveTenantAssetUrl } from "@/features/public-config/branding";

type TenantLogoProps = {
  logoUrl: string | null | undefined;
  fallbackSrc: string;
  alt: string;
  className: string;
};

export default function TenantLogo({
  logoUrl,
  fallbackSrc,
  alt,
  className,
}: TenantLogoProps) {
  const resolvedLogoUrl = resolveTenantAssetUrl(logoUrl ?? null);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

  const src = resolvedLogoUrl && failedLogoUrl !== resolvedLogoUrl
    ? resolvedLogoUrl
    : fallbackSrc;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (src !== fallbackSrc) setFailedLogoUrl(resolvedLogoUrl);
      }}
    />
  );
}
