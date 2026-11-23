import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.fn();
vi.mock("@/lib/session", () => ({ apiClient }));

const { listOrgsAction } = await import("../orgs.actions");

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
