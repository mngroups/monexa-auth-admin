"use server";

import {
  ApiError,
  apiEnvelope,
  type ServerActionResult,
  throwIfFail,
  wrapServerAction,
} from "@mono/auth";
import { z } from "zod";

import { generateTemporaryPassword } from "@/features/admin-shared/actions/temporary-password";
import type { PageParams } from "@/features/admin-shared/schema";
import { apiClient } from "@/lib/session";

import {
  type CreateMemberValues,
  type ExistingMemberValues,
  type Member,
  type MembersPage,
  memberSchema,
  membersPageSchema,
  type OrgRole,
  orgRoleSchema,
  removedMemberSchema,
} from "../schema";

const BASE = "/api/admin/org";

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

export async function listMembersAction(
  params: PageParams
): Promise<ServerActionResult<MembersPage>> {
  return wrapServerAction(() =>
    call("/members", { method: "GET", params: { ...params } }, membersPageSchema)
  );
}

export async function createMemberAction(
  values: CreateMemberValues
): Promise<ServerActionResult<{ member: Member; temporaryPassword: string }>> {
  return wrapServerAction(async () => {
    const temporaryPassword = generateTemporaryPassword();
    const member = await call(
      "/members",
      {
        method: "POST",
        body: {
          email: text(values?.email, "Email"),
          username: values.username || undefined,
          name: text(values.name, "Nama"),
          temporaryPassword,
        },
      },
      memberSchema
    );
    return { member, temporaryPassword };
  });
}

export async function addExistingMemberAction(
  values: ExistingMemberValues
): Promise<ServerActionResult<Member>> {
  return wrapServerAction(() =>
    call(
      "/members/existing",
      { method: "POST", body: { email: text(values?.email, "Email") } },
      memberSchema
    )
  );
}

export async function removeMemberAction(
  userId: string
): Promise<ServerActionResult<{ userId: string }>> {
  return wrapServerAction(() =>
    call(
      `/members/${encodeURIComponent(text(userId, "Anggota"))}`,
      { method: "DELETE" },
      removedMemberSchema
    )
  );
}

export async function setMemberActiveAction(
  userId: string,
  active: boolean
): Promise<ServerActionResult<Member>> {
  return wrapServerAction(() =>
    call(
      `/members/${encodeURIComponent(text(userId, "Anggota"))}/${active ? "activate" : "deactivate"}`,
      { method: "POST" },
      memberSchema
    )
  );
}

export async function resetMemberPasswordAction(
  userId: string
): Promise<ServerActionResult<{ temporaryPassword: string }>> {
  return wrapServerAction(async () => {
    const temporaryPassword = generateTemporaryPassword();
    await call(
      `/members/${encodeURIComponent(text(userId, "Anggota"))}/reset-password`,
      { method: "POST", body: { temporaryPassword } },
      memberSchema
    );
    return { temporaryPassword };
  });
}

export async function setMemberRolesAction(
  userId: string,
  roleIds: string[]
): Promise<ServerActionResult<Member>> {
  return wrapServerAction(() =>
    call(
      `/members/${encodeURIComponent(text(userId, "Anggota"))}/roles`,
      { method: "PUT", body: { roleIds: z.array(z.string()).parse(roleIds) } },
      memberSchema
    )
  );
}

export async function listOrgRolesAction(): Promise<ServerActionResult<OrgRole[]>> {
  return wrapServerAction(() => call("/roles", { method: "GET" }, z.array(orgRoleSchema)));
}
