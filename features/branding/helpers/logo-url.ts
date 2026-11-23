import { getAuthPortalUrl } from "@/lib/app-config";

import type { LogoMeta } from "../schema";

/** The public logo URL on the auth portal, or null without a logo or portal URL. Server-side only. */
export function buildLogoUrl(slug: string, logo: LogoMeta | null | undefined): string | null {
  const portal = getAuthPortalUrl();
  if (!logo || !portal) return null;
  return `${portal}/branding/orgs/${encodeURIComponent(slug)}/logo?v=${encodeURIComponent(logo.etag)}`;
}
