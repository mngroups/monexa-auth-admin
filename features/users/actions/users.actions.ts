"use server";

import {
  ApiError,
  apiEnvelope,
  type ServerActionResult,
  throwIfFail,
  wrapServerAction,
} from "@mono/auth";
import type { z } from "zod";

import { generateTemporaryPassword } from "@/features/admin-shared/actions/temporary-password";
import type { PageParams } from "@/features/admin-shared/schema";
import { apiClient } from "@/lib/session";

import {
  type CreateUserValues,
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

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(`${label} tidak valid`, 400, 400);
  }
  return value;
};

const idPath = (id: string) => `/${encodeURIComponent(text(id, "Pengguna"))}`;

export async function listUsersAction(params: PageParams): Promise<ServerActionResult<UsersPage>> {
  return wrapServerAction(() =>
    call("", { method: "GET", params: { ...params } }, usersPageSchema)
  );
}

export async function createUserAction(
  values: CreateUserValues
): Promise<ServerActionResult<{ user: User; temporaryPassword: string }>> {
  return wrapServerAction(async () => {
    const temporaryPassword = generateTemporaryPassword();
    const user = await call(
      "",
      {
        method: "POST",
        body: {
          email: text(values?.email, "Email"),
          username: values.username || undefined,
          name: text(values.name, "Nama"),
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
    call(`${idPath(id)}/${active ? "activate" : "deactivate"}`, { method: "POST" }, userSchema)
  );
}

export async function setPlatformAdminAction(
  id: string,
  on: boolean
): Promise<ServerActionResult<User>> {
  return wrapServerAction(() =>
    call(`${idPath(id)}/platform-admin`, { method: on ? "PUT" : "DELETE" }, userSchema)
  );
}

export async function resetUserPasswordAction(
  id: string
): Promise<ServerActionResult<{ temporaryPassword: string }>> {
  return wrapServerAction(async () => {
    const temporaryPassword = generateTemporaryPassword();
    await call(
      `${idPath(id)}/reset-password`,
      { method: "POST", body: { temporaryPassword } },
      userSchema
    );
    return { temporaryPassword };
  });
}
