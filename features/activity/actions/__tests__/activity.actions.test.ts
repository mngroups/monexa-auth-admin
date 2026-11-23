import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.fn();
vi.mock("@/lib/session", () => ({ apiClient }));

const { listActivityAction } = await import("../activity.actions");

const item = {
  id: "e1",
  at: "2026-11-02T10:00:00.000Z",
  actorUserId: "u1",
  orgId: "o1",
  action: "member.create",
  targetType: "user",
  targetId: "u2",
  ip: "1.2.3.4",
  userAgent: "ua",
  metadata: { a: 1 },
};
const ok = (data: unknown) => ({ success: true, message: "ok", code: 200, data });

describe("listActivityAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the org endpoint without an org filter", async () => {
    apiClient.mockResolvedValue(ok({ items: [item], page: 1, pageSize: 10, total: 1 }));
    const res = await listActivityAction({
      scope: "org",
      page: 1,
      pageSize: 10,
      action: "member",
      orgId: "x",
    });
    expect(res).toMatchObject({ ok: true, data: { total: 1 } });
    const [path, init] = apiClient.mock.calls[0] as [string, { params: unknown }];
    expect(path).toBe("/api/admin/org/activity");
    expect(init.params).toEqual({ page: 1, pageSize: 10, action: "member" });
  });

  it("calls the platform endpoint with the org filter and dates", async () => {
    apiClient.mockResolvedValue(ok({ items: [], page: 1, pageSize: 10, total: 0 }));
    await listActivityAction({
      scope: "platform",
      page: 2,
      pageSize: 10,
      orgId: "o1",
      from: "2026-11-01T00:00:00.000Z",
      to: "2026-11-02T00:00:00.000Z",
    });
    const [path, init] = apiClient.mock.calls[0] as [string, { params: unknown }];
    expect(path).toBe("/api/admin/platform/activity");
    expect(init.params).toEqual({
      page: 2,
      pageSize: 10,
      orgId: "o1",
      from: "2026-11-01T00:00:00.000Z",
      to: "2026-11-02T00:00:00.000Z",
    });
  });

  it("wraps BE failures", async () => {
    apiClient.mockResolvedValue({ success: false, message: "Ditolak", code: 403 });
    const res = await listActivityAction({ scope: "org", page: 1, pageSize: 10 });
    expect(res).toMatchObject({ ok: false, error: { message: "Ditolak" } });
  });
});
