import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.fn();
vi.mock("@/lib/session", () => ({ apiClient }));
vi.mock("@/features/admin-shared/actions/temporary-password", () => ({
  generateTemporaryPassword: () => "Gen-Pass-123456",
}));

const actions = await import("../users.actions");

const user = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "b@x.id",
  username: "budi",
  name: "Budi",
  isActive: true,
  isPlatformAdmin: false,
  mustChangePassword: true,
  createdAt: "2026-01-02T03:04:05Z",
};
const ok = (data: unknown) => ({ success: true, message: "ok", code: 200, data });

function lastCall() {
  const [path, init] = apiClient.mock.calls.at(-1) as [string, Record<string, unknown>];
  return { path, init, body: init.body ? JSON.parse(init.body as string) : undefined };
}

describe("users actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists users with paging params", async () => {
    apiClient.mockResolvedValue(ok({ items: [user], page: 1, pageSize: 10, total: 1 }));
    const res = await actions.listUsersAction({ page: 1, pageSize: 10, q: "bu" });
    expect(res).toMatchObject({ ok: true, data: { total: 1 } });
    expect(lastCall().path).toBe("/api/admin/platform/users");
    expect(lastCall().init).toMatchObject({
      method: "GET",
      params: { page: 1, pageSize: 10, q: "bu" },
    });
  });

  it("creates a user with a server-generated temporary password", async () => {
    apiClient.mockResolvedValue(ok(user));
    const res = await actions.createUserAction({ email: "b@x.id", username: "", name: "Budi" });
    expect(res).toEqual({ ok: true, data: { user, temporaryPassword: "Gen-Pass-123456" } });
    expect(lastCall().init).toMatchObject({ method: "POST" });
    expect(lastCall().body).toEqual({
      email: "b@x.id",
      name: "Budi",
      temporaryPassword: "Gen-Pass-123456",
    });
  });

  it("sends the username when given", async () => {
    apiClient.mockResolvedValue(ok(user));
    await actions.createUserAction({ email: "b@x.id", username: "budi", name: "Budi" });
    expect(lastCall().body.username).toBe("budi");
  });

  it("rejects a missing email", async () => {
    const res = await actions.createUserAction({ email: "", username: "", name: "Budi" });
    expect(res).toMatchObject({ ok: false, error: { message: "Data tidak valid" } });
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("activates and deactivates", async () => {
    apiClient.mockResolvedValue(ok(user));
    await actions.setUserActiveAction("22222222-2222-4222-8222-222222222222", true);
    expect(lastCall().path).toBe(
      "/api/admin/platform/users/22222222-2222-4222-8222-222222222222/activate"
    );
    expect(lastCall().init).toMatchObject({ method: "POST" });
    await actions.setUserActiveAction("22222222-2222-4222-8222-222222222222", false);
    expect(lastCall().path).toBe(
      "/api/admin/platform/users/22222222-2222-4222-8222-222222222222/deactivate"
    );
  });

  it("grants and revokes platform admin", async () => {
    apiClient.mockResolvedValue(ok(user));
    await actions.setPlatformAdminAction("22222222-2222-4222-8222-222222222222", true);
    expect(lastCall().path).toBe(
      "/api/admin/platform/users/22222222-2222-4222-8222-222222222222/platform-admin"
    );
    expect(lastCall().init).toMatchObject({ method: "PUT" });
    await actions.setPlatformAdminAction("22222222-2222-4222-8222-222222222222", false);
    expect(lastCall().init).toMatchObject({ method: "DELETE" });
  });

  it("resets a password with a server-generated one", async () => {
    apiClient.mockResolvedValue(ok(user));
    const res = await actions.resetUserPasswordAction("22222222-2222-4222-8222-222222222222");
    expect(res).toEqual({ ok: true, data: { temporaryPassword: "Gen-Pass-123456" } });
    expect(lastCall().path).toBe(
      "/api/admin/platform/users/22222222-2222-4222-8222-222222222222/reset-password"
    );
    expect(lastCall().body).toEqual({ temporaryPassword: "Gen-Pass-123456" });
  });

  it("rejects an empty id", async () => {
    const res = await actions.setUserActiveAction("", true);
    expect(res).toMatchObject({ ok: false, error: { message: "Data tidak valid" } });
  });

  it("wraps a BE refusal with its message", async () => {
    apiClient.mockResolvedValue({ success: false, message: "Tidak diizinkan", code: 403 });
    const res = await actions.setPlatformAdminAction("22222222-2222-4222-8222-222222222222", false);
    expect(res).toMatchObject({ ok: false, error: { message: "Tidak diizinkan" } });
  });

  it("refuses invalid arguments with 'Data tidak valid' and never calls the BE", async () => {
    const invalid = { ok: false, error: { message: "Data tidak valid" } };
    expect(await actions.listUsersAction({ page: 0, pageSize: 10 })).toMatchObject(invalid);
    expect(await actions.listUsersAction({ page: 1, pageSize: 1000 })).toMatchObject(invalid);
    expect(await actions.setUserActiveAction("not-a-uuid", true)).toMatchObject(invalid);
    expect(await actions.setPlatformAdminAction("not-a-uuid", true)).toMatchObject(invalid);
    expect(await actions.resetUserPasswordAction("../x")).toMatchObject(invalid);
    expect(apiClient).not.toHaveBeenCalled();
  });
});
