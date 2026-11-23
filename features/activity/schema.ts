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

export const activityParamsSchema = z
  .object({
    scope: z.enum(["org", "platform"]),
    page: z.number().int().min(1).max(100_000),
    pageSize: z.number().int().min(1).max(100),
    action: z.string().min(1).max(100).optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    /** Platform scope only. */
    orgId: z.uuid().optional(),
  })
  .strict();

export type ActivityParams = z.infer<typeof activityParamsSchema>;
