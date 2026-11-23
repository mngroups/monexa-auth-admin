import { getAuthPortalUrl } from "@/lib/app-config";

import type { LogoMeta, LogoVariant } from "../schema";

/** The public logo URL on the auth portal, or null without a logo or portal URL. Server-side only. */
export function buildLogoUrl(
  slug: string,
  logo: LogoMeta | null | undefined,
  variant: LogoVariant = "default"
): string | null {
  const portal = getAuthPortalUrl();
  if (!logo || !portal) return null;
  return `${portal}/branding/orgs/${encodeURIComponent(slug)}/logo?${variant === "dark" ? "variant=dark&" : ""}v=${encodeURIComponent(logo.etag)}`;
}
