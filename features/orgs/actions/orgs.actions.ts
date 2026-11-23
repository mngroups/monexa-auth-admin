"use server";

import { apiEnvelope, type ServerActionResult, throwIfFail, wrapServerAction } from "@mono/auth";

import type { PageParams } from "@/features/admin-shared/schema";
import { apiClient } from "@/lib/session";

import { type OrgsPage, orgsPageSchema } from "../schema";

// Errors are wrapped (not thrown) so the BE's message survives the Server
// Action boundary in production; hooks unwrap them again.

export async function listOrgsAction(params: PageParams): Promise<ServerActionResult<OrgsPage>> {
  return wrapServerAction(async () => {
    const res = await apiClient(
      "/api/admin/platform/orgs",
      { method: "GET", params: { ...params } },
      apiEnvelope(orgsPageSchema)
    );
    throwIfFail(res);
    return (res as { data: unknown }).data as OrgsPage;
  });
}
