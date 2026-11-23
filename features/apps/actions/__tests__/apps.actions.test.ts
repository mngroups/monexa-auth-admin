import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.fn();
vi.mock("@/lib/session", () => ({ apiClient }));

const actions = await import("../apps.actions");

const ok = (data: unknown) => ({ success: true, message: "ok", code: 200, data });
const app = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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
    expect(res).toMatchObject({
      ok: true,
      data: { items: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }] },
    });
    expect(call()[0]).toBe("/api/admin/platform/apps");
    expect(call()[1]).toMatchObject({ method: "GET", params: { page: 1, pageSize: 10, q: "bi" } });
  });

  it("gets one app", async () => {
    apiClient.mockResolvedValue(ok(app));
    expect(await actions.getAppAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toMatchObject({
      ok: true,
      data: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    });
    expect(call()[0]).toBe("/api/admin/platform/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("creates an app and returns the app with its one-time secret", async () => {
    apiClient.mockResolvedValue(ok({ ...app, clientSecret: "s3cret" }));
    const input = { clientId: "billing", name: "Billing", redirectUris: ["https://b.id/cb"] };
    const res = await actions.createAppAction(input);
    expect(res).toMatchObject({
      ok: true,
      data: { app: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, clientSecret: "s3cret" },
    });
    expect(call()[1]).toMatchObject({ method: "POST" });
    expect(bodyOf()).toEqual(input);
  });

  it("updates an app by PATCH and toggles it active", async () => {
    apiClient.mockResolvedValue(ok(app));
    await actions.updateAppAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", { name: "Billing 2" });
    expect(call()[0]).toBe("/api/admin/platform/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(call()[1]).toMatchObject({ method: "PATCH" });
    expect(bodyOf()).toEqual({ name: "Billing 2" });
    await actions.setAppActiveAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", false);
    expect(call(1)[0]).toBe(
      "/api/admin/platform/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/deactivate"
    );
    await actions.setAppActiveAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", true);
    expect(call(2)[0]).toBe(
      "/api/admin/platform/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/activate"
    );
    expect(call(2)[1]).toMatchObject({ method: "POST" });
  });

  it("rotates the secret and returns only the new secret", async () => {
    apiClient.mockResolvedValue(
      ok({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", clientId: "billing", clientSecret: "new" })
    );
    const res = await actions.rotateSecretAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(res).toEqual({ ok: true, data: { clientSecret: "new" } });
    expect(call()[0]).toBe(
      "/api/admin/platform/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/rotate-secret"
    );
    expect(call()[1]).toMatchObject({ method: "POST" });
  });

  it("lists, adds and removes permissions (url-encoded)", async () => {
    apiClient.mockResolvedValue(ok([{ permission: "billing:read", description: null }]));
    expect(
      await actions.listPermissionsAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    ).toMatchObject({ ok: true });
    expect(call()[0]).toBe(
      "/api/admin/platform/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/permissions"
    );

    apiClient.mockResolvedValue(ok({ permission: "billing:read", description: "Baca" }));
    await actions.addPermissionAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
      permission: "billing:read",
      description: "Baca",
    });
    expect(call(1)[1]).toMatchObject({ method: "POST" });
    expect(bodyOf(1)).toEqual({ permission: "billing:read", description: "Baca" });

    apiClient.mockResolvedValue(ok(null));
    const res = await actions.removePermissionAction(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "billing:read"
    );
    expect(res).toMatchObject({ ok: true });
    expect(call(2)[0]).toBe(
      "/api/admin/platform/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/permissions/billing%3Aread"
    );
    expect(call(2)[1]).toMatchObject({ method: "DELETE" });
  });

  it("manages roles", async () => {
    const role = {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      appId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Kasir",
      description: null,
      permissions: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    apiClient.mockResolvedValue(ok([role]));
    await actions.listRolesAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(call()[0]).toBe("/api/admin/platform/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/roles");

    apiClient.mockResolvedValue(ok(role));
    await actions.createRoleAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", { name: "Kasir" });
    expect(call(1)[1]).toMatchObject({ method: "POST" });
    expect(bodyOf(1)).toEqual({ name: "Kasir" });

    await actions.updateRoleAction(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      { name: "Kasir 2" }
    );
    expect(call(2)[0]).toBe(
      "/api/admin/platform/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/roles/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    );
    expect(call(2)[1]).toMatchObject({ method: "PATCH" });

    await actions.setRolePermissionsAction(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ["billing:read"]
    );
    expect(call(3)[0]).toBe(
      "/api/admin/platform/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/roles/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/permissions"
    );
    expect(call(3)[1]).toMatchObject({ method: "PUT" });
    expect(bodyOf(3)).toEqual({ permissions: ["billing:read"] });

    apiClient.mockResolvedValue(ok(null));
    expect(
      await actions.deleteRoleAction(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      )
    ).toMatchObject({ ok: true });
    expect(call(4)[1]).toMatchObject({ method: "DELETE" });
  });

  it("wraps failures and rejects empty ids", async () => {
    apiClient.mockResolvedValue({ success: false, message: "Gagal", code: 409 });
    expect(
      await actions.setAppActiveAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", true)
    ).toMatchObject({
      ok: false,
      error: { message: "Gagal" },
    });
    expect(await actions.getAppAction("")).toMatchObject({
      ok: false,
      error: { message: "Data tidak valid" },
    });
    expect(
      await actions.deleteRoleAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "")
    ).toMatchObject({
      ok: false,
      error: { message: "Data tidak valid" },
    });
    expect(
      await actions.removePermissionAction("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "")
    ).toMatchObject({
      ok: false,
      error: { message: "Data tidak valid" },
    });
  });

  it("refuses invalid arguments with 'Data tidak valid' and never calls the BE", async () => {
    apiClient.mockClear();
    const invalid = { ok: false, error: { message: "Data tidak valid" } };
    const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect(await actions.listAppsAction({ page: 1, pageSize: 500 })).toMatchObject(invalid);
    expect(await actions.getAppAction("a1")).toMatchObject(invalid);
    expect(await actions.createAppAction({ clientId: "", name: "x" })).toMatchObject(invalid);
    expect(
      await actions.createAppAction({ clientId: "pos", name: "x", redirectUris: ["bukan-url"] })
    ).toMatchObject(invalid);
    expect(await actions.updateAppAction(a, { name: "x", accessTtlSeconds: 5 })).toMatchObject(
      invalid
    );
    expect(await actions.addPermissionAction(a, { permission: "Bad Perm" })).toMatchObject(invalid);
    expect(await actions.createRoleAction(a, { name: "" })).toMatchObject(invalid);
    expect(await actions.updateRoleAction(a, "r1", { name: "x" })).toMatchObject(invalid);
    expect(await actions.setRolePermissionsAction(a, "r1", [])).toMatchObject(invalid);
    expect(apiClient).not.toHaveBeenCalled();
  });
});
