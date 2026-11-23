"use server";

import {
  ApiError,
  apiEnvelope,
  type ServerActionResult,
  throwIfFail,
  wrapServerAction,
} from "@mono/auth";
import { z } from "zod";

import { getAuthPortalUrl } from "@/lib/app-config";
import { apiClient } from "@/lib/session";

import { type Branding, brandingSchema, type LogoMeta, validateLogo } from "../schema";
import { postLogo } from "./upload-logo";

const BASE = "/api/admin/org";

export async function getBrandingAction(): Promise<ServerActionResult<Branding>> {
  return wrapServerAction(async () => {
    const res = await apiClient(`${BASE}/branding`, { method: "GET" }, apiEnvelope(brandingSchema));
    throwIfFail(res);
    const { slug, logo } = (res as { data: z.infer<typeof brandingSchema> }).data;
    const portal = getAuthPortalUrl();
    const logoUrl =
      logo && portal
        ? `${portal}/branding/orgs/${encodeURIComponent(slug)}/logo?v=${encodeURIComponent(logo.etag)}`
        : null;
    return { slug, logoUrl };
  });
}

export async function uploadLogoAction(formData: FormData): Promise<ServerActionResult<LogoMeta>> {
  return wrapServerAction(async () => {
    const file = formData?.get("file");
    if (!(file instanceof File)) throw new ApiError("Pilih file logo terlebih dahulu.", 400, 400);
    // The BE re-checks; refusing here means a bad file is never forwarded.
    const refusal = validateLogo(file);
    if (refusal) throw new ApiError(refusal, 422, 422);
    return postLogo(`${BASE}/logo`, formData);
  });
}

export async function removeLogoAction(): Promise<ServerActionResult<null>> {
  return wrapServerAction(async () => {
    throwIfFail(await apiClient(`${BASE}/logo`, { method: "DELETE" }, apiEnvelope(z.null())));
    return null;
  });
}
