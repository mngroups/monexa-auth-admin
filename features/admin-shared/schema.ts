import { z } from "zod";

/** Paged list payload used by every `/api/admin/*` list endpoint. */
export const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  });

export type PageParams = { page: number; pageSize: number; q?: string };
