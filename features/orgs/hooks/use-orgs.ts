"use client";

import { unwrapServerAction } from "@mono/auth";
import { getErrorMessage } from "@mono/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useActiveOrgId } from "@/features/admin-shared/hooks/use-active-org";
import type { PageParams } from "@/features/admin-shared/schema";
import { SWITCHER_ORGS_KEY } from "@/features/app-shell/components/org-switcher";
import { toast } from "@/lib/toast";

import {
  createOrgAction,
  listOrgAppsAction,
  listOrgsAction,
  removeOrgLogoAction,
  setOrgActiveAction,
  setOrgAppAction,
  updateOrgAction,
  uploadOrgLogoAction,
} from "../actions/orgs.actions";
import type { OrgFormValues, OrgUpdateValues } from "../schema";

export const ORGS_KEY = ["orgs"] as const;
export const ORG_APPS_KEY = ["org-apps"] as const;

/** `staleTime`: 0 for the managed list, a positive value for a picker that only needs names. */
export function useOrgs(params: PageParams, options: { staleTime: number; enabled?: boolean }) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...ORGS_KEY, orgId, params],
    queryFn: async () => unwrapServerAction(await listOrgsAction(params)),
    enabled: options.enabled ?? true,
    placeholderData: (prev) => prev,
    staleTime: options.staleTime,
  });
}

/** The apps an org may use; fetched only while the detail modal's Aplikasi tab is open. */
export function useOrgApps(targetOrgId: string, enabled: boolean) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...ORG_APPS_KEY, orgId, targetOrgId],
    queryFn: async () => unwrapServerAction(await listOrgAppsAction(targetOrgId)),
    enabled,
    staleTime: 0,
  });
}

function useOrgMutationOptions(successMessage?: string) {
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  return {
    onSuccess: async () => {
      if (successMessage) toast.success(successMessage);
      await queryClient.invalidateQueries({ queryKey: [...ORGS_KEY, orgId] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  };
}

export function useCreateOrg() {
  return useMutation({
    ...useOrgMutationOptions("Organisasi dibuat."),
    mutationFn: async (values: OrgFormValues) => unwrapServerAction(await createOrgAction(values)),
  });
}

/**
 * Renaming the ACTIVE org also changes what the shell shows: the switcher's
 * list is invalidated and the server-rendered layout refreshed.
 */
export function useUpdateOrg() {
  const activeOrgId = useActiveOrgId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const options = useOrgMutationOptions("Organisasi disimpan.");
  return useMutation({
    ...options,
    mutationFn: async (v: { id: string; values: OrgUpdateValues }) =>
      unwrapServerAction(await updateOrgAction(v.id, v.values)),
    onSuccess: async (_data, v) => {
      await options.onSuccess();
      if (v.id === activeOrgId) {
        await queryClient.invalidateQueries({ queryKey: SWITCHER_ORGS_KEY });
        router.refresh();
      }
    },
  });
}

export function useSetOrgActive() {
  return useMutation({
    ...useOrgMutationOptions(),
    mutationFn: async (v: { id: string; active: boolean }) =>
      unwrapServerAction(await setOrgActiveAction(v.id, v.active)),
  });
}

export function useSetOrgApp(targetOrgId: string) {
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { appId: string; enabled: boolean }) =>
      unwrapServerAction(await setOrgAppAction(targetOrgId, v.appId, v.enabled)),
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: [...ORG_APPS_KEY, orgId, targetOrgId] }),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useUploadOrgLogo(targetOrgId: string) {
  return useMutation({
    ...useOrgMutationOptions("Logo disimpan."),
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.set("file", file);
      return unwrapServerAction(await uploadOrgLogoAction(targetOrgId, formData));
    },
  });
}

export function useRemoveOrgLogo(targetOrgId: string) {
  return useMutation({
    ...useOrgMutationOptions("Logo dihapus."),
    mutationFn: async () => unwrapServerAction(await removeOrgLogoAction(targetOrgId)),
  });
}
