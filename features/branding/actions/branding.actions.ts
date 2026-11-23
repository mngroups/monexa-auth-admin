"use server";

import {
  ApiError,
  apiEnvelope,
  type ServerActionResult,
  throwIfFail,
  wrapServerAction,
} from "@mono/auth";
import { z } from "zod";
import { parseInput } from "@/features/admin-shared/validation";
import { apiClient } from "@/lib/session";
import { parseLogoForm } from "../helpers/logo-form";
import { buildLogoUrl } from "../helpers/logo-url";
import {
  type Branding,
  brandingSchema,
  type LogoMeta,
  type LogoVariant,
  logoVariantSchema,
  validateLogo,
} from "../schema";
import { postLogo } from "./upload-logo";

const BASE = "/api/admin/org";

export async function getBrandingAction(): Promise<ServerActionResult<Branding>> {
  return wrapServerAction(async () => {
    const res = await apiClient(`${BASE}/branding`, { method: "GET" }, apiEnvelope(brandingSchema));
    throwIfFail(res);
    const { slug, logo, logoDark } = (res as { data: z.infer<typeof brandingSchema> }).data;
    return {
      slug,
      logoUrl: buildLogoUrl(slug, logo),
      logoDarkUrl: buildLogoUrl(slug, logoDark, "dark"),
      hasLogo: logo != null,
      hasLogoDark: logoDark != null,
    };
  });
}

export async function uploadLogoAction(
  formData: FormData,
  variant: LogoVariant
): Promise<ServerActionResult<LogoMeta>> {
  return wrapServerAction(async () => {
    const chosen = parseInput(logoVariantSchema, variant);
    const file = parseLogoForm(formData);
    // The BE re-checks; refusing here means a bad file is never forwarded.
    const refusal = validateLogo(file);
    if (refusal) throw new ApiError(refusal, 422, 422);
    return postLogo(`${BASE}/logo`, formData, chosen);
  });
}

export async function removeLogoAction(variant: LogoVariant): Promise<ServerActionResult<null>> {
  return wrapServerAction(async () => {
    const params = { variant: parseInput(logoVariantSchema, variant) };
    throwIfFail(
      await apiClient(`${BASE}/logo`, { method: "DELETE", params }, apiEnvelope(z.null()))
    );
    return null;
  });
}
