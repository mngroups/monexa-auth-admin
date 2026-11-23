"use client";

import { unwrapServerAction } from "@mono/auth";
import { getErrorMessage } from "@mono/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useActiveOrgId } from "@/features/admin-shared/hooks/use-active-org";
import type { PageParams } from "@/features/admin-shared/schema";
import { toast } from "@/lib/toast";

import {
  addExistingMemberAction,
  createMemberAction,
  listMembersAction,
  listOrgRolesAction,
  removeMemberAction,
  resetMemberPasswordAction,
  setMemberActiveAction,
  setMemberRolesAction,
} from "../actions/members.actions";
import type { CreateMemberValues, ExistingMemberValues } from "../schema";

export const MEMBERS_KEY = ["members"] as const;
export const ORG_ROLES_KEY = ["org-roles"] as const;

export function useMembers(params: PageParams) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...MEMBERS_KEY, orgId, params],
    queryFn: async () => unwrapServerAction(await listMembersAction(params)),
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}

/** The org's assignable roles; fetched only while the roles modal is open. */
export function useOrgRoles(enabled: boolean) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...ORG_ROLES_KEY, orgId],
    queryFn: async () => unwrapServerAction(await listOrgRolesAction()),
    enabled,
    staleTime: 30_000,
  });
}

/** Shared mutation options: refresh the org's member lists, toast the BE message on error. */
function useMemberMutationOptions() {
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  return {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...MEMBERS_KEY, orgId] }),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  };
}

/**
 * The generated temporary password is handed to `onSecret` (the caller's
 * component state) from inside the mutation and never returned, so no
 * mutation or query cache entry ever holds it. `gcTime: 0` as a second guard.
 */
export function useCreateMember(onSecret: (temporaryPassword: string) => void) {
  const options = useMemberMutationOptions();
  return useMutation({
    ...options,
    gcTime: 0,
    mutationFn: async (values: CreateMemberValues) => {
      const { member, temporaryPassword } = unwrapServerAction(await createMemberAction(values));
      onSecret(temporaryPassword);
      return member;
    },
  });
}

export function useResetMemberPassword(onSecret: (temporaryPassword: string) => void) {
  const options = useMemberMutationOptions();
  return useMutation({
    ...options,
    gcTime: 0,
    mutationFn: async (userId: string) => {
      const { temporaryPassword } = unwrapServerAction(await resetMemberPasswordAction(userId));
      onSecret(temporaryPassword);
    },
  });
}

export function useAddExistingMember() {
  const options = useMemberMutationOptions();
  return useMutation({
    ...options,
    mutationFn: async (values: ExistingMemberValues) =>
      unwrapServerAction(await addExistingMemberAction(values)),
  });
}

export function useRemoveMember() {
  const options = useMemberMutationOptions();
  return useMutation({
    ...options,
    mutationFn: async (userId: string) => unwrapServerAction(await removeMemberAction(userId)),
  });
}

export function useSetMemberActive() {
  const options = useMemberMutationOptions();
  return useMutation({
    ...options,
    mutationFn: async (v: { userId: string; active: boolean }) =>
      unwrapServerAction(await setMemberActiveAction(v.userId, v.active)),
  });
}

export function useSetMemberRoles() {
  const options = useMemberMutationOptions();
  return useMutation({
    ...options,
    mutationFn: async (v: { userId: string; roleIds: string[] }) =>
      unwrapServerAction(await setMemberRolesAction(v.userId, v.roleIds)),
  });
}
