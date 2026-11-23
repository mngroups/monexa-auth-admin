import type { RoutePermissions } from "@mono/auth";

import { ADMIN_PERMISSIONS as P } from "./admin";

/**
 * Route → permissions required to reach it (OR: any one grants access).
 * Routes absent from this map are open to every authenticated user.
 * Single source for the server-side route gate, menu visibility and the
 * post-login landing route. Reference leaf permissions here.
 */
export const ROUTE_PERMISSIONS: RoutePermissions = {
  "/members": [P.memberManage],
  "/branding": [P.brandingManage],
  "/activity": [P.activityView, P.platformAll],
  "/orgs": [P.platformAll],
  "/apps": [P.platformAll],
  "/users": [P.platformAll],
};
