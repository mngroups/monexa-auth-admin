import { z } from "zod";

import { pageOf } from "@/features/admin-shared/schema";

export const activityEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  actorUserId: z.string().nullable().optional(),
  orgId: z.string().nullable().optional(),
  action: z.string(),
  targetType: z.string().nullable().optional(),
  targetId: z.string().nullable().optional(),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  metadata: z.unknown().optional(),
});

export const activityPageSchema = pageOf(activityEntrySchema);

export type ActivityEntry = z.infer<typeof activityEntrySchema>;
export type ActivityPage = z.infer<typeof activityPageSchema>;

export type ActivityParams = {
  scope: "org" | "platform";
  page: number;
  pageSize: number;
  action?: string;
  from?: string;
  to?: string;
  /** Platform scope only. */
  orgId?: string;
};
