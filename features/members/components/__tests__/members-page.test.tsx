import type { QueryClient } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveOrgProvider } from "@/features/admin-shared/hooks/use-active-org";
import { CurrentUserProvider } from "@/features/admin-shared/hooks/use-current-user";
import { renderWithProviders } from "@/test-utils/render";

const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("@mono/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mono/hooks")>()),
  useIsMobile: () => mobile.value,
}));

const actions = vi.hoisted(() => ({
  listMembersAction: vi.fn(),
  createMemberAction: vi.fn(),
  addExistingMemberAction: vi.fn(),
  removeMemberAction: vi.fn(),
  setMemberActiveAction: vi.fn(),
  resetMemberPasswordAction: vi.fn(),
  setMemberRolesAction: vi.fn(),
  listOrgRolesAction: vi.fn(),
}));
vi.mock("../../actions/members.actions", () => actions);

const { MembersPage } = await import("../members-page");

const ok = <T,>(data: T) => ({ ok: true as const, data });
const fail = (message: string) => ({ ok: false as const, error: { message, status: 400 } });

const me = {
  userId: "u1",
  email: "me@x.id",
  username: "me",
  name: "Saya Admin",
  isActive: true,
  mustChangePassword: false,
  roles: [{ id: "r1", name: "Admin", appId: "a1" }],
};
const budi = {
  userId: "u2",
  email: "budi@x.id",
  username: "budi",
  name: "Budi",
  isActive: true,
  mustChangePassword: false,
  roles: [{ id: "r2", name: "Kasir", appId: "a1" }],
};
const siti = {
  userId: "u3",
  email: "siti@x.id",
  username: null,
  name: "Siti",
  isActive: false,
  mustChangePassword: false,
  roles: [],
};
const PASSWORD = "Gen-Pass-123456";

function renderPage() {
  const view = renderWithProviders(
    <ActiveOrgProvider orgId="o1">
      <CurrentUserProvider userId="u1">
        <MembersPage />
      </CurrentUserProvider>
    </ActiveOrgProvider>
  );
  return view;
}

function cacheContains(client: QueryClient, needle: string) {
  const queries = JSON.stringify(
    client
      .getQueryCache()
      .getAll()
      .map((q) => ({ key: q.queryKey, data: q.state.data }))
  );
  const mutations = JSON.stringify(
    client
      .getMutationCache()
      .getAll()
      .map((m) => ({ key: m.options.mutationKey, data: m.state.data, vars: m.state.variables }))
  );
  return queries.includes(needle) || mutations.includes(needle);
}

// Radix keeps a closing dialog mounted for its exit animation (data-state="closed").
const dialogClosed = () =>
  waitFor(() => expect(document.querySelector('[role="dialog"][data-state="open"]')).toBeNull());

async function openMenu(name: string) {
  await userEvent.click(await screen.findByRole("button", { name: `Aksi untuk ${name}` }));
}

describe("MembersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobile.value = false;
    actions.listMembersAction.mockResolvedValue(
      ok({ items: [me, budi, siti], page: 1, pageSize: 10, total: 3 })
    );
    actions.listOrgRolesAction.mockResolvedValue(
      ok([
        { id: "r1", name: "Admin", description: null, appId: "a1", appName: "Billing" },
        { id: "r2", name: "Kasir", description: null, appId: "a1", appName: "Billing" },
        { id: "r3", name: "Viewer", description: null, appId: "a2", appName: "Reports" },
      ])
    );
  });

  it("shows a skeleton, then name, email, role badges and status", async () => {
    renderPage();
    expect(screen.getByTestId("members-skeleton")).toBeInTheDocument();
    expect(await screen.findByText("Budi")).toBeInTheDocument();
    expect(screen.getByText("budi@x.id")).toBeInTheDocument();
    expect(screen.getByText("Kasir")).toBeInTheDocument();
    expect(screen.getAllByText("Aktif")).toHaveLength(2);
    expect(screen.getByText("Nonaktif")).toBeInTheDocument();
    expect(actions.listMembersAction).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  it("searches by text, back on page 1", async () => {
    renderPage();
    await screen.findByText("Budi");
    await userEvent.type(screen.getByRole("searchbox", { name: "Cari anggota" }), "bu");
    await waitFor(() =>
      expect(actions.listMembersAction).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, q: "bu" })
    );
  });

  it("pages through the list", async () => {
    actions.listMembersAction.mockResolvedValue(
      ok({ items: [budi], page: 1, pageSize: 10, total: 25 })
    );
    renderPage();
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: /2/ }));
    await waitFor(() =>
      expect(actions.listMembersAction).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 })
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
    actions.listMembersAction.mockResolvedValue(fail("Gagal memuat anggota"));
    renderPage();
    expect(await screen.findByText("Gagal memuat anggota")).toBeInTheDocument();
  });

  it("gives the signed-in user an Anda badge and no actions menu", async () => {
    renderPage();
    await screen.findByText("Budi");
    expect(screen.getByText("Anda")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aksi untuk Saya Admin" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aksi untuk Budi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aksi untuk Siti" })).toBeInTheDocument();
  });

  it("creates a member and shows the generated password once, never caching it", async () => {
    const created = { ...budi, userId: "u9", email: "baru@x.id", name: "Baru" };
    actions.createMemberAction.mockResolvedValue(
      ok({ member: created, temporaryPassword: PASSWORD })
    );
    const { container } = renderPage();
    void container;
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: "Tambah anggota" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Email"), "baru@x.id");
    await userEvent.type(within(dialog).getByLabelText("Nama"), "Baru");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));

    expect(await screen.findByDisplayValue(PASSWORD)).toBeInTheDocument();
    expect(screen.getByText("Simpan sekarang — tidak akan ditampilkan lagi.")).toBeInTheDocument();
    expect(actions.createMemberAction).toHaveBeenCalledWith({
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

  it("keeps the generated password out of every query and mutation cache entry", async () => {
    actions.createMemberAction.mockResolvedValue(ok({ member: budi, temporaryPassword: PASSWORD }));
    let client!: QueryClient;
    const { TestWrapper } = await import("@/test-utils/test-wrapper");
    const { useQueryClient } = await import("@tanstack/react-query");
    function Grab() {
      client = useQueryClient();
      return null;
    }
    const { render } = await import("@testing-library/react");
    render(
      <TestWrapper>
        <Grab />
        <ActiveOrgProvider orgId="o1">
          <CurrentUserProvider userId="u1">
            <MembersPage />
          </CurrentUserProvider>
        </ActiveOrgProvider>
      </TestWrapper>
    );
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: "Tambah anggota" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Email"), "baru@x.id");
    await userEvent.type(within(dialog).getByLabelText("Nama"), "Baru");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await screen.findByDisplayValue(PASSWORD);
    expect(cacheContains(client, PASSWORD)).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Selesai" }));
    await waitFor(() => expect(screen.queryByDisplayValue(PASSWORD)).not.toBeInTheDocument());
    expect(cacheContains(client, PASSWORD)).toBe(false);
    // org id is part of the key
    expect(
      client
        .getQueryCache()
        .getAll()
        .every((q) => q.queryKey.includes("o1"))
    ).toBe(true);
  });

  it("opens each form modal from the URL and clears it on close", async () => {
    renderPage();
    await screen.findByText("Budi");

    await userEvent.click(screen.getByRole("button", { name: "Tambah anggota" }));
    await waitFor(() => expect(window.location.search).toBe("?modal=create"));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Batal" })
    );
    await waitFor(() => expect(window.location.search).toBe(""));
    await dialogClosed();
  });

  it("opens add-existing from the URL", async () => {
    renderPage();
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: "Tambah anggota lama" }));
    await waitFor(() => expect(window.location.search).toBe("?modal=existing"));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Batal" })
    );
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("opens the roles modal from the URL with the member id as target", async () => {
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Atur role" }));
    await waitFor(() => expect(window.location.search).toBe("?modal=roles&target=u2"));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Batal" })
    );
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("restores a form modal from a deep link", async () => {
    window.history.replaceState(null, "", "/?modal=roles&target=u2");
    renderPage();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Atur role Budi")).toBeInTheDocument();
  });

  it("never puts the generated password in the URL", async () => {
    actions.createMemberAction.mockResolvedValue(ok({ member: budi, temporaryPassword: PASSWORD }));
    renderPage();
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: "Tambah anggota" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Email"), "baru@x.id");
    await userEvent.type(within(dialog).getByLabelText("Nama"), "Baru");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await screen.findByDisplayValue(PASSWORD);
    expect(window.location.search).toBe("");
    expect(window.location.href).not.toContain(PASSWORD);
  });

  it("toasts the BE message when creating fails", async () => {
    actions.createMemberAction.mockResolvedValue(fail("Email sudah terdaftar"));
    renderPage();
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: "Tambah anggota" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Email"), "baru@x.id");
    await userEvent.type(within(dialog).getByLabelText("Nama"), "Baru");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText("Email sudah terdaftar")).toBeInTheDocument();
    expect(screen.queryByText(/Simpan sekarang/)).not.toBeInTheDocument();
  });

  it("adds an existing member by email only", async () => {
    actions.addExistingMemberAction.mockResolvedValue(ok(budi));
    renderPage();
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: "Tambah anggota lama" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Email"), "lama@x.id");
    await userEvent.click(within(dialog).getByRole("button", { name: "Tambah" }));
    await waitFor(() =>
      expect(actions.addExistingMemberAction).toHaveBeenCalledWith({ email: "lama@x.id" })
    );
    await dialogClosed();
  });

  it("toasts the BE message when adding an existing member fails", async () => {
    actions.addExistingMemberAction.mockResolvedValue(fail("Pengguna tidak ditemukan"));
    renderPage();
    await screen.findByText("Budi");
    await userEvent.click(screen.getByRole("button", { name: "Tambah anggota lama" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Email"), "lama@x.id");
    await userEvent.click(within(dialog).getByRole("button", { name: "Tambah" }));
    expect(await screen.findByText("Pengguna tidak ditemukan")).toBeInTheDocument();
  });

  it("saves the selected role ids", async () => {
    actions.setMemberRolesAction.mockResolvedValue(ok(budi));
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Atur role" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /Role/ }));
    await userEvent.click(await screen.findByText("Billing · Admin"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(actions.setMemberRolesAction).toHaveBeenCalledWith(
        "u2",
        expect.arrayContaining(["r1", "r2"])
      )
    );
  });

  it("toasts the BE message when saving roles fails", async () => {
    actions.setMemberRolesAction.mockResolvedValue(fail("Role tidak valid"));
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Atur role" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText("Role tidak valid")).toBeInTheDocument();
  });

  it("asks for confirmation naming the member before removing", async () => {
    actions.removeMemberAction.mockResolvedValue(ok({ userId: "u2" }));
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Keluarkan dari org" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Budi/)).toBeInTheDocument();
    expect(actions.removeMemberAction).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Keluarkan" }));
    await waitFor(() => expect(actions.removeMemberAction).toHaveBeenCalledWith("u2"));
  });

  it("does not remove when the confirmation is cancelled", async () => {
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Keluarkan dari org" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Batal" })
    );
    expect(actions.removeMemberAction).not.toHaveBeenCalled();
  });

  it("toasts the BE message when removing fails", async () => {
    actions.removeMemberAction.mockResolvedValue(fail("Tidak bisa mengeluarkan"));
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Keluarkan dari org" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Keluarkan" })
    );
    expect(await screen.findByText("Tidak bisa mengeluarkan")).toBeInTheDocument();
  });

  it("confirms before deactivating", async () => {
    actions.setMemberActiveAction.mockResolvedValue(ok(budi));
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Nonaktifkan" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Budi/)).toBeInTheDocument();
    expect(actions.setMemberActiveAction).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Nonaktifkan" }));
    await waitFor(() => expect(actions.setMemberActiveAction).toHaveBeenCalledWith("u2", false));
    await dialogClosed();
  });

  it("activates without a confirmation", async () => {
    actions.setMemberActiveAction.mockResolvedValue(ok(siti));
    renderPage();
    await openMenu("Siti");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Aktifkan" }));
    await waitFor(() => expect(actions.setMemberActiveAction).toHaveBeenCalledWith("u3", true));
    await dialogClosed();
  });

  it("toasts the BE message when activating fails", async () => {
    actions.setMemberActiveAction.mockResolvedValue(fail("Gagal mengaktifkan"));
    renderPage();
    await openMenu("Siti");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Aktifkan" }));
    expect(await screen.findByText("Gagal mengaktifkan")).toBeInTheDocument();
  });

  it("resets a password and shows the new one once, never caching it", async () => {
    actions.resetMemberPasswordAction.mockResolvedValue(ok({ temporaryPassword: PASSWORD }));
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Reset password" }));
    expect(await screen.findByDisplayValue(PASSWORD)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Selesai" }));
    await waitFor(() => expect(screen.queryByDisplayValue(PASSWORD)).not.toBeInTheDocument());
    expect(document.body.textContent).not.toContain(PASSWORD);
  });

  it("toasts the BE message when resetting fails", async () => {
    actions.resetMemberPasswordAction.mockResolvedValue(fail("Gagal reset"));
    renderPage();
    await openMenu("Budi");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Reset password" }));
    expect(await screen.findByText("Gagal reset")).toBeInTheDocument();
  });

  it("offers the same row actions on mobile cards", async () => {
    mobile.value = true;
    renderPage();
    await userEvent.click(await screen.findByText("Budi"));
    expect(screen.getByText("Anda")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Aksi untuk Budi" }));
    expect(await screen.findByRole("menuitem", { name: "Atur role" })).toBeInTheDocument();
  });
});
