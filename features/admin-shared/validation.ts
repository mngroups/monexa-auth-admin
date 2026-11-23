import { ApiError } from "@mono/auth";
import { z } from "zod";

/** What every Server Action answers (inside `wrapServerAction`) to arguments that fail their schema. */
export const INVALID_INPUT = "Data tidak valid";

/** A Server Action is a public endpoint: its arguments are untrusted, whatever the TypeScript types say. */
export function parseInput<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ApiError(INVALID_INPUT, 400, 400);
  return parsed.data;
}

export const idSchema = z.uuid();

/** Mirrors the BE's `pageQuery` (page >= 1, pageSize 1..100). */
export const pageParamsSchema = z
  .object({
    page: z.number().int().min(1).max(100_000),
    pageSize: z.number().int().min(1).max(100),
    q: z.string().max(200).optional(),
  })
  .strict();
