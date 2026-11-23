import { z } from "zod";

import { pageOf } from "@/features/admin-shared/schema";

export const orgSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  logo: z.unknown().nullable().optional(),
});

export const orgsPageSchema = pageOf(orgSchema);

export type Org = z.infer<typeof orgSchema>;
export type OrgsPage = z.infer<typeof orgsPageSchema>;
