import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.fn();
vi.mock("@/lib/session", () => ({ apiClient }));
const portal = vi.hoisted(() => ({ url: "https://auth.example.id" as string | null }));
vi.mock("@/lib/app-config", () => ({ getAuthPortalUrl: () => portal.url }));

const actions = await import("../branding.actions");
const { postLogo } = await import("../upload-logo");

const ok = (data: unknown) => ({ success: true, message: "ok", code: 200, data });
const fail = { success: false, message: "Logo tidak valid", code: 422, data: null };

describe("branding actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    portal.url = "https://auth.example.id";
  });

  it("builds the public logo url from slug and etag", async () => {
    apiClient.mockResolvedValue(
      ok({ slug: "acme", name: "Acme", logo: { etag: "e1", updatedAt: "t" } })
    );
    const res = await actions.getBrandingAction();
    expect(res).toEqual({
      ok: true,
      data: {
        slug: "acme",
        logoUrl: "https://auth.example.id/branding/orgs/acme/logo?v=e1",
        hasLogo: true,
      },
    });
    expect(apiClient.mock.calls[0][0]).toBe("/api/admin/org/branding");
  });

  it("has no logo url without a logo or without a portal url", async () => {
    apiClient.mockResolvedValue(ok({ slug: "acme", name: "Acme", logo: null }));
    expect(await actions.getBrandingAction()).toMatchObject({
      data: { logoUrl: null, hasLogo: false },
    });
    portal.url = null;
    apiClient.mockResolvedValue(
      ok({ slug: "acme", name: "Acme", logo: { etag: "e", updatedAt: "t" } })
    );
    // The logo exists even though its URL cannot be built.
    expect(await actions.getBrandingAction()).toMatchObject({
      data: { logoUrl: null, hasLogo: true },
    });
  });

  it("uploads the multipart file with PUT", async () => {
    apiClient.mockResolvedValue(ok({ etag: "e2", updatedAt: "t" }));
    const fd = new FormData();
    fd.set("file", new File(["x"], "a.png", { type: "image/png" }));
    const res = await actions.uploadLogoAction(fd);
    expect(res).toEqual({ ok: true, data: { etag: "e2", updatedAt: "t" } });
    const [path, init] = apiClient.mock.calls[0];
    expect(path).toBe("/api/admin/org/logo");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(fd);
  });

  it("refuses an upload without a file, or a bad type/size, without calling the API", async () => {
    const empty = await actions.uploadLogoAction(new FormData());
    expect(empty).toMatchObject({ ok: false, error: { message: "Data tidak valid" } });
    const gif = new FormData();
    gif.set("file", new File(["x"], "a.gif", { type: "image/gif" }));
    expect(await actions.uploadLogoAction(gif)).toMatchObject({
      ok: false,
      error: { message: "Logo harus berupa PNG, JPG, atau WebP." },
    });
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("wraps a BE refusal with its message", async () => {
    apiClient.mockResolvedValue(fail);
    const fd = new FormData();
    fd.set("file", new File(["x"], "a.png", { type: "image/png" }));
    expect(await actions.uploadLogoAction(fd)).toMatchObject({
      ok: false,
      error: { message: "Logo tidak valid" },
    });
  });

  it("removes the logo with DELETE", async () => {
    apiClient.mockResolvedValue(ok(null));
    expect(await actions.removeLogoAction()).toMatchObject({ ok: true });
    expect(apiClient.mock.calls[0][0]).toBe("/api/admin/org/logo");
    expect(apiClient.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  });

  it("postLogo sends the FormData through apiClient to any endpoint", async () => {
    apiClient.mockResolvedValue(ok({ etag: "e", updatedAt: "t" }));
    const fd = new FormData();
    expect(await postLogo("/api/admin/platform/orgs/1/logo", fd)).toEqual({
      etag: "e",
      updatedAt: "t",
    });
    expect(apiClient.mock.calls[0][1]).toMatchObject({ method: "PUT", body: fd });
  });

  it("refuses a FormData that is not exactly one file field", async () => {
    const invalid = { ok: false, error: { message: "Data tidak valid" } };
    const extra = new FormData();
    extra.set("file", new File(["x"], "a.png", { type: "image/png" }));
    extra.set("other", "y");
    expect(await actions.uploadLogoAction(extra)).toMatchObject(invalid);
    expect(await actions.uploadLogoAction("nope" as never)).toMatchObject(invalid);
    expect(apiClient).not.toHaveBeenCalled();
  });
});
