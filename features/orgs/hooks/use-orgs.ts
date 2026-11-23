"use client";

import { unwrapServerAction } from "@mono/auth";
import { getErrorMessage } from "@mono/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useActiveOrgId } from "@/features/admin-shared/hooks/use-active-org";
import type { PageParams } from "@/features/admin-shared/schema";
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
import type { OrgFormValues } from "../schema";

export const ORGS_KEY = ["orgs"] as const;
export const ORG_APPS_KEY = ["org-apps"] as const;

export function useOrgs(params: PageParams, enabled = true) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...ORGS_KEY, orgId, params],
    queryFn: async () => unwrapServerAction(await listOrgsAction(params)),
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 0,
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

export function useUpdateOrg() {
  return useMutation({
    ...useOrgMutationOptions("Organisasi disimpan."),
    mutationFn: async (v: { id: string; values: OrgFormValues }) =>
      unwrapServerAction(await updateOrgAction(v.id, v.values)),
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
