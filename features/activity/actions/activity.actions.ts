"use server";

import { apiEnvelope, type ServerActionResult, throwIfFail, wrapServerAction } from "@mono/auth";

import { apiClient } from "@/lib/session";

import { type ActivityPage, type ActivityParams, activityPageSchema } from "../schema";

const PATHS = {
  org: "/api/admin/org/activity",
  platform: "/api/admin/platform/activity",
} as const;

// Errors are wrapped (not thrown) so the BE's message survives the Server
// Action boundary in production; hooks unwrap them again.
export async function listActivityAction(
  params: ActivityParams
): Promise<ServerActionResult<ActivityPage>> {
  return wrapServerAction(async () => {
    const { scope, orgId, ...rest } = params;
    // The org endpoint acts on the active org only: never send an org id to it.
    const query = scope === "platform" && orgId ? { ...rest, orgId } : rest;
    const res = await apiClient(
      PATHS[scope],
      { method: "GET", params: { ...query } },
      apiEnvelope(activityPageSchema)
    );
    throwIfFail(res);
    return (res as { data: unknown }).data as ActivityPage;
  });
}
