"use client";

import { unwrapServerAction } from "@mono/auth";
import { getErrorMessage } from "@mono/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PageParams } from "@/features/admin-shared/schema";
import { toast } from "@/lib/toast";

import {
  createUserAction,
  listUsersAction,
  resetUserPasswordAction,
  setPlatformAdminAction,
  setUserActiveAction,
} from "../actions/users.actions";
import type { CreateUserValues } from "../schema";

export const USERS_KEY = ["platform-users"] as const;

export function useUsers(params: PageParams) {
  return useQuery({
    queryKey: [...USERS_KEY, params],
    queryFn: async () => unwrapServerAction(await listUsersAction(params)),
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}

/** Shared mutation options: refresh the user lists, toast the BE message on error. */
function useUserMutationOptions() {
  const queryClient = useQueryClient();
  return {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  };
}

/**
 * The generated temporary password is handed to `onSecret` (the caller's
 * component state) from inside the mutation and never returned, so no
 * mutation or query cache entry ever holds it. `gcTime: 0` as a second guard.
 */
export function useCreateUser(onSecret: (temporaryPassword: string) => void) {
  const options = useUserMutationOptions();
  return useMutation({
    ...options,
    gcTime: 0,
    mutationFn: async (values: CreateUserValues) => {
      const { user, temporaryPassword } = unwrapServerAction(await createUserAction(values));
      onSecret(temporaryPassword);
      return user;
    },
  });
}

export function useResetUserPassword(onSecret: (temporaryPassword: string) => void) {
  const options = useUserMutationOptions();
  return useMutation({
    ...options,
    gcTime: 0,
    mutationFn: async (id: string) => {
      const { temporaryPassword } = unwrapServerAction(await resetUserPasswordAction(id));
      onSecret(temporaryPassword);
    },
  });
}

export function useSetUserActive() {
  const options = useUserMutationOptions();
  return useMutation({
    ...options,
    mutationFn: async (v: { id: string; active: boolean }) =>
      unwrapServerAction(await setUserActiveAction(v.id, v.active)),
  });
}

export function useSetPlatformAdmin() {
  const options = useUserMutationOptions();
  return useMutation({
    ...options,
    mutationFn: async (v: { id: string; on: boolean }) =>
      unwrapServerAction(await setPlatformAdminAction(v.id, v.on)),
  });
}
