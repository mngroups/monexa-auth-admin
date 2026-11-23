"use client";

import { unwrapServerAction } from "@mono/auth";
import { getErrorMessage } from "@mono/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useActiveOrgId } from "@/features/admin-shared/hooks/use-active-org";
import { toast } from "@/lib/toast";

import { getBrandingAction, removeLogoAction, uploadLogoAction } from "../actions/branding.actions";

export const BRANDING_KEY = ["branding"] as const;

export function useBranding() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...BRANDING_KEY, orgId],
    queryFn: async () => unwrapServerAction(await getBrandingAction()),
    staleTime: 30_000,
  });
}

function useBrandingMutationOptions(successMessage: string) {
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  return {
    onSuccess: async () => {
      toast.success(successMessage);
      await queryClient.invalidateQueries({ queryKey: [...BRANDING_KEY, orgId] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  };
}

export function useUploadLogo() {
  const options = useBrandingMutationOptions("Logo disimpan.");
  return useMutation({
    ...options,
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.set("file", file);
      return unwrapServerAction(await uploadLogoAction(formData));
    },
  });
}

export function useRemoveLogo() {
  const options = useBrandingMutationOptions("Logo dihapus.");
  return useMutation({
    ...options,
    mutationFn: async () => unwrapServerAction(await removeLogoAction()),
  });
}
