import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.fn();
vi.mock("@/lib/session", () => ({ apiClient }));
vi.mock("@/features/admin-shared/actions/temporary-password", () => ({
  generateTemporaryPassword: () => "Gen-Pass-123456",
}));

const actions = await import("../members.actions");

const member = {
  userId: "u2",
  email: "b@x.id",
  username: "budi",
  name: "Budi",
  isActive: true,
  mustChangePassword: true,
  roles: [],
};
const ok = (data: unknown) => ({ success: true, message: "ok", code: 200, data });

function lastCall() {
  const [path, init] = apiClient.mock.calls.at(-1) as [string, Record<string, unknown>];
  return { path, init, body: init.body ? JSON.parse(init.body as string) : undefined };
}

describe("members actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists members with paging params", async () => {
    apiClient.mockResolvedValue(ok({ items: [member], page: 1, pageSize: 10, total: 1 }));
    const res = await actions.listMembersAction({ page: 1, pageSize: 10, q: "bu" });
    expect(res).toMatchObject({ ok: true, data: { total: 1 } });
    expect(lastCall().path).toBe("/api/admin/org/members");
    expect(lastCall().init).toMatchObject({
      method: "GET",
      params: { page: 1, pageSize: 10, q: "bu" },
    });
  });

  it("creates a member with a server-generated temporary password", async () => {
    apiClient.mockResolvedValue(ok(member));
    const res = await actions.createMemberAction({ email: "b@x.id", username: "", name: "Budi" });
    expect(res).toEqual({ ok: true, data: { member, temporaryPassword: "Gen-Pass-123456" } });
    expect(lastCall().body).toEqual({
      email: "b@x.id",
      name: "Budi",
      temporaryPassword: "Gen-Pass-123456",
    });
  });

  it("sends the username when given", async () => {
    apiClient.mockResolvedValue(ok(member));
    await actions.createMemberAction({ email: "b@x.id", username: "budi", name: "Budi" });
    expect(lastCall().body.username).toBe("budi");
  });

  it("adds an existing member by email", async () => {
    apiClient.mockResolvedValue(ok(member));
    await actions.addExistingMemberAction({ email: "b@x.id" });
    expect(lastCall().path).toBe("/api/admin/org/members/existing");
    expect(lastCall().body).toEqual({ email: "b@x.id" });
  });

  it("removes a member", async () => {
    apiClient.mockResolvedValue(ok({ userId: "u2" }));
    const res = await actions.removeMemberAction("u2");
    expect(res).toEqual({ ok: true, data: { userId: "u2" } });
    expect(lastCall().init.method).toBe("DELETE");
    expect(lastCall().path).toBe("/api/admin/org/members/u2");
  });

  it("activates and deactivates", async () => {
    apiClient.mockResolvedValue(ok(member));
    await actions.setMemberActiveAction("u2", true);
    expect(lastCall().path).toBe("/api/admin/org/members/u2/activate");
    await actions.setMemberActiveAction("u2", false);
    expect(lastCall().path).toBe("/api/admin/org/members/u2/deactivate");
  });

  it("resets a password with a server-generated one", async () => {
    apiClient.mockResolvedValue(ok(member));
    const res = await actions.resetMemberPasswordAction("u2");
    expect(res).toEqual({ ok: true, data: { temporaryPassword: "Gen-Pass-123456" } });
    expect(lastCall().path).toBe("/api/admin/org/members/u2/reset-password");
    expect(lastCall().body).toEqual({ temporaryPassword: "Gen-Pass-123456" });
  });

  it("sets roles", async () => {
    apiClient.mockResolvedValue(ok(member));
    await actions.setMemberRolesAction("u2", ["r1", "r2"]);
    expect(lastCall().init.method).toBe("PUT");
    expect(lastCall().body).toEqual({ roleIds: ["r1", "r2"] });
  });

  it("lists the org's roles", async () => {
    apiClient.mockResolvedValue(
      ok([{ id: "r1", name: "Admin", description: null, appId: "a1", appName: "Billing" }])
    );
    const res = await actions.listOrgRolesAction();
    expect(res).toMatchObject({ ok: true, data: [{ id: "r1" }] });
    expect(lastCall().path).toBe("/api/admin/org/roles");
  });

  it("returns the BE message on a refusal", async () => {
    apiClient.mockResolvedValue({ success: false, message: "Tidak boleh", code: 403, data: null });
    expect(await actions.removeMemberAction("u2")).toMatchObject({
      ok: false,
      error: { message: "Tidak boleh" },
    });
  });

  it("refuses malformed arguments without calling the BE", async () => {
    expect(await actions.removeMemberAction("")).toMatchObject({ ok: false });
    expect(await actions.createMemberAction({ email: "", username: "", name: "x" })).toMatchObject({
      ok: false,
    });
    expect(
      await actions.createMemberAction({ email: "a@b.c", username: "", name: "" })
    ).toMatchObject({ ok: false });
    expect(await actions.addExistingMemberAction({ email: "" })).toMatchObject({ ok: false });
    expect(apiClient).not.toHaveBeenCalled();
  });
});
