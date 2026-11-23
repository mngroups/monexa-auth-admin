"use server";

import { apiEnvelope, type ServerActionResult, throwIfFail, wrapServerAction } from "@mono/auth";
import { z } from "zod";
import type { PageParams } from "@/features/admin-shared/schema";
import { idSchema, pageParamsSchema, parseInput } from "@/features/admin-shared/validation";
import { apiClient } from "@/lib/session";

import {
  type App,
  type AppInput,
  type AppPermission,
  type AppRole,
  type AppsPage,
  type AppUpdateInput,
  appCreatedSchema,
  appCreateInputSchema,
  appSchema,
  appsPageSchema,
  appUpdateInputSchema,
  permissionInputSchema,
  permissionSchema,
  permissionStringSchema,
  permissionsSchema,
  roleCreateInputSchema,
  rolePermissionsSchema,
  roleSchema,
  rolesSchema,
  roleUpdateInputSchema,
  rotatedSecretSchema,
} from "../schema";

const BASE = "/api/admin/platform/apps";

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
const permissionId = (value: unknown): string =>
  encodeURIComponent(parseInput(permissionStringSchema, value));
const flag = (value: unknown) => parseInput(z.boolean(), value);

const noContent = z.unknown().nullable().optional();

export async function listAppsAction(params: PageParams): Promise<ServerActionResult<AppsPage>> {
  return wrapServerAction(() =>
    call("", { method: "GET", params: { ...parseInput(pageParamsSchema, params) } }, appsPageSchema)
  );
}

export async function getAppAction(appId: string): Promise<ServerActionResult<App>> {
  return wrapServerAction(() => call(`/${id(appId)}`, { method: "GET" }, appSchema));
}

/** The plaintext `clientSecret` is returned once; callers must not cache it. */
export async function createAppAction(
  input: AppInput
): Promise<ServerActionResult<{ app: App; clientSecret: string }>> {
  return wrapServerAction(async () => {
    const { clientSecret, ...app } = await call(
      "",
      { method: "POST", body: parseInput(appCreateInputSchema, input) },
      appCreatedSchema
    );
    return { app, clientSecret };
  });
}

export async function updateAppAction(
  appId: string,
  values: AppUpdateInput
): Promise<ServerActionResult<App>> {
  return wrapServerAction(() =>
    call(
      `/${id(appId)}`,
      { method: "PATCH", body: parseInput(appUpdateInputSchema, values) },
      appSchema
    )
  );
}

export async function setAppActiveAction(
  appId: string,
  active: boolean
): Promise<ServerActionResult<App>> {
  return wrapServerAction(() =>
    call(`/${id(appId)}/${flag(active) ? "activate" : "deactivate"}`, { method: "POST" }, appSchema)
  );
}

export async function rotateSecretAction(
  appId: string
): Promise<ServerActionResult<{ clientSecret: string }>> {
  return wrapServerAction(async () => {
    const { clientSecret } = await call(
      `/${id(appId)}/rotate-secret`,
      { method: "POST" },
      rotatedSecretSchema
    );
    return { clientSecret };
  });
}

export async function listPermissionsAction(
  appId: string
): Promise<ServerActionResult<AppPermission[]>> {
  return wrapServerAction(() =>
    call(`/${id(appId)}/permissions`, { method: "GET" }, permissionsSchema)
  );
}

export async function addPermissionAction(
  appId: string,
  values: { permission: string; description?: string }
): Promise<ServerActionResult<AppPermission>> {
  return wrapServerAction(() =>
    call(
      `/${id(appId)}/permissions`,
      { method: "POST", body: parseInput(permissionInputSchema, values) },
      permissionSchema
    )
  );
}

export async function removePermissionAction(
  appId: string,
  permission: string
): Promise<ServerActionResult<null>> {
  return wrapServerAction(async () => {
    await call(
      `/${id(appId)}/permissions/${permissionId(permission)}`,
      { method: "DELETE" },
      noContent
    );
    return null;
  });
}

export async function listRolesAction(appId: string): Promise<ServerActionResult<AppRole[]>> {
  return wrapServerAction(() => call(`/${id(appId)}/roles`, { method: "GET" }, rolesSchema));
}

export async function createRoleAction(
  appId: string,
  values: { name: string; description?: string; permissions?: string[] }
): Promise<ServerActionResult<AppRole>> {
  return wrapServerAction(() =>
    call(
      `/${id(appId)}/roles`,
      { method: "POST", body: parseInput(roleCreateInputSchema, values) },
      roleSchema
    )
  );
}

export async function updateRoleAction(
  appId: string,
  roleId: string,
  values: { name?: string; description?: string }
): Promise<ServerActionResult<AppRole>> {
  return wrapServerAction(() =>
    call(
      `/${id(appId)}/roles/${id(roleId)}`,
      { method: "PATCH", body: parseInput(roleUpdateInputSchema, values) },
      roleSchema
    )
  );
}

export async function deleteRoleAction(
  appId: string,
  roleId: string
): Promise<ServerActionResult<null>> {
  return wrapServerAction(async () => {
    await call(`/${id(appId)}/roles/${id(roleId)}`, { method: "DELETE" }, noContent);
    return null;
  });
}

export async function setRolePermissionsAction(
  appId: string,
  roleId: string,
  permissions: string[]
): Promise<ServerActionResult<AppRole>> {
  return wrapServerAction(() =>
    call(
      `/${id(appId)}/roles/${id(roleId)}/permissions`,
      { method: "PUT", body: parseInput(rolePermissionsSchema, { permissions }) },
      roleSchema
    )
  );
}
