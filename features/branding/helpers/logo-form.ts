import { z } from "zod";

import { parseInput } from "@/features/admin-shared/validation";

const logoFormSchema = z
  .instanceof(FormData)
  .refine((form) => [...form.keys()].join() === "file")
  .transform((form) => form.get("file"))
  .pipe(z.instanceof(File));

/** The logo upload's FormData must carry exactly one `file` field holding a File. */
export function parseLogoForm(formData: unknown): File {
  return parseInput(logoFormSchema, formData);
}
