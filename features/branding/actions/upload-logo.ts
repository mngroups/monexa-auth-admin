import "server-only";

import { apiEnvelope, throwIfFail } from "@mono/auth";

import { apiClient } from "@/lib/session";

import { type LogoMeta, type LogoVariant, logoMetaSchema } from "../schema";

const logoResponse = apiEnvelope(logoMetaSchema);

/**
 * PUTs a logo as multipart to a BE logo endpoint and returns its `{ etag, updatedAt }`.
 * Shared by the org's own branding and the platform's per-org branding.
 * `apiClient` leaves the JSON Content-Type out for a `FormData` body.
 *
 * Server-only and deliberately not a "use server" module: callers (Server
 * Actions) wrap it, so the endpoint can never be chosen from the browser.
 */
export async function postLogo(
  endpoint: string,
  formData: FormData,
  variant: LogoVariant
): Promise<LogoMeta> {
  const res = await apiClient(
    endpoint,
    { method: "PUT", body: formData, params: { variant } },
    logoResponse
  );
  throwIfFail(res);
  return (res as { data: LogoMeta }).data;
}
