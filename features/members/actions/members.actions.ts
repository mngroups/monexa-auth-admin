"use server";

import { apiEnvelope, type ServerActionResult, throwIfFail, wrapServerAction } from "@mono/auth";
import { z } from "zod";

import { generateTemporaryPassword } from "@/features/admin-shared/actions/temporary-password";
import type { PageParams } from "@/features/admin-shared/schema";
import { idSchema, pageParamsSchema, parseInput } from "@/features/admin-shared/validation";
import { apiClient } from "@/lib/session";

import {
  type CreateMemberValues,
  createMemberSchema,
  type ExistingMemberValues,
  existingMemberSchema,
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

const rolesBodySchema = z.object({ roleIds: z.array(idSchema).max(500) });
const memberId = (value: unknown) => encodeURIComponent(parseInput(idSchema, value));

export async function listMembersAction(
  params: PageParams
): Promise<ServerActionResult<MembersPage>> {
  return wrapServerAction(() =>
    call(
      "/members",
      { method: "GET", params: { ...parseInput(pageParamsSchema, params) } },
      membersPageSchema
    )
  );
}

export async function createMemberAction(
  values: CreateMemberValues
): Promise<ServerActionResult<{ member: Member; temporaryPassword: string }>> {
  return wrapServerAction(async () => {
    const input = parseInput(createMemberSchema, values);
    const temporaryPassword = generateTemporaryPassword();
    const member = await call(
      "/members",
      {
        method: "POST",
        body: {
          email: input.email,
          username: input.username || undefined,
          name: input.name,
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
      { method: "POST", body: { email: parseInput(existingMemberSchema, values).email } },
      memberSchema
    )
  );
}

export async function removeMemberAction(
  userId: string
): Promise<ServerActionResult<{ userId: string }>> {
  return wrapServerAction(() =>
    call(`/members/${memberId(userId)}`, { method: "DELETE" }, removedMemberSchema)
  );
}

export async function setMemberActiveAction(
  userId: string,
  active: boolean
): Promise<ServerActionResult<Member>> {
  return wrapServerAction(() =>
    call(
      `/members/${memberId(userId)}/${parseInput(z.boolean(), active) ? "activate" : "deactivate"}`,
      { method: "POST" },
      memberSchema
    )
  );
}

export async function resetMemberPasswordAction(
  userId: string
): Promise<ServerActionResult<{ temporaryPassword: string }>> {
  return wrapServerAction(async () => {
    const path = `/members/${memberId(userId)}/reset-password`;
    const temporaryPassword = generateTemporaryPassword();
    await call(path, { method: "POST", body: { temporaryPassword } }, memberSchema);
    return { temporaryPassword };
  });
}

export async function setMemberRolesAction(
  userId: string,
  roleIds: string[]
): Promise<ServerActionResult<Member>> {
  return wrapServerAction(() =>
    call(
      `/members/${memberId(userId)}/roles`,
      { method: "PUT", body: parseInput(rolesBodySchema, { roleIds }) },
      memberSchema
    )
  );
}

export async function listOrgRolesAction(): Promise<ServerActionResult<OrgRole[]>> {
  return wrapServerAction(() => call("/roles", { method: "GET" }, z.array(orgRoleSchema)));
}
