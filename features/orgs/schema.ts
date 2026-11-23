import { z } from "zod";
import { pageOf } from "@/features/admin-shared/schema";
import { logoMetaSchema } from "@/features/branding/schema";

export const orgSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  logo: logoMetaSchema.nullable().optional(),
  logoDark: logoMetaSchema.nullable().optional(),
});

export const orgsPageSchema = pageOf(orgSchema);

export type Org = z.infer<typeof orgSchema>;
export type OrgsPage = z.infer<typeof orgsPageSchema>;

/** A list row: the BE org plus its public logo URLs, built server-side. */
export type OrgListItem = Org & { logoUrl: string | null; logoDarkUrl: string | null };
export type OrgsListPage = Omit<OrgsPage, "items"> & { items: OrgListItem[] };

export const orgAppSchema = z.object({
  appId: z.string(),
  clientId: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  enabled: z.boolean(),
});
export const orgAppsSchema = z.array(orgAppSchema);
export type OrgApp = z.infer<typeof orgAppSchema>;

export const orgAppToggleSchema = z.object({
  orgId: z.string(),
  appId: z.string(),
  enabled: z.boolean(),
  revokedGrants: z.number(),
});
export type OrgAppToggle = z.infer<typeof orgAppToggleSchema>;

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const orgFormSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi"),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .max(63, "Slug maksimal 63 karakter")
    .regex(SLUG_PATTERN, "Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)."),
});
export type OrgFormValues = z.infer<typeof orgFormSchema>;

/** PATCH body: only the fields that changed. */
export type OrgUpdateValues = Partial<OrgFormValues>;
