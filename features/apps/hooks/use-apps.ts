"use client";

import { unwrapServerAction } from "@mono/auth";
import { getErrorMessage } from "@mono/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useActiveOrgId } from "@/features/admin-shared/hooks/use-active-org";
import type { PageParams } from "@/features/admin-shared/schema";
import { toast } from "@/lib/toast";

import {
  addPermissionAction,
  createAppAction,
  createRoleAction,
  deleteRoleAction,
  getAppAction,
  listAppsAction,
  listPermissionsAction,
  listRolesAction,
  removePermissionAction,
  rotateSecretAction,
  setAppActiveAction,
  setRolePermissionsAction,
  updateAppAction,
  updateRoleAction,
} from "../actions/apps.actions";
import type { AppInput, AppUpdateInput } from "../schema";

export const APPS_KEY = ["apps"] as const;

export function useApps(params: PageParams) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...APPS_KEY, orgId, "list", params],
    queryFn: async () => unwrapServerAction(await listAppsAction(params)),
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}

export function useApp(appId: string) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...APPS_KEY, orgId, "detail", appId],
    queryFn: async () => unwrapServerAction(await getAppAction(appId)),
    staleTime: 0,
  });
}

/** The app's permission catalog. */
export function useAppPermissions(appId: string) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...APPS_KEY, orgId, "permissions", appId],
    queryFn: async () => unwrapServerAction(await listPermissionsAction(appId)),
    staleTime: 0,
  });
}

export function useAppRoles(appId: string) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...APPS_KEY, orgId, "roles", appId],
    queryFn: async () => unwrapServerAction(await listRolesAction(appId)),
    staleTime: 0,
  });
}

/** Every app mutation refreshes the whole apps subtree (list, detail, catalog, roles). */
function useAppMutationOptions(successMessage?: string) {
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  return {
    onSuccess: async () => {
      if (successMessage) toast.success(successMessage);
      await queryClient.invalidateQueries({ queryKey: [...APPS_KEY, orgId] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  };
}

/**
 * The client secret is handed to `onSecret` (the caller's component state)
 * from inside the mutation and never returned, so no mutation or query cache
 * entry ever holds it. `gcTime: 0` as a second guard.
 */
export function useCreateApp(onSecret: (clientSecret: string) => void) {
  return useMutation({
    ...useAppMutationOptions("Aplikasi dibuat."),
    gcTime: 0,
    mutationFn: async (input: AppInput) => {
      const { app, clientSecret } = unwrapServerAction(await createAppAction(input));
      onSecret(clientSecret);
      return app;
    },
  });
}

export function useRotateSecret(onSecret: (clientSecret: string) => void) {
  return useMutation({
    ...useAppMutationOptions(),
    gcTime: 0,
    mutationFn: async (appId: string) => {
      const { clientSecret } = unwrapServerAction(await rotateSecretAction(appId));
      onSecret(clientSecret);
    },
  });
}

export function useUpdateApp(appId: string) {
  return useMutation({
    ...useAppMutationOptions("Pengaturan disimpan."),
    mutationFn: async (values: AppUpdateInput) =>
      unwrapServerAction(await updateAppAction(appId, values)),
  });
}

export function useSetAppActive(appId: string) {
  return useMutation({
    ...useAppMutationOptions(),
    mutationFn: async (active: boolean) =>
      unwrapServerAction(await setAppActiveAction(appId, active)),
  });
}

export function useAddPermission(appId: string) {
  return useMutation({
    ...useAppMutationOptions("Permission ditambahkan."),
    mutationFn: async (v: { permission: string; description?: string }) =>
      unwrapServerAction(await addPermissionAction(appId, v)),
  });
}

export function useRemovePermission(appId: string) {
  return useMutation({
    ...useAppMutationOptions("Permission dihapus."),
    mutationFn: async (permission: string) =>
      unwrapServerAction(await removePermissionAction(appId, permission)),
  });
}

export function useCreateRole(appId: string) {
  return useMutation({
    ...useAppMutationOptions("Role dibuat."),
    mutationFn: async (v: { name: string; description?: string }) =>
      unwrapServerAction(await createRoleAction(appId, v)),
  });
}

export function useUpdateRole(appId: string) {
  return useMutation({
    ...useAppMutationOptions("Role disimpan."),
    mutationFn: async (v: { roleId: string; name: string; description?: string }) =>
      unwrapServerAction(
        await updateRoleAction(appId, v.roleId, { name: v.name, description: v.description })
      ),
  });
}

export function useDeleteRole(appId: string) {
  return useMutation({
    ...useAppMutationOptions("Role dihapus."),
    mutationFn: async (roleId: string) => unwrapServerAction(await deleteRoleAction(appId, roleId)),
  });
}

export function useSetRolePermissions(appId: string) {
  return useMutation({
    ...useAppMutationOptions("Permission role disimpan."),
    mutationFn: async (v: { roleId: string; permissions: string[] }) =>
      unwrapServerAction(await setRolePermissionsAction(appId, v.roleId, v.permissions)),
  });
}
