"use server";

import {
  ApiError,
  apiEnvelope,
  type ServerActionResult,
  throwIfFail,
  wrapServerAction,
} from "@mono/auth";
import { z } from "zod";
import type { PageParams } from "@/features/admin-shared/schema";
import { idSchema, pageParamsSchema, parseInput } from "@/features/admin-shared/validation";
import { postLogo } from "@/features/branding/actions/upload-logo";
import { parseLogoForm } from "@/features/branding/helpers/logo-form";
import { buildLogoUrl } from "@/features/branding/helpers/logo-url";
import {
  type LogoMeta,
  type LogoVariant,
  logoVariantSchema,
  validateLogo,
} from "@/features/branding/schema";
import { apiClient } from "@/lib/session";

import {
  type Org,
  type OrgApp,
  type OrgAppToggle,
  type OrgFormValues,
  type OrgsListPage,
  type OrgUpdateValues,
  orgAppsSchema,
  orgAppToggleSchema,
  orgFormSchema,
  orgSchema,
  orgsPageSchema,
} from "../schema";

const BASE = "/api/admin/platform/orgs";

// Errors are wrapped (not thrown) so the BE's message survives the Server
// Action boundary in production; hooks unwrap them again.

async function call<S extends z.ZodTypeAny>(
  path: string,
  init: { method: string; params?: Record<string, unknown>; body?: unknown },
  data: S
): Promise<z.infer<S>> {
  const res = await apiClient(
    `${BASE}${path}`,
    {
      method: init.method,
      params: init.params,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    },
    apiEnvelope(data)
  );
  throwIfFail(res);
  return (res as { data: unknown }).data as z.infer<S>;
}

const id = (value: unknown): string => encodeURIComponent(parseInput(idSchema, value));
const flag = (value: unknown) => parseInput(z.boolean(), value);
// PATCH takes only the fields that changed, and at least one.
const orgUpdateSchema = orgFormSchema
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0);

export async function listOrgsAction(
  params: PageParams
): Promise<ServerActionResult<OrgsListPage>> {
  return wrapServerAction(async () => {
    const page = await call(
      "",
      { method: "GET", params: { ...parseInput(pageParamsSchema, params) } },
      orgsPageSchema
    );
    return {
      ...page,
      items: page.items.map((org) => ({
        ...org,
        logoUrl: buildLogoUrl(org.slug, org.logo),
        logoDarkUrl: buildLogoUrl(org.slug, org.logoDark, "dark"),
      })),
    };
  });
}

export async function createOrgAction(values: OrgFormValues): Promise<ServerActionResult<Org>> {
  return wrapServerAction(() => {
    const input = parseInput(orgFormSchema, values);
    return call("", { method: "POST", body: { slug: input.slug, name: input.name } }, orgSchema);
  });
}

export async function updateOrgAction(
  orgId: string,
  values: OrgUpdateValues
): Promise<ServerActionResult<Org>> {
  return wrapServerAction(() =>
    call(`/${id(orgId)}`, { method: "PATCH", body: parseInput(orgUpdateSchema, values) }, orgSchema)
  );
}

export async function setOrgActiveAction(
  orgId: string,
  active: boolean
): Promise<ServerActionResult<Org>> {
  return wrapServerAction(() =>
    call(`/${id(orgId)}/${flag(active) ? "activate" : "deactivate"}`, { method: "POST" }, orgSchema)
  );
}

export async function listOrgAppsAction(orgId: string): Promise<ServerActionResult<OrgApp[]>> {
  return wrapServerAction(() => call(`/${id(orgId)}/apps`, { method: "GET" }, orgAppsSchema));
}

export async function setOrgAppAction(
  orgId: string,
  appId: string,
  enabled: boolean
): Promise<ServerActionResult<OrgAppToggle>> {
  return wrapServerAction(() =>
    call(
      `/${id(orgId)}/apps/${id(appId)}`,
      { method: flag(enabled) ? "PUT" : "DELETE" },
      orgAppToggleSchema
    )
  );
}

export async function uploadOrgLogoAction(
  orgId: string,
  formData: FormData,
  variant: LogoVariant
): Promise<ServerActionResult<LogoMeta>> {
  return wrapServerAction(async () => {
    const endpoint = `${BASE}/${id(orgId)}/logo`;
    const chosen = parseInput(logoVariantSchema, variant);
    const file = parseLogoForm(formData);
    const refusal = validateLogo(file);
    if (refusal) throw new ApiError(refusal, 422, 422);
    return postLogo(endpoint, formData, chosen);
  });
}

export async function removeOrgLogoAction(
  orgId: string,
  variant: LogoVariant
): Promise<ServerActionResult<null>> {
  return wrapServerAction(async () => {
    const params = { variant: parseInput(logoVariantSchema, variant) };
    await call(`/${id(orgId)}/logo`, { method: "DELETE", params }, z.null());
    return null;
  });
}
