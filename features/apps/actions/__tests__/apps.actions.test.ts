import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.fn();
vi.mock("@/lib/session", () => ({ apiClient }));

const actions = await import("../apps.actions");

const ok = (data: unknown) => ({ success: true, message: "ok", code: 200, data });
const app = {
  id: "a1",
  clientId: "billing",
  name: "Billing",
  redirectUris: ["https://b.id/cb"],
  postLogoutRedirectUris: [],
  allowedGrants: ["authorization_code"],
  accessTtlSeconds: 900,
  refreshTtlSeconds: 86400,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const call = (n = 0) => apiClient.mock.calls[n] as [string, Record<string, unknown>];
const bodyOf = (n = 0) => JSON.parse(call(n)[1].body as string);

describe("apps actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists apps with paging and search", async () => {
    apiClient.mockResolvedValue(ok({ items: [app], page: 1, pageSize: 10, total: 1 }));
    const res = await actions.listAppsAction({ page: 1, pageSize: 10, q: "bi" });
    expect(res).toMatchObject({ ok: true, data: { items: [{ id: "a1" }] } });
    expect(call()[0]).toBe("/api/admin/platform/apps");
    expect(call()[1]).toMatchObject({ method: "GET", params: { page: 1, pageSize: 10, q: "bi" } });
  });

  it("gets one app", async () => {
    apiClient.mockResolvedValue(ok(app));
    expect(await actions.getAppAction("a 1")).toMatchObject({ ok: true, data: { id: "a1" } });
    expect(call()[0]).toBe("/api/admin/platform/apps/a%201");
  });

  it("creates an app and returns the app with its one-time secret", async () => {
    apiClient.mockResolvedValue(ok({ ...app, clientSecret: "s3cret" }));
    const input = { clientId: "billing", name: "Billing", redirectUris: ["https://b.id/cb"] };
    const res = await actions.createAppAction(input);
    expect(res).toMatchObject({ ok: true, data: { app: { id: "a1" }, clientSecret: "s3cret" } });
    expect(call()[1]).toMatchObject({ method: "POST" });
    expect(bodyOf()).toEqual(input);
  });

  it("updates an app by PATCH and toggles it active", async () => {
    apiClient.mockResolvedValue(ok(app));
    await actions.updateAppAction("a1", { name: "Billing 2" });
    expect(call()[0]).toBe("/api/admin/platform/apps/a1");
    expect(call()[1]).toMatchObject({ method: "PATCH" });
    expect(bodyOf()).toEqual({ name: "Billing 2" });
    await actions.setAppActiveAction("a1", false);
    expect(call(1)[0]).toBe("/api/admin/platform/apps/a1/deactivate");
    await actions.setAppActiveAction("a1", true);
    expect(call(2)[0]).toBe("/api/admin/platform/apps/a1/activate");
    expect(call(2)[1]).toMatchObject({ method: "POST" });
  });

  it("rotates the secret and returns only the new secret", async () => {
    apiClient.mockResolvedValue(ok({ id: "a1", clientId: "billing", clientSecret: "new" }));
    const res = await actions.rotateSecretAction("a1");
    expect(res).toEqual({ ok: true, data: { clientSecret: "new" } });
    expect(call()[0]).toBe("/api/admin/platform/apps/a1/rotate-secret");
    expect(call()[1]).toMatchObject({ method: "POST" });
  });

  it("lists, adds and removes permissions (url-encoded)", async () => {
    apiClient.mockResolvedValue(ok([{ permission: "billing:read", description: null }]));
    expect(await actions.listPermissionsAction("a1")).toMatchObject({ ok: true });
    expect(call()[0]).toBe("/api/admin/platform/apps/a1/permissions");

    apiClient.mockResolvedValue(ok({ permission: "billing:read", description: "Baca" }));
    await actions.addPermissionAction("a1", { permission: "billing:read", description: "Baca" });
    expect(call(1)[1]).toMatchObject({ method: "POST" });
    expect(bodyOf(1)).toEqual({ permission: "billing:read", description: "Baca" });

    apiClient.mockResolvedValue(ok(null));
    const res = await actions.removePermissionAction("a1", "billing:read/x");
    expect(res).toMatchObject({ ok: true });
    expect(call(2)[0]).toBe("/api/admin/platform/apps/a1/permissions/billing%3Aread%2Fx");
    expect(call(2)[1]).toMatchObject({ method: "DELETE" });
  });

  it("manages roles", async () => {
    const role = {
      id: "r1",
      appId: "a1",
      name: "Kasir",
      description: null,
      permissions: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    apiClient.mockResolvedValue(ok([role]));
    await actions.listRolesAction("a1");
    expect(call()[0]).toBe("/api/admin/platform/apps/a1/roles");

    apiClient.mockResolvedValue(ok(role));
    await actions.createRoleAction("a1", { name: "Kasir" });
    expect(call(1)[1]).toMatchObject({ method: "POST" });
    expect(bodyOf(1)).toEqual({ name: "Kasir" });

    await actions.updateRoleAction("a1", "r1", { name: "Kasir 2" });
    expect(call(2)[0]).toBe("/api/admin/platform/apps/a1/roles/r1");
    expect(call(2)[1]).toMatchObject({ method: "PATCH" });

    await actions.setRolePermissionsAction("a1", "r1", ["billing:read"]);
    expect(call(3)[0]).toBe("/api/admin/platform/apps/a1/roles/r1/permissions");
    expect(call(3)[1]).toMatchObject({ method: "PUT" });
    expect(bodyOf(3)).toEqual({ permissions: ["billing:read"] });

    apiClient.mockResolvedValue(ok(null));
    expect(await actions.deleteRoleAction("a1", "r1")).toMatchObject({ ok: true });
    expect(call(4)[1]).toMatchObject({ method: "DELETE" });
  });

  it("wraps failures and rejects empty ids", async () => {
    apiClient.mockResolvedValue({ success: false, message: "Gagal", code: 409 });
    expect(await actions.setAppActiveAction("a1", true)).toMatchObject({
      ok: false,
      error: { message: "Gagal" },
    });
    expect(await actions.getAppAction("")).toMatchObject({
      ok: false,
      error: { message: "Aplikasi tidak valid" },
    });
    expect(await actions.deleteRoleAction("a1", "")).toMatchObject({
      ok: false,
      error: { message: "Role tidak valid" },
    });
    expect(await actions.removePermissionAction("a1", "")).toMatchObject({
      ok: false,
      error: { message: "Permission tidak valid" },
    });
  });
});
