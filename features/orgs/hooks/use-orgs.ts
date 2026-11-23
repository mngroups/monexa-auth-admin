"use client";

import { unwrapServerAction } from "@mono/auth";
import { useQuery } from "@tanstack/react-query";

import { useActiveOrgId } from "@/features/admin-shared/hooks/use-active-org";
import type { PageParams } from "@/features/admin-shared/schema";

import { listOrgsAction } from "../actions/orgs.actions";

export const ORGS_KEY = ["orgs"] as const;

export function useOrgs(params: PageParams, enabled = true) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...ORGS_KEY, orgId, params],
    queryFn: async () => unwrapServerAction(await listOrgsAction(params)),
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
