import { z } from "zod";

import { pageOf } from "@/features/admin-shared/schema";

export const memberRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  appId: z.string(),
});

export const memberSchema = z.object({
  userId: z.string(),
  email: z.string(),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  isActive: z.boolean(),
  mustChangePassword: z.boolean().optional(),
  roles: z.array(memberRoleSchema),
});

export const membersPageSchema = pageOf(memberSchema);

export const orgRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  appId: z.string(),
  appName: z.string(),
});

export const removedMemberSchema = z.object({ userId: z.string() });

export type Member = z.infer<typeof memberSchema>;
export type MembersPage = z.infer<typeof membersPageSchema>;
export type OrgRole = z.infer<typeof orgRoleSchema>;

export const createMemberSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Email tidak valid"),
  username: z.string(),
  name: z.string().min(1, "Nama wajib diisi"),
});
export type CreateMemberValues = z.infer<typeof createMemberSchema>;

export const existingMemberSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Email tidak valid"),
});
export type ExistingMemberValues = z.infer<typeof existingMemberSchema>;

export const memberRolesSchema = z.object({ roleIds: z.array(z.string()) });
export type MemberRolesValues = z.infer<typeof memberRolesSchema>;
