"use server";

import { apiEnvelope, type ServerActionResult, throwIfFail, wrapServerAction } from "@mono/auth";
import { z } from "zod";

import { generateTemporaryPassword } from "@/features/admin-shared/actions/temporary-password";
import type { PageParams } from "@/features/admin-shared/schema";
import { idSchema, pageParamsSchema, parseInput } from "@/features/admin-shared/validation";
import { apiClient } from "@/lib/session";

import {
  type CreateUserValues,
  createUserSchema,
  type User,
  type UsersPage,
  userSchema,
  usersPageSchema,
} from "../schema";

const BASE = "/api/admin/platform/users";

// Errors are wrapped (not thrown) so the BE's Indonesian message survives the
// Server Action boundary in production; hooks unwrap them again.

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

const idPath = (id: unknown) => `/${encodeURIComponent(parseInput(idSchema, id))}`;
const flag = (value: unknown) => parseInput(z.boolean(), value);

export async function listUsersAction(params: PageParams): Promise<ServerActionResult<UsersPage>> {
  return wrapServerAction(() =>
    call(
      "",
      { method: "GET", params: { ...parseInput(pageParamsSchema, params) } },
      usersPageSchema
    )
  );
}

export async function createUserAction(
  values: CreateUserValues
): Promise<ServerActionResult<{ user: User; temporaryPassword: string }>> {
  return wrapServerAction(async () => {
    const input = parseInput(createUserSchema, values);
    const temporaryPassword = generateTemporaryPassword();
    const user = await call(
      "",
      {
        method: "POST",
        body: {
          email: input.email,
          username: input.username || undefined,
          name: input.name,
          temporaryPassword,
        },
      },
      userSchema
    );
    return { user, temporaryPassword };
  });
}

export async function setUserActiveAction(
  id: string,
  active: boolean
): Promise<ServerActionResult<User>> {
  return wrapServerAction(() =>
    call(
      `${idPath(id)}/${flag(active) ? "activate" : "deactivate"}`,
      { method: "POST" },
      userSchema
    )
  );
}

export async function setPlatformAdminAction(
  id: string,
  on: boolean
): Promise<ServerActionResult<User>> {
  return wrapServerAction(() =>
    call(`${idPath(id)}/platform-admin`, { method: flag(on) ? "PUT" : "DELETE" }, userSchema)
  );
}

export async function resetUserPasswordAction(
  id: string
): Promise<ServerActionResult<{ temporaryPassword: string }>> {
  return wrapServerAction(async () => {
    const path = `${idPath(id)}/reset-password`;
    const temporaryPassword = generateTemporaryPassword();
    await call(path, { method: "POST", body: { temporaryPassword } }, userSchema);
    return { temporaryPassword };
  });
}
