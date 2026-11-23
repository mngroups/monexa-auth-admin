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

const ttl = z
  .string()
  .trim()
  .regex(/^\d*$/, "Isi dengan angka bulat")
  .refine((v) => v === "" || Number(v) > 0, "Harus lebih dari 0");

export const appFormSchema = z.object({
  clientId: z.string().trim().min(1, "Client ID wajib diisi"),
  name: z.string().trim().min(1, "Nama wajib diisi"),
  redirectUris: z.string(),
  postLogoutRedirectUris: z.string(),
  allowedGrants: z.array(z.enum(GRANTS)).min(1, "Pilih minimal satu grant"),
  accessTtlSeconds: ttl,
  refreshTtlSeconds: ttl,
});
export type AppFormValues = z.infer<typeof appFormSchema>;

export const EMPTY_APP_FORM: AppFormValues = {
  clientId: "",
  name: "",
  redirectUris: "",
  postLogoutRedirectUris: "",
  allowedGrants: ["authorization_code"],
  accessTtlSeconds: "",
  refreshTtlSeconds: "",
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

/** One URI per line; blank lines and surrounding spaces are dropped. */
export const parseLines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

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
  name: z.string().trim().min(1, "Nama wajib diisi"),
  description: z.string().trim(),
});
export type RoleFormValues = z.infer<typeof roleFormSchema>;

export const permissionFormSchema = z.object({
  permission: z.string().trim().min(1, "Permission wajib diisi"),
  description: z.string().trim(),
});
export type PermissionFormValues = z.infer<typeof permissionFormSchema>;
