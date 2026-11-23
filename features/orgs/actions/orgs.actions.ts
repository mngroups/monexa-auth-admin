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
import { postLogo } from "@/features/branding/actions/upload-logo";
import { buildLogoUrl } from "@/features/branding/helpers/logo-url";
import { type LogoMeta, validateLogo } from "@/features/branding/schema";
import { apiClient } from "@/lib/session";

import {
  type Org,
  type OrgApp,
  type OrgAppToggle,
  type OrgFormValues,
  type OrgsListPage,
  orgAppsSchema,
  orgAppToggleSchema,
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

const id = (value: unknown, label = "Organisasi"): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(`${label} tidak valid`, 400, 400);
  }
  return encodeURIComponent(value);
};

export async function listOrgsAction(
  params: PageParams
): Promise<ServerActionResult<OrgsListPage>> {
  return wrapServerAction(async () => {
    const page = await call("", { method: "GET", params: { ...params } }, orgsPageSchema);
    return {
      ...page,
      items: page.items.map((org) => ({ ...org, logoUrl: buildLogoUrl(org.slug, org.logo) })),
    };
  });
}

export async function createOrgAction(values: OrgFormValues): Promise<ServerActionResult<Org>> {
  return wrapServerAction(() =>
    call("", { method: "POST", body: { slug: values.slug, name: values.name } }, orgSchema)
  );
}

export async function updateOrgAction(
  orgId: string,
  values: { slug?: string; name?: string }
): Promise<ServerActionResult<Org>> {
  return wrapServerAction(() =>
    call(`/${id(orgId)}`, { method: "PATCH", body: values }, orgSchema)
  );
}

export async function setOrgActiveAction(
  orgId: string,
  active: boolean
): Promise<ServerActionResult<Org>> {
  return wrapServerAction(() =>
    call(`/${id(orgId)}/${active ? "activate" : "deactivate"}`, { method: "POST" }, orgSchema)
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
      `/${id(orgId)}/apps/${id(appId, "Aplikasi")}`,
      { method: enabled ? "PUT" : "DELETE" },
      orgAppToggleSchema
    )
  );
}

export async function uploadOrgLogoAction(
  orgId: string,
  formData: FormData
): Promise<ServerActionResult<LogoMeta>> {
  return wrapServerAction(async () => {
    const endpoint = `${BASE}/${id(orgId)}/logo`;
    const file = formData?.get("file");
    if (!(file instanceof File)) throw new ApiError("Pilih file logo terlebih dahulu.", 400, 400);
    const refusal = validateLogo(file);
    if (refusal) throw new ApiError(refusal, 422, 422);
    return postLogo(endpoint, formData);
  });
}

export async function removeOrgLogoAction(orgId: string): Promise<ServerActionResult<null>> {
  return wrapServerAction(async () => {
    await call(`/${id(orgId)}/logo`, { method: "DELETE" }, z.null());
    return null;
  });
}
