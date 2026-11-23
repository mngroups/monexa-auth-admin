import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveOrgProvider } from "@/features/admin-shared/hooks/use-active-org";
import { renderWithProviders } from "@/test-utils/render";

const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("@mono/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mono/hooks")>()),
  useIsMobile: () => mobile.value,
}));

const actions = vi.hoisted(() => ({
  getAppAction: vi.fn(),
  updateAppAction: vi.fn(),
  setAppActiveAction: vi.fn(),
  rotateSecretAction: vi.fn(),
  listPermissionsAction: vi.fn(),
  addPermissionAction: vi.fn(),
  removePermissionAction: vi.fn(),
  listRolesAction: vi.fn(),
  createRoleAction: vi.fn(),
  updateRoleAction: vi.fn(),
  deleteRoleAction: vi.fn(),
  setRolePermissionsAction: vi.fn(),
}));
vi.mock("../../actions/apps.actions", () => actions);

const { AppDetailPage } = await import("../app-detail-page");

const ok = <T,>(data: T) => ({ ok: true as const, data });
const fail = (message: string) => ({ ok: false as const, error: { message, status: 409 } });

const billing = {
  id: "a1",
  clientId: "billing",
  name: "Billing",
  redirectUris: ["https://b.id/cb"],
  postLogoutRedirectUris: ["https://b.id/bye"],
  allowedGrants: ["authorization_code"],
  accessTtlSeconds: 900,
  refreshTtlSeconds: 86400,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const adminApp = { ...billing, id: "a0", clientId: "monexa-admin", name: "Admin" };
const perms = [
  { permission: "billing:read", description: "Baca tagihan" },
  { permission: "billing:write", description: null },
];
const kasir = {
  id: "r1",
  appId: "a1",
  name: "Kasir",
  description: "Kasir toko",
  permissions: ["billing:read"],
  createdAt: "2026-01-01T00:00:00.000Z",
};
const SECRET = "rot-Secret-987";

function renderPage(id = "a1") {
  return renderWithProviders(
    <ActiveOrgProvider orgId="platform">
      <AppDetailPage id={id} />
    </ActiveOrgProvider>
  );
}

const dialogClosed = () =>
  waitFor(() => expect(document.querySelector('[role="dialog"][data-state="open"]')).toBeNull());

describe("AppDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobile.value = false;
    actions.getAppAction.mockResolvedValue(ok(billing));
    actions.listPermissionsAction.mockResolvedValue(ok(perms));
    actions.listRolesAction.mockResolvedValue(ok([kasir]));
  });

  async function openTab(name: string) {
    await userEvent.click(await screen.findByRole("tab", { name }));
  }

  it("shows a skeleton, then the header, status and the Pengaturan tab", async () => {
    renderPage();
    expect(screen.getByTestId("app-detail-skeleton")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Billing" })).toBeInTheDocument();
    expect(screen.getByText("billing")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pengaturan", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rotasi secret" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nonaktifkan" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nama")).toHaveValue("Billing");
    expect(screen.getByLabelText("Redirect URI (satu per baris)")).toHaveValue("https://b.id/cb");
    expect(screen.getByLabelText("Masa berlaku access token (detik)")).toHaveValue("900");
    expect(actions.getAppAction).toHaveBeenCalledWith("a1");
  });

  it("shows the load error", async () => {
    actions.getAppAction.mockResolvedValue(fail("Tidak ditemukan"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Tidak ditemukan");
  });

  it("saves settings without the client id", async () => {
    actions.updateAppAction.mockResolvedValue(ok(billing));
    renderPage();
    const name = await screen.findByLabelText("Nama");
    await userEvent.clear(name);
    await userEvent.type(name, "Billing Baru");
    await userEvent.type(
      screen.getByLabelText("Redirect URI (satu per baris)"),
      "{enter}https://b.id/cb2"
    );
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(actions.updateAppAction).toHaveBeenCalledWith("a1", {
        name: "Billing Baru",
        redirectUris: ["https://b.id/cb", "https://b.id/cb2"],
        postLogoutRedirectUris: ["https://b.id/bye"],
        allowedGrants: ["authorization_code"],
        accessTtlSeconds: 900,
        refreshTtlSeconds: 86400,
      })
    );
  });

  it("rotates the secret after a confirmation and shows it once", async () => {
    actions.rotateSecretAction.mockResolvedValue(ok({ clientSecret: SECRET }));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Rotasi secret" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Billing");
    expect(actions.rotateSecretAction).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Rotasi" }));

    expect(await screen.findByDisplayValue(SECRET)).toBeInTheDocument();
    expect(screen.getByText("Simpan sekarang — tidak akan ditampilkan lagi.")).toBeInTheDocument();
    expect(actions.rotateSecretAction).toHaveBeenCalledWith("a1");
    await userEvent.click(screen.getByRole("button", { name: "Selesai" }));
    await waitFor(() => expect(screen.queryByDisplayValue(SECRET)).not.toBeInTheDocument());
    expect(document.body.textContent).not.toContain(SECRET);
  });

  it("deactivates after a confirmation, and offers Aktifkan for an inactive app", async () => {
    actions.setAppActiveAction.mockResolvedValue(ok(billing));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Nonaktifkan" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Nonaktifkan" }));
    await waitFor(() => expect(actions.setAppActiveAction).toHaveBeenCalledWith("a1", false));
    await dialogClosed();
  });

  it("activates an inactive app without a confirmation", async () => {
    actions.getAppAction.mockResolvedValue(ok({ ...billing, isActive: false }));
    actions.setAppActiveAction.mockResolvedValue(ok(billing));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Aktifkan" }));
    await waitFor(() => expect(actions.setAppActiveAction).toHaveBeenCalledWith("a1", true));
  });

  it("never offers deactivate for the admin app itself", async () => {
    actions.getAppAction.mockResolvedValue(ok(adminApp));
    renderPage("a0");
    await screen.findByRole("heading", { name: "Admin" });
    expect(screen.queryByRole("button", { name: "Nonaktifkan" })).not.toBeInTheDocument();
  });

  it("never offers secret rotation for the admin app, and says how to do it", async () => {
    actions.getAppAction.mockResolvedValue(ok(adminApp));
    renderPage("a0");
    await screen.findByRole("heading", { name: "Admin" });
    expect(screen.queryByRole("button", { name: "Rotasi secret" })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Secret aplikasi admin dirotasi lewat `pnpm auth:bootstrap` di monexa-auth (BOOTSTRAP_ROTATE_ADMIN_SECRET=true)."
      )
    ).toBeInTheDocument();
  });

  describe("Permission tab", () => {
    it("lists the catalog with an empty state", async () => {
      actions.listPermissionsAction.mockResolvedValue(ok([]));
      renderPage();
      await openTab("Permission");
      expect(await screen.findByText("Belum ada permission")).toBeInTheDocument();
    });

    it("adds a permission and refreshes the catalog", async () => {
      actions.addPermissionAction.mockResolvedValue(ok(perms[0]));
      renderPage();
      await openTab("Permission");
      expect(await screen.findByText("billing:read")).toBeInTheDocument();
      expect(screen.getByText("Baca tagihan")).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText("Permission baru"), "billing:export");
      await userEvent.type(screen.getByLabelText("Deskripsi (opsional)"), "Ekspor");
      await userEvent.click(screen.getByRole("button", { name: "Tambah permission" }));
      await waitFor(() =>
        expect(actions.addPermissionAction).toHaveBeenCalledWith("a1", {
          permission: "billing:export",
          description: "Ekspor",
        })
      );
      await waitFor(() => expect(actions.listPermissionsAction).toHaveBeenCalledTimes(2));
      expect(screen.getByLabelText("Permission baru")).toHaveValue("");
    });

    it("omits an empty description and toasts a refusal", async () => {
      actions.addPermissionAction.mockResolvedValue(fail("Permission sudah ada"));
      renderPage();
      await openTab("Permission");
      await userEvent.type(await screen.findByLabelText("Permission baru"), "billing:read");
      await userEvent.click(screen.getByRole("button", { name: "Tambah permission" }));
      expect(await screen.findByText("Permission sudah ada")).toBeInTheDocument();
      expect(actions.addPermissionAction).toHaveBeenCalledWith("a1", {
        permission: "billing:read",
      });
    });

    it("confirms before deleting, naming the role cascade", async () => {
      actions.removePermissionAction.mockResolvedValue(ok(null));
      renderPage();
      await openTab("Permission");
      await userEvent.click(
        await screen.findByRole("button", { name: "Hapus permission billing:read" })
      );
      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent("billing:read");
      expect(dialog).toHaveTextContent("Permission juga dihapus dari semua role.");
      expect(actions.removePermissionAction).not.toHaveBeenCalled();
      await userEvent.click(within(dialog).getByRole("button", { name: "Hapus" }));
      await waitFor(() =>
        expect(actions.removePermissionAction).toHaveBeenCalledWith("a1", "billing:read")
      );
      await waitFor(() => expect(actions.listPermissionsAction).toHaveBeenCalledTimes(2));
    });
  });

  describe("Role tab", () => {
    it("shows role cards, an empty state, and the load error", async () => {
      renderPage();
      await openTab("Role");
      const card = await screen.findByRole("region", { name: "Role Kasir" });
      expect(within(card).getByText("Kasir toko")).toBeInTheDocument();
      expect(within(card).getByText("1 permission Terpilih")).toBeInTheDocument();
    });

    it("shows an empty state", async () => {
      actions.listRolesAction.mockResolvedValue(ok([]));
      renderPage();
      await openTab("Role");
      expect(await screen.findByText("Belum ada role")).toBeInTheDocument();
    });

    it("creates a role", async () => {
      actions.createRoleAction.mockResolvedValue(ok(kasir));
      renderPage();
      await openTab("Role");
      await userEvent.click(await screen.findByRole("button", { name: "Tambah role" }));
      const dialog = await screen.findByRole("dialog");
      await userEvent.type(within(dialog).getByLabelText("Nama"), "Supervisor");
      await userEvent.type(within(dialog).getByLabelText("Deskripsi (opsional)"), "Pengawas");
      await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
      await waitFor(() =>
        expect(actions.createRoleAction).toHaveBeenCalledWith("a1", {
          name: "Supervisor",
          description: "Pengawas",
        })
      );
      await dialogClosed();
      await waitFor(() => expect(actions.listRolesAction).toHaveBeenCalledTimes(2));
    });

    it("renames a role", async () => {
      actions.updateRoleAction.mockResolvedValue(ok(kasir));
      renderPage();
      await openTab("Role");
      await userEvent.click(await screen.findByRole("button", { name: "Ubah role Kasir" }));
      const dialog = await screen.findByRole("dialog");
      const name = within(dialog).getByLabelText("Nama");
      expect(name).toHaveValue("Kasir");
      await userEvent.clear(name);
      await userEvent.type(name, "Kasir Senior");
      await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
      await waitFor(() =>
        expect(actions.updateRoleAction).toHaveBeenCalledWith("a1", "r1", {
          name: "Kasir Senior",
          description: "Kasir toko",
        })
      );
    });

    it("deletes a role after a confirmation", async () => {
      actions.deleteRoleAction.mockResolvedValue(ok(null));
      renderPage();
      await openTab("Role");
      await userEvent.click(await screen.findByRole("button", { name: "Hapus role Kasir" }));
      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent("Kasir");
      expect(actions.deleteRoleAction).not.toHaveBeenCalled();
      await userEvent.click(within(dialog).getByRole("button", { name: "Hapus" }));
      await waitFor(() => expect(actions.deleteRoleAction).toHaveBeenCalledWith("a1", "r1"));
    });

    it("sets a role's permissions from the catalog", async () => {
      actions.setRolePermissionsAction.mockResolvedValue(ok(kasir));
      renderPage();
      await openTab("Role");
      const card = await screen.findByRole("region", { name: "Role Kasir" });
      const save = within(card).getByRole("button", { name: "Simpan permission" });
      expect(save).toBeDisabled();
      await userEvent.click(within(card).getByRole("button", { name: "Permission" }));
      await userEvent.click(await screen.findByText("billing:write"));
      await userEvent.click(screen.getByText("billing:read"));
      await userEvent.keyboard("{Escape}");
      expect(save).toBeEnabled();
      await userEvent.click(save);
      await waitFor(() =>
        expect(actions.setRolePermissionsAction).toHaveBeenCalledWith("a1", "r1", ["billing:write"])
      );
    });
  });
});
