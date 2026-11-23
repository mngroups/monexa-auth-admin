import { QueryClient } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveOrgProvider } from "@/features/admin-shared/hooks/use-active-org";
import { renderWithProviders } from "@/test-utils/render";

const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("@mono/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mono/hooks")>()),
  useIsMobile: () => mobile.value,
}));

const actions = vi.hoisted(() => ({
  listOrgsAction: vi.fn(),
  createOrgAction: vi.fn(),
  updateOrgAction: vi.fn(),
  setOrgActiveAction: vi.fn(),
  listOrgAppsAction: vi.fn(),
  setOrgAppAction: vi.fn(),
  uploadOrgLogoAction: vi.fn(),
  removeOrgLogoAction: vi.fn(),
}));
vi.mock("../../actions/orgs.actions", () => actions);

const { OrgsPage } = await import("../orgs-page");

const ok = <T,>(data: T) => ({ ok: true as const, data });
const fail = (message: string) => ({ ok: false as const, error: { message, status: 409 } });

const base = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const acme = {
  ...base,
  id: "o1",
  slug: "acme",
  name: "Acme",
  isActive: true,
  logo: { etag: "e1", updatedAt: "t" },
  logoUrl: "https://auth.example.id/branding/orgs/acme/logo?v=e1",
};
const beta = {
  ...base,
  id: "o2",
  slug: "beta",
  name: "Beta",
  isActive: false,
  logo: null,
  logoUrl: null,
};
const apps = [
  { appId: "a1", clientId: "c1", name: "Billing", isActive: true, enabled: true },
  { appId: "a2", clientId: "c2", name: "Reports", isActive: true, enabled: false },
  { appId: "a3", clientId: "c3", name: "Legacy", isActive: false, enabled: false },
];

function renderPage(activeOrgId = "platform") {
  return renderWithProviders(
    <ActiveOrgProvider orgId={activeOrgId}>
      <OrgsPage />
    </ActiveOrgProvider>
  );
}

async function openMenu(name: string) {
  await userEvent.click(await screen.findByRole("button", { name: `Aksi untuk ${name}` }));
}

async function openDetail(name: string) {
  await openMenu(name);
  await userEvent.click(await screen.findByRole("menuitem", { name: "Detail" }));
  return screen.findByRole("dialog");
}

describe("OrgsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobile.value = false;
    actions.listOrgsAction.mockResolvedValue(
      ok({ items: [acme, beta], page: 1, pageSize: 10, total: 2 })
    );
    actions.listOrgAppsAction.mockResolvedValue(ok(apps));
  });

  it("shows a skeleton, then name, slug, status and a logo thumbnail when set", async () => {
    renderPage();
    expect(screen.getByTestId("orgs-skeleton")).toBeInTheDocument();
    expect(await screen.findByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("acme")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByText("Nonaktif")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Logo Acme" })).toHaveAttribute("src", acme.logoUrl);
    expect(screen.queryByRole("img", { name: "Logo Beta" })).not.toBeInTheDocument();
  });

  it("searches, pages, and shows the mobile cards", async () => {
    renderPage();
    await screen.findByText("Acme");
    await userEvent.type(screen.getByRole("searchbox", { name: "Cari organisasi" }), "ac");
    await waitFor(() =>
      expect(actions.listOrgsAction).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, q: "ac" })
    );
  });

  it("renders the mobile card list on mobile", async () => {
    mobile.value = true;
    renderPage();
    expect(await screen.findByText("Acme")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("surfaces a load error", async () => {
    actions.listOrgsAction.mockResolvedValue(fail("Gagal memuat organisasi"));
    renderPage();
    expect(await screen.findByText("Gagal memuat organisasi")).toBeInTheDocument();
  });

  it("validates the slug client-side before creating", async () => {
    renderPage();
    await screen.findByText("Acme");
    await userEvent.click(screen.getByRole("button", { name: "Tambah organisasi" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Nama"), "Baru");
    await userEvent.type(within(dialog).getByLabelText("Slug"), "Bad Slug");
    expect(await within(dialog).findByText(/Slug hanya boleh/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Simpan" })).toBeDisabled();
    expect(actions.createOrgAction).not.toHaveBeenCalled();
  });

  it("creates an org", async () => {
    actions.createOrgAction.mockResolvedValue(ok(acme));
    renderPage();
    await screen.findByText("Acme");
    await userEvent.click(screen.getByRole("button", { name: "Tambah organisasi" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Nama"), "Baru");
    await userEvent.type(within(dialog).getByLabelText("Slug"), "baru-1");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(actions.createOrgAction).toHaveBeenCalledWith({ slug: "baru-1", name: "Baru" })
    );
    await waitFor(() =>
      expect(document.querySelector('[role="dialog"][data-state="open"]')).toBeNull()
    );
  });

  it("shows the BE conflict message and keeps the form open", async () => {
    actions.createOrgAction.mockResolvedValue(fail("Slug sudah dipakai organisasi lain"));
    renderPage();
    await screen.findByText("Acme");
    await userEvent.click(screen.getByRole("button", { name: "Tambah organisasi" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Nama"), "Baru");
    await userEvent.type(within(dialog).getByLabelText("Slug"), "acme");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText("Slug sudah dipakai organisasi lain")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("confirms before deactivating, then deactivates", async () => {
    actions.setOrgActiveAction.mockResolvedValue(ok({ ...acme, isActive: false }));
    renderPage();
    await openMenu("Acme");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Nonaktifkan" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Nonaktifkan Acme\?/)).toBeInTheDocument();
    expect(actions.setOrgActiveAction).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Nonaktifkan" }));
    await waitFor(() => expect(actions.setOrgActiveAction).toHaveBeenCalledWith("o1", false));
  });

  it("activates without confirming", async () => {
    actions.setOrgActiveAction.mockResolvedValue(ok({ ...beta, isActive: true }));
    renderPage();
    await openMenu("Beta");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Aktifkan" }));
    await waitFor(() => expect(actions.setOrgActiveAction).toHaveBeenCalledWith("o2", true));
  });

  it("sends only the changed name on the Info tab", async () => {
    actions.updateOrgAction.mockResolvedValue(ok({ ...acme, name: "Acme Baru" }));
    renderPage();
    const dialog = await openDetail("Acme");
    const name = within(dialog).getByLabelText("Nama");
    await userEvent.clear(name);
    await userEvent.type(name, "Acme Baru");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(actions.updateOrgAction).toHaveBeenCalledWith("o1", { name: "Acme Baru" })
    );
  });

  it("sends only the changed slug on the Info tab", async () => {
    actions.updateOrgAction.mockResolvedValue(ok({ ...acme, slug: "acme-baru" }));
    renderPage();
    const dialog = await openDetail("Acme");
    const slug = within(dialog).getByLabelText("Slug");
    await userEvent.clear(slug);
    await userEvent.type(slug, "acme-baru");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(actions.updateOrgAction).toHaveBeenCalledWith("o1", { slug: "acme-baru" })
    );
  });

  it("refreshes the shell and the org switcher after renaming the ACTIVE org", async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    actions.updateOrgAction.mockResolvedValue(ok({ ...acme, name: "Acme Baru" }));
    renderPage("o1");
    const dialog = await openDetail("Acme");
    const name = within(dialog).getByLabelText("Nama");
    await userEvent.clear(name);
    await userEvent.type(name, "Acme Baru");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(useRouter().refresh).toHaveBeenCalled());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["switcher-orgs"] });
    invalidate.mockRestore();
  });

  it("does not refresh the shell after renaming another org", async () => {
    actions.updateOrgAction.mockResolvedValue(ok({ ...acme, name: "Acme Baru" }));
    renderPage("o2");
    const dialog = await openDetail("Acme");
    const name = within(dialog).getByLabelText("Nama");
    await userEvent.clear(name);
    await userEvent.type(name, "Acme Baru");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(actions.updateOrgAction).toHaveBeenCalled());
    await screen.findByText("Organisasi disimpan.");
    expect(useRouter().refresh).not.toHaveBeenCalled();
  });

  it("clears a detail deep link whose org is not on the loaded page", async () => {
    window.history.replaceState(null, "", "/?modal=detail&target=ghost");
    renderPage();
    await screen.findByText("Acme");
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps a detail deep link whose org is on the loaded page", async () => {
    window.history.replaceState(null, "", "/?modal=detail&target=o1");
    renderPage();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(window.location.search).toBe("?modal=detail&target=o1");
  });

  it("enables an app from the Aplikasi tab and labels an inactive app", async () => {
    actions.setOrgAppAction.mockResolvedValue(
      ok({ orgId: "o1", appId: "a2", enabled: true, revokedGrants: 0 })
    );
    renderPage();
    const dialog = await openDetail("Acme");
    await userEvent.click(within(dialog).getByRole("tab", { name: "Aplikasi" }));
    expect(await within(dialog).findByText("Billing")).toBeInTheDocument();
    expect(within(dialog).getByText("Aplikasi nonaktif")).toBeInTheDocument();
    expect(within(dialog).getByRole("switch", { name: "Billing" })).toBeChecked();
    await userEvent.click(within(dialog).getByRole("switch", { name: "Reports" }));
    await waitFor(() => expect(actions.setOrgAppAction).toHaveBeenCalledWith("o1", "a2", true));
  });

  it("confirms before disabling an app", async () => {
    actions.setOrgAppAction.mockResolvedValue(
      ok({ orgId: "o1", appId: "a1", enabled: false, revokedGrants: 2 })
    );
    renderPage();
    const dialog = await openDetail("Acme");
    await userEvent.click(within(dialog).getByRole("tab", { name: "Aplikasi" }));
    await userEvent.click(await within(dialog).findByRole("switch", { name: "Billing" }));
    expect(await screen.findByText("Grant user ke aplikasi ini akan dicabut.")).toBeInTheDocument();
    expect(actions.setOrgAppAction).not.toHaveBeenCalled();
    const confirm = screen.getAllByRole("dialog").at(-1) as HTMLElement;
    await userEvent.click(within(confirm).getByRole("button", { name: "Nonaktifkan" }));
    await waitFor(() => expect(actions.setOrgAppAction).toHaveBeenCalledWith("o1", "a1", false));
  });

  it("surfaces an apps load error", async () => {
    actions.listOrgAppsAction.mockResolvedValue(fail("Gagal memuat aplikasi"));
    renderPage();
    const dialog = await openDetail("Acme");
    await userEvent.click(within(dialog).getByRole("tab", { name: "Aplikasi" }));
    expect(await within(dialog).findByText("Gagal memuat aplikasi")).toBeInTheDocument();
  });

  it("reuses the logo uploader on the Logo tab", async () => {
    actions.removeOrgLogoAction.mockResolvedValue(ok(null));
    renderPage();
    const dialog = await openDetail("Acme");
    await userEvent.click(within(dialog).getByRole("tab", { name: "Logo" }));
    expect(await within(dialog).findByRole("img", { name: "Logo saat ini" })).toHaveAttribute(
      "src",
      acme.logoUrl
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Hapus logo" }));
    const confirm = screen.getAllByRole("dialog").at(-1) as HTMLElement;
    await userEvent.click(within(confirm).getByRole("button", { name: "Hapus" }));
    await waitFor(() => expect(actions.removeOrgLogoAction).toHaveBeenCalledWith("o1"));
  });

  it("uploads a logo for the org", async () => {
    actions.uploadOrgLogoAction.mockResolvedValue(ok({ etag: "e2", updatedAt: "t" }));
    renderPage();
    const dialog = await openDetail("Beta");
    await userEvent.click(within(dialog).getByRole("tab", { name: "Logo" }));
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "l.png", { type: "image/png" }));
    await userEvent.click(await within(dialog).findByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(actions.uploadOrgLogoAction).toHaveBeenCalled());
    const [id, fd] = actions.uploadOrgLogoAction.mock.calls[0] as [string, FormData];
    expect(id).toBe("o2");
    expect((fd.get("file") as File).name).toBe("l.png");
  });
});
