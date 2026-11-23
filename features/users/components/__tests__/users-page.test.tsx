import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CurrentUserProvider } from "@/features/admin-shared/hooks/use-current-user";
import { renderWithProviders } from "@/test-utils/render";

const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("@mono/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mono/hooks")>()),
  useIsMobile: () => mobile.value,
}));

const actions = vi.hoisted(() => ({
  listUsersAction: vi.fn(),
  createUserAction: vi.fn(),
  setUserActiveAction: vi.fn(),
  setPlatformAdminAction: vi.fn(),
  resetUserPasswordAction: vi.fn(),
}));
vi.mock("../../actions/users.actions", () => actions);

const { UsersPage } = await import("../users-page");

const ok = <T,>(data: T) => ({ ok: true as const, data });
const fail = (message: string) => ({ ok: false as const, error: { message, status: 400 } });

const base = {
  username: null,
  mustChangePassword: false,
  createdAt: "2026-03-05T10:00:00Z",
};
const me = {
  ...base,
  id: "u1",
  email: "me@x.id",
  name: "Saya Admin",
  isActive: true,
  isPlatformAdmin: true,
};
const budi = {
  ...base,
  id: "u2",
  email: "budi@x.id",
  name: "Budi",
  isActive: true,
  isPlatformAdmin: false,
};
const siti = {
  ...base,
  id: "u3",
  email: "siti@x.id",
  name: "Siti",
  isActive: false,
  isPlatformAdmin: true,
};
const PASSWORD = "Gen-Pass-123456";

function renderPage(userId: string | null = "u1") {
  return renderWithProviders(
    <CurrentUserProvider userId={userId}>
      <UsersPage />
    </CurrentUserProvider>
  );
}

const dialogClosed = () =>
  waitFor(() => expect(document.querySelector('[role="dialog"][data-state="open"]')).toBeNull());

async function openMenu(name: string) {
  await userEvent.click(await screen.findByRole("button", { name: `Aksi untuk ${name}` }));
}

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobile.value = false;
    actions.listUsersAction.mockResolvedValue(
      ok({ items: [me, budi, siti], page: 1, pageSize: 10, total: 3 })
    );
  });

  it("shows a skeleton, then users with platform admin badge and status", async () => {
    renderPage();
    expect(screen.getByTestId("users-skeleton")).toBeInTheDocument();
    expect(await screen.findByText("Budi")).toBeInTheDocument();
    expect(screen.getByText("budi@x.id")).toBeInTheDocument();
    expect(screen.getAllByText("Platform admin")).toHaveLength(2);
    expect(screen.getAllByText("Aktif")).toHaveLength(2);
    expect(screen.getByText("Nonaktif")).toBeInTheDocument();
    expect(actions.listUsersAction).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  it("shows an empty state", async () => {
    actions.listUsersAction.mockResolvedValue(ok({ items: [], page: 1, pageSize: 10, total: 0 }));
    renderPage();
    expect(await screen.findByText("Belum ada pengguna.")).toBeInTheDocument();
  });

  it("searches by text, back on page 1", async () => {
    renderPage();
    await screen.findByText("Budi");
    await userEvent.type(screen.getByRole("searchbox", { name: "Cari pengguna" }), "bu");
    await waitFor(() =>
      expect(actions.listUsersAction).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, q: "bu" })
    );
  });

  it("pages through the list", async () => {
    actions.listUsersAction.mockResolvedValue(
      ok({ items: [budi], page: 1, pageSize: 10, total: 25 })
    );
    renderPage();
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: /2/ }));
    await waitFor(() =>
      expect(actions.listUsersAction).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 })
    );
  });

  it("renders the mobile card list on mobile", async () => {
    mobile.value = true;
    renderPage();
    expect(await screen.findByText("Budi")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("budi@x.id")).toBeInTheDocument();
  });

  it("surfaces a load error", async () => {
    actions.listUsersAction.mockResolvedValue(fail("Gagal memuat pengguna"));
    renderPage();
    expect(await screen.findByText("Gagal memuat pengguna")).toBeInTheDocument();
  });

  it("gives the current user an Anda badge and no actions at all", async () => {
    renderPage();
    await screen.findByText("Budi");
    expect(screen.getByText("Anda")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aksi untuk Saya Admin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aksi untuk Budi" })).toBeInTheDocument();
  });

  it("creates a user and shows the generated password once, never caching it", async () => {
    actions.createUserAction.mockResolvedValue(ok({ user: budi, temporaryPassword: PASSWORD }));
    renderPage();
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: "Tambah pengguna" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Email"), "baru@x.id");
    await userEvent.type(within(dialog).getByLabelText("Nama"), "Baru");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));

    expect(await screen.findByDisplayValue(PASSWORD)).toBeInTheDocument();
    expect(screen.getByText("Simpan sekarang — tidak akan ditampilkan lagi.")).toBeInTheDocument();
    expect(actions.createUserAction).toHaveBeenCalledWith({
      email: "baru@x.id",
      username: "",
      name: "Baru",
    });

    await userEvent.click(screen.getByRole("button", { name: "Selesai" }));
    await waitFor(() => expect(screen.queryByDisplayValue(PASSWORD)).not.toBeInTheDocument());
    expect(document.body.textContent).not.toContain(PASSWORD);
    expect(window.location.href).not.toContain(PASSWORD);
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(PASSWORD);
  });

  it("toasts the BE message when creating fails", async () => {
    actions.createUserAction.mockResolvedValue(fail("Email sudah terdaftar"));
    renderPage();
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: "Tambah pengguna" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Email"), "baru@x.id");
    await userEvent.type(within(dialog).getByLabelText("Nama"), "Baru");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText("Email sudah terdaftar")).toBeInTheDocument();
    expect(screen.queryByDisplayValue(PASSWORD)).not.toBeInTheDocument();
  });

  it("confirms before granting platform admin", async () => {
    actions.setPlatformAdminAction.mockResolvedValue(ok({ ...budi, isPlatformAdmin: true }));
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Jadikan platform admin" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Jadikan platform admin?")).toBeInTheDocument();
    expect(actions.setPlatformAdminAction).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Jadikan admin" }));
    await waitFor(() => expect(actions.setPlatformAdminAction).toHaveBeenCalledWith("u2", true));
    await dialogClosed();
  });

  it("confirms before revoking platform admin", async () => {
    actions.setPlatformAdminAction.mockResolvedValue(ok({ ...siti, isPlatformAdmin: false }));
    renderPage();
    await openMenu("Siti");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cabut platform admin" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Cabut platform admin?")).toBeInTheDocument();
    expect(within(dialog).getByText(/Siti/)).toBeInTheDocument();
    expect(actions.setPlatformAdminAction).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cabut" }));
    await waitFor(() => expect(actions.setPlatformAdminAction).toHaveBeenCalledWith("u3", false));
    await dialogClosed();
  });

  it("cancelling the revoke confirmation does nothing", async () => {
    renderPage();
    await openMenu("Siti");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cabut platform admin" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Batal" }));
    await dialogClosed();
    expect(actions.setPlatformAdminAction).not.toHaveBeenCalled();
  });

  it("toasts the BE message when a revoke fails and keeps the dialog", async () => {
    actions.setPlatformAdminAction.mockResolvedValue(fail("Minimal satu platform admin"));
    renderPage();
    await openMenu("Siti");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cabut platform admin" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cabut" }));
    expect(await screen.findByText("Minimal satu platform admin")).toBeInTheDocument();
  });

  it("confirms before deactivating", async () => {
    actions.setUserActiveAction.mockResolvedValue(ok(budi));
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Nonaktifkan" }));
    const dialog = await screen.findByRole("dialog");
    expect(actions.setUserActiveAction).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Nonaktifkan" }));
    await waitFor(() => expect(actions.setUserActiveAction).toHaveBeenCalledWith("u2", false));
    await dialogClosed();
  });

  it("activates directly, without a confirmation", async () => {
    actions.setUserActiveAction.mockResolvedValue(ok(siti));
    renderPage();
    await openMenu("Siti");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Aktifkan" }));
    await waitFor(() => expect(actions.setUserActiveAction).toHaveBeenCalledWith("u3", true));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation naming the user before resetting a password", async () => {
    actions.resetUserPasswordAction.mockResolvedValue(ok({ temporaryPassword: PASSWORD }));
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Reset password" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Reset password Budi? Password lama tidak berlaku lagi.")
    ).toBeInTheDocument();
    expect(actions.resetUserPasswordAction).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Reset" }));
    expect(await screen.findByDisplayValue(PASSWORD)).toBeInTheDocument();
    expect(actions.resetUserPasswordAction).toHaveBeenCalledWith("u2");
    await userEvent.click(screen.getByRole("button", { name: "Selesai" }));
    await waitFor(() => expect(screen.queryByDisplayValue(PASSWORD)).not.toBeInTheDocument());
  });

  it("does not reset when the confirmation is cancelled", async () => {
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Reset password" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Batal" })
    );
    expect(actions.resetUserPasswordAction).not.toHaveBeenCalled();
  });

  it("hides every self-sensitive action on every row when the current user is unknown", async () => {
    renderPage(null);
    await screen.findByText("Budi");
    expect(screen.queryByRole("button", { name: "Aksi untuk Budi" })).not.toBeInTheDocument();
    await openMenu("Siti");
    expect(await screen.findByRole("menuitem", { name: "Aktifkan" })).toBeInTheDocument();
    for (const name of ["Reset password", "Jadikan platform admin", "Cabut platform admin"]) {
      expect(screen.queryByRole("menuitem", { name })).not.toBeInTheDocument();
    }
  });

  it("offers actions from the mobile card footer", async () => {
    mobile.value = true;
    renderPage();
    await screen.findByText("Budi");
    await userEvent.click(screen.getAllByRole("button", { expanded: false })[1]);
    expect(await screen.findByRole("button", { name: "Aksi untuk Budi" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aksi untuk Saya Admin" })).not.toBeInTheDocument();
  });
});
