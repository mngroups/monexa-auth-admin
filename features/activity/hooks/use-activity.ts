"use client";

import { unwrapServerAction } from "@mono/auth";
import { useQuery } from "@tanstack/react-query";

import { useActiveOrgId } from "@/features/admin-shared/hooks/use-active-org";

import { listActivityAction } from "../actions/activity.actions";
import type { ActivityParams } from "../schema";

export const ACTIVITY_KEY = ["activity"] as const;

export function useActivity(params: ActivityParams) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: [...ACTIVITY_KEY, orgId, params],
    queryFn: async () => unwrapServerAction(await listActivityAction(params)),
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}
