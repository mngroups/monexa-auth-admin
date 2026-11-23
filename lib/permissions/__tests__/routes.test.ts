import { isRouteAllowed } from "@mono/auth";
import { describe, expect, it } from "vitest";

import { MENU_ITEMS } from "@/features/app-shell/constants/menu-items";
import { ADMIN_PERMISSIONS } from "../admin";
import { ROUTE_PERMISSIONS } from "../routes";

const allowed = (path: string, granted: string[]) =>
  isRouteAllowed(ROUTE_PERMISSIONS, path, new Set(granted));

describe("ROUTE_PERMISSIONS", () => {
  it("maps every menu entry to its admin permissions", () => {
    expect(ROUTE_PERMISSIONS).toEqual({
      "/members": [ADMIN_PERMISSIONS.memberManage, ADMIN_PERMISSIONS.platformAll],
      "/branding": [ADMIN_PERMISSIONS.brandingManage, ADMIN_PERMISSIONS.platformAll],
      "/activity": [ADMIN_PERMISSIONS.activityView, ADMIN_PERMISSIONS.platformAll],
      "/orgs": [ADMIN_PERMISSIONS.platformAll],
      "/apps": [ADMIN_PERMISSIONS.platformAll],
      "/users": [ADMIN_PERMISSIONS.platformAll],
    });
    expect(MENU_ITEMS.map((item) => item.href)).toEqual([
      "/members",
      "/branding",
      "/activity",
      "/orgs",
      "/apps",
      "/users",
    ]);
  });

  it("lets an org admin reach members and activity but not platform pages", () => {
    const granted = ["org.member:manage", "org.activity:view"];
    expect(allowed("/members", granted)).toBe(true);
    expect(allowed("/activity", granted)).toBe(true);
    expect(allowed("/branding", granted)).toBe(false);
    expect(allowed("/orgs", granted)).toBe(false);
    expect(allowed("/apps", granted)).toBe(false);
    expect(allowed("/users", granted)).toBe(false);
  });

  it("lets a platform admin reach every platform page", () => {
    for (const path of ["/members", "/branding", "/activity", "/orgs", "/apps", "/users"]) {
      expect(allowed(path, ["platform:all"])).toBe(true);
    }
  });
});
