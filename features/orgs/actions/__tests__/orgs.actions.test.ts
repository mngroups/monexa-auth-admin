import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.fn();
vi.mock("@/lib/session", () => ({ apiClient }));
vi.mock("@/lib/app-config", () => ({ getAuthPortalUrl: () => "https://auth.example.id" }));
const postLogo = vi.fn();
vi.mock("@/features/branding/actions/upload-logo", () => ({ postLogo }));

const actions = await import("../orgs.actions");
const { listOrgsAction } = actions;

const ok = (data: unknown) => ({ success: true, message: "ok", code: 200, data });

const org = {
  id: "o1",
  slug: "acme",
  name: "Acme",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  logo: null,
};

describe("listOrgsAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists organizations with paging and search", async () => {
    apiClient.mockResolvedValue({
      success: true,
      message: "ok",
      code: 200,
      data: { items: [org], page: 1, pageSize: 100, total: 1 },
    });
    const res = await listOrgsAction({ page: 1, pageSize: 100, q: "ac" });
    expect(res).toMatchObject({ ok: true, data: { items: [{ id: "o1" }] } });
    const [path, init] = apiClient.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/api/admin/platform/orgs");
    expect(init).toMatchObject({ method: "GET", params: { page: 1, pageSize: 100, q: "ac" } });
  });

  it("wraps failures", async () => {
    apiClient.mockResolvedValue({ success: false, message: "Gagal", code: 500 });
    const res = await listOrgsAction({ page: 1, pageSize: 10 });
    expect(res).toMatchObject({ ok: false, error: { message: "Gagal" } });
  });
});

describe("listOrgsAction logo url", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds the public logo url server-side, or null without a logo", async () => {
    apiClient.mockResolvedValue(
      ok({
        items: [
          { ...org, logo: { etag: "e 1", updatedAt: "t" } },
          { ...org, id: "o2", slug: "beta", logo: null },
        ],
        page: 1,
        pageSize: 10,
        total: 2,
      })
    );
    const res = await listOrgsAction({ page: 1, pageSize: 10 });
    expect(res).toMatchObject({
      ok: true,
      data: {
        items: [
          { logoUrl: "https://auth.example.id/branding/orgs/acme/logo?v=e%201" },
          { logoUrl: null },
        ],
      },
    });
  });
});

describe("org mutations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an org", async () => {
    apiClient.mockResolvedValue(ok(org));
    const res = await actions.createOrgAction({ slug: "acme", name: "Acme" });
    expect(res).toMatchObject({ ok: true, data: { id: "o1" } });
    const [path, init] = apiClient.mock.calls[0];
    expect(path).toBe("/api/admin/platform/orgs");
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ slug: "acme", name: "Acme" }),
    });
  });

  it("surfaces a duplicate-slug conflict message", async () => {
    apiClient.mockResolvedValue({ success: false, message: "Slug sudah dipakai", code: 409 });
    expect(await actions.createOrgAction({ slug: "acme", name: "Acme" })).toMatchObject({
      ok: false,
      error: { message: "Slug sudah dipakai" },
    });
  });

  it("updates an org", async () => {
    apiClient.mockResolvedValue(ok(org));
    await actions.updateOrgAction("o1", { name: "Baru" });
    const [path, init] = apiClient.mock.calls[0];
    expect(path).toBe("/api/admin/platform/orgs/o1");
    expect(init).toMatchObject({ method: "PATCH", body: JSON.stringify({ name: "Baru" }) });
  });

  it("activates and deactivates", async () => {
    apiClient.mockResolvedValue(ok(org));
    await actions.setOrgActiveAction("o1", true);
    await actions.setOrgActiveAction("o1", false);
    expect(apiClient.mock.calls[0][0]).toBe("/api/admin/platform/orgs/o1/activate");
    expect(apiClient.mock.calls[1][0]).toBe("/api/admin/platform/orgs/o1/deactivate");
    expect(apiClient.mock.calls[1][1]).toMatchObject({ method: "POST" });
  });

  it("rejects an empty id", async () => {
    expect(await actions.setOrgActiveAction("", true)).toMatchObject({ ok: false });
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("lists an org's apps", async () => {
    const app = { appId: "a1", clientId: "c", name: "Billing", isActive: true, enabled: false };
    apiClient.mockResolvedValue(ok([app]));
    const res = await actions.listOrgAppsAction("o1");
    expect(res).toEqual({ ok: true, data: [app] });
    expect(apiClient.mock.calls[0][0]).toBe("/api/admin/platform/orgs/o1/apps");
  });

  it("enables and disables an app", async () => {
    apiClient.mockResolvedValue(ok({ orgId: "o1", appId: "a1", enabled: true, revokedGrants: 0 }));
    await actions.setOrgAppAction("o1", "a1", true);
    await actions.setOrgAppAction("o1", "a1", false);
    expect(apiClient.mock.calls[0][0]).toBe("/api/admin/platform/orgs/o1/apps/a1");
    expect(apiClient.mock.calls[0][1]).toMatchObject({ method: "PUT" });
    expect(apiClient.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
  });

  it("uploads a logo through postLogo, validating the file first", async () => {
    postLogo.mockResolvedValue({ etag: "e", updatedAt: "t" });
    const fd = new FormData();
    fd.set("file", new File(["x"], "l.png", { type: "image/png" }));
    const res = await actions.uploadOrgLogoAction("o1", fd);
    expect(res).toEqual({ ok: true, data: { etag: "e", updatedAt: "t" } });
    expect(postLogo).toHaveBeenCalledWith("/api/admin/platform/orgs/o1/logo", fd);

    const bad = new FormData();
    bad.set("file", new File(["x"], "l.gif", { type: "image/gif" }));
    expect(await actions.uploadOrgLogoAction("o1", bad)).toMatchObject({ ok: false });
    expect(await actions.uploadOrgLogoAction("o1", new FormData())).toMatchObject({ ok: false });
    expect(postLogo).toHaveBeenCalledTimes(1);
  });

  it("removes a logo", async () => {
    apiClient.mockResolvedValue(ok(null));
    expect(await actions.removeOrgLogoAction("o1")).toEqual({ ok: true, data: null });
    expect(apiClient.mock.calls[0][0]).toBe("/api/admin/platform/orgs/o1/logo");
    expect(apiClient.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  });
});
