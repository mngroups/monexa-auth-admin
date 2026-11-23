import { z } from "zod";

export const logoMetaSchema = z.object({ etag: z.string(), updatedAt: z.string() });
export type LogoMeta = z.infer<typeof logoMetaSchema>;

export const brandingSchema = z.object({
  slug: z.string(),
  name: z.string(),
  logo: logoMetaSchema.nullable(),
});

export type Branding = { slug: string; logoUrl: string | null };

/** Mirrors the BE: PNG, JPEG or WebP up to 512 KB. */
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const LOGO_MAX_BYTES = 524_288;
export const LOGO_TYPE_ERROR = "Logo harus berupa PNG, JPG, atau WebP.";
export const LOGO_SIZE_ERROR = "Ukuran logo maksimal 512 KB.";

/** The client-side check; returns the message to show, or null when the file may be sent. */
export function validateLogo(file: { type: string; size: number }): string | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return LOGO_TYPE_ERROR;
  if (file.size > LOGO_MAX_BYTES) return LOGO_SIZE_ERROR;
  return null;
}
