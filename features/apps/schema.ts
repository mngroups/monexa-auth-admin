import { z } from "zod";
import { pageOf } from "@/features/admin-shared/schema";

/** The admin UI's own OAuth client; the BE and this UI both refuse to deactivate it. */
export const ADMIN_CLIENT_ID = "monexa-admin";

export const GRANTS = ["password", "authorization_code"] as const;
export type Grant = (typeof GRANTS)[number];
export const GRANT_LABELS: Record<Grant, string> = {
  password: "Password",
  authorization_code: "Authorization code",
};

export const appSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  name: z.string(),
  redirectUris: z.array(z.string()),
  postLogoutRedirectUris: z.array(z.string()),
  allowedGrants: z.array(z.enum(GRANTS)),
  accessTtlSeconds: z.number(),
  refreshTtlSeconds: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const appsPageSchema = pageOf(appSchema);
/** POST /apps: the app plus its plaintext secret, returned only here. */
export const appCreatedSchema = appSchema.extend({ clientSecret: z.string() });
export const rotatedSecretSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
});

export const permissionSchema = z.object({
  permission: z.string(),
  description: z.string().nullable().optional(),
});
export const permissionsSchema = z.array(permissionSchema);

export const roleSchema = z.object({
  id: z.string(),
  appId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  permissions: z.array(z.string()),
  createdAt: z.string(),
});
export const rolesSchema = z.array(roleSchema);

export type App = z.infer<typeof appSchema>;
export type AppsPage = z.infer<typeof appsPageSchema>;
export type AppPermission = z.infer<typeof permissionSchema>;
export type AppRole = z.infer<typeof roleSchema>;

/** Body of POST /apps; PATCH takes the same fields minus `clientId`. */
export type AppInput = {
  clientId: string;
  name: string;
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  allowedGrants?: Grant[];
  accessTtlSeconds?: number;
  refreshTtlSeconds?: number;
};
export type AppUpdateInput = Omit<AppInput, "clientId">;

/** The BE's bounds and defaults (monexa-auth `apps.routes.ts`). Empty = let the BE decide. */
export const TTL_LIMITS = {
  access: { min: 60, max: 86_400, default: 600 },
  refresh: { min: 300, max: 31_536_000, default: 604_800 },
} as const;

const ttl = (limits: { min: number; max: number }) =>
  z
    .string()
    .trim()
    .regex(/^\d*$/, "Isi dengan angka bulat")
    .refine(
      (v) => v === "" || (Number(v) >= limits.min && Number(v) <= limits.max),
      `Harus antara ${limits.min.toLocaleString("id-ID")} dan ${limits.max.toLocaleString("id-ID")} detik`
    );

/** One URI per line; blank lines and surrounding spaces are dropped. */
export const parseLines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

export const URL_LINES_MESSAGE =
  "Setiap baris harus URL lengkap, mis. https://app.contoh.id/auth/callback";
// The BE accepts absolute http(s) URLs only.
const absoluteUrl = z.url({ protocol: /^https?$/ });
const urlLines = z
  .string()
  .refine((text) => parseLines(text).every((line) => absoluteUrl.safeParse(line).success), {
    message: URL_LINES_MESSAGE,
  });

export const appFormSchema = z.object({
  clientId: z.string().trim().min(1, "Client ID wajib diisi"),
  name: z.string().trim().min(1, "Nama wajib diisi"),
  redirectUris: urlLines,
  postLogoutRedirectUris: urlLines,
  allowedGrants: z.array(z.enum(GRANTS)).min(1, "Pilih minimal satu grant"),
  accessTtlSeconds: ttl(TTL_LIMITS.access),
  refreshTtlSeconds: ttl(TTL_LIMITS.refresh),
});
export type AppFormValues = z.infer<typeof appFormSchema>;

export const EMPTY_APP_FORM: AppFormValues = {
  clientId: "",
  name: "",
  redirectUris: "",
  postLogoutRedirectUris: "",
  allowedGrants: ["authorization_code"],
  // The BE's own defaults, so the form shows what an untouched create would get.
  accessTtlSeconds: String(TTL_LIMITS.access.default),
  refreshTtlSeconds: String(TTL_LIMITS.refresh.default),
};

export const appToFormValues = (app: App): AppFormValues => ({
  clientId: app.clientId,
  name: app.name,
  redirectUris: app.redirectUris.join("\n"),
  postLogoutRedirectUris: app.postLogoutRedirectUris.join("\n"),
  allowedGrants: app.allowedGrants,
  accessTtlSeconds: String(app.accessTtlSeconds),
  refreshTtlSeconds: String(app.refreshTtlSeconds),
});

export function toAppInput(values: AppFormValues): AppInput {
  return {
    clientId: values.clientId.trim(),
    name: values.name.trim(),
    redirectUris: parseLines(values.redirectUris),
    postLogoutRedirectUris: parseLines(values.postLogoutRedirectUris),
    allowedGrants: values.allowedGrants,
    ...(values.accessTtlSeconds ? { accessTtlSeconds: Number(values.accessTtlSeconds) } : {}),
    ...(values.refreshTtlSeconds ? { refreshTtlSeconds: Number(values.refreshTtlSeconds) } : {}),
  };
}

export function toAppUpdateInput(values: AppFormValues): AppUpdateInput {
  const { clientId: _clientId, ...rest } = toAppInput(values);
  return rest;
}

export const roleFormSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(80, "Nama maksimal 80 karakter"),
  // An empty string is what the BE accepts to clear a description (omitting it keeps the old one).
  description: z.string().trim().max(300, "Deskripsi maksimal 300 karakter"),
});
export type RoleFormValues = z.infer<typeof roleFormSchema>;

export const permissionFormSchema = z.object({
  permission: z.string().trim().min(1, "Permission wajib diisi"),
  description: z.string().trim(),
});
export type PermissionFormValues = z.infer<typeof permissionFormSchema>;

/* ---- Server Action argument schemas (the actions parse their input with these) ---- */

/** `group[.resource[.sub]]:action`, as the BE's `permissionString`. */
export const permissionStringSchema = z
  .string()
  .max(120)
  .regex(/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)*:[a-z][a-z0-9_-]*$/);

const requestUrls = z.array(z.url({ protocol: /^https?$/ })).max(50);
const appInputFields = {
  name: z.string().trim().min(1).max(120),
  redirectUris: requestUrls.optional(),
  postLogoutRedirectUris: requestUrls.optional(),
  allowedGrants: z.array(z.enum(GRANTS)).min(1).optional(),
  accessTtlSeconds: z
    .number()
    .int()
    .min(TTL_LIMITS.access.min)
    .max(TTL_LIMITS.access.max)
    .optional(),
  refreshTtlSeconds: z
    .number()
    .int()
    .min(TTL_LIMITS.refresh.min)
    .max(TTL_LIMITS.refresh.max)
    .optional(),
};
export const appCreateInputSchema = z
  .object({ clientId: z.string().trim().min(1).max(63), ...appInputFields })
  .strict();
export const appUpdateInputSchema = z.object(appInputFields).strict();

const roleDescription = z.string().trim().max(300);
export const permissionInputSchema = z
  .object({ permission: permissionStringSchema, description: roleDescription.optional() })
  .strict();
export const roleCreateInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: roleDescription.optional(),
    permissions: z.array(permissionStringSchema).max(500).optional(),
  })
  .strict();
export const roleUpdateInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: roleDescription.optional(),
  })
  .strict();
export const rolePermissionsSchema = z
  .object({ permissions: z.array(permissionStringSchema).max(500) })
  .strict();
