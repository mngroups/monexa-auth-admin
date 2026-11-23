/** Permission strings from `GET /v1/auth/check` that this admin app acts on. */
export const ADMIN_PERMISSIONS = {
  platformAll: "platform:all",
  memberManage: "org.member:manage",
  roleAssign: "org.role:assign",
  activityView: "org.activity:view",
  brandingManage: "org.branding:manage",
} as const;
