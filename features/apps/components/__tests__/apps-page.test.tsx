import type { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  listAppsAction: vi.fn(),
  createAppAction: vi.fn(),
}));
vi.mock("../../actions/apps.actions", () => actions);

const { AppsPage } = await import("../apps-page");

const ok = <T,>(data: T) => ({ ok: true as const, data });
const fail = (message: string) => ({ ok: false as const, error: { message, status: 409 } });

const base = {
  redirectUris: ["https://b.id/cb"],
  postLogoutRedirectUris: [],
  allowedGrants: ["authorization_code"],
  accessTtlSeconds: 900,
  refreshTtlSeconds: 86400,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const billing = { ...base, id: "a1", clientId: "billing", name: "Billing", isActive: true };
const legacy = { ...base, id: "a2", clientId: "legacy", name: "Legacy", isActive: false };
const SECRET = "sec-Abc123-xyz";

function renderPage() {
  return renderWithProviders(
    <ActiveOrgProvider orgId="platform">
      <AppsPage />
    </ActiveOrgProvider>
  );
}

async function fillCreateForm() {
  await userEvent.click(screen.getByRole("button", { name: "Tambah aplikasi" }));
  const dialog = await screen.findByRole("dialog");
  await userEvent.type(within(dialog).getByLabelText("Client ID"), "pos");
  await userEvent.type(within(dialog).getByLabelText("Nama"), "POS");
  await userEvent.type(
    within(dialog).getByLabelText("Redirect URI (satu per baris)"),
    "https://pos.id/cb{enter} https://pos.id/cb2 {enter}"
  );
  await userEvent.type(
    within(dialog).getByLabelText("Post-logout redirect URI (satu per baris)"),
    "https://pos.id/bye"
  );
  await userEvent.type(within(dialog).getByLabelText("Masa berlaku access token (detik)"), "900");
  await userEvent.type(
    within(dialog).getByLabelText("Masa berlaku refresh token (detik)"),
    "86400"
  );
  return dialog;
}

describe("AppsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobile.value = false;
    actions.listAppsAction.mockResolvedValue(
      ok({ items: [billing, legacy], page: 1, pageSize: 10, total: 2 })
    );
  });

  it("shows a skeleton, then name (linked to the detail), client id and status", async () => {
    renderPage();
    expect(screen.getByTestId("apps-skeleton")).toBeInTheDocument();
    const link = await screen.findByRole("link", { name: "Billing" });
    expect(link).toHaveAttribute("href", "/apps/a1");
    expect(screen.getByText("legacy")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByText("Nonaktif")).toBeInTheDocument();
    expect(actions.listAppsAction).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  it("searches by text, back on page 1", async () => {
    renderPage();
    await screen.findByText("Billing");
    await userEvent.type(screen.getByRole("searchbox", { name: "Cari aplikasi" }), "bi");
    await waitFor(() =>
      expect(actions.listAppsAction).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, q: "bi" })
    );
  });

  it("shows an empty state", async () => {
    actions.listAppsAction.mockResolvedValue(ok({ items: [], page: 1, pageSize: 10, total: 0 }));
    renderPage();
    expect(await screen.findByText("Belum ada aplikasi")).toBeInTheDocument();
  });

  it("shows the load error", async () => {
    actions.listAppsAction.mockResolvedValue(fail("Server error"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
  });

  it("renders cards on mobile", async () => {
    mobile.value = true;
    renderPage();
    expect(await screen.findByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("legacy")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("creates an app with parsed uri lists and shows the secret once", async () => {
    actions.createAppAction.mockResolvedValue(
      ok({ app: { ...billing, id: "a9", clientId: "pos" }, clientSecret: SECRET })
    );
    renderPage();
    await screen.findByText("Billing");
    const dialog = await fillCreateForm();
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));

    expect(await screen.findByDisplayValue(SECRET)).toBeInTheDocument();
    expect(screen.getByText("Simpan sekarang — tidak akan ditampilkan lagi.")).toBeInTheDocument();
    expect(actions.createAppAction).toHaveBeenCalledWith({
      clientId: "pos",
      name: "POS",
      redirectUris: ["https://pos.id/cb", "https://pos.id/cb2"],
      postLogoutRedirectUris: ["https://pos.id/bye"],
      allowedGrants: ["authorization_code"],
      accessTtlSeconds: 900,
      refreshTtlSeconds: 86400,
    });
    await waitFor(() => expect(actions.listAppsAction).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole("button", { name: "Selesai" }));
    await waitFor(() => expect(screen.queryByDisplayValue(SECRET)).not.toBeInTheDocument());
    expect(document.body.textContent).not.toContain(SECRET);
    expect(window.location.href).not.toContain(SECRET);
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(SECRET);
  });

  it("keeps the client secret out of every query and mutation cache entry", async () => {
    actions.createAppAction.mockResolvedValue(
      ok({ app: { ...billing, id: "a9", clientId: "pos" }, clientSecret: SECRET })
    );
    let client!: QueryClient;
    const { TestWrapper } = await import("@/test-utils/test-wrapper");
    const { useQueryClient } = await import("@tanstack/react-query");
    function Grab() {
      client = useQueryClient();
      return null;
    }
    render(
      <TestWrapper>
        <Grab />
        <ActiveOrgProvider orgId="platform">
          <AppsPage />
        </ActiveOrgProvider>
      </TestWrapper>
    );
    const cacheHolds = () =>
      JSON.stringify([
        client
          .getQueryCache()
          .getAll()
          .map((q) => ({ key: q.queryKey, data: q.state.data })),
        client
          .getMutationCache()
          .getAll()
          .map((m) => ({ data: m.state.data, vars: m.state.variables })),
      ]).includes(SECRET);

    await screen.findByText("Billing");
    const dialog = await fillCreateForm();
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await screen.findByDisplayValue(SECRET);
    expect(cacheHolds()).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Selesai" }));
    await waitFor(() => expect(screen.queryByDisplayValue(SECRET)).not.toBeInTheDocument());
    expect(cacheHolds()).toBe(false);
  });

  it("validates the create form: a grant is required", async () => {
    renderPage();
    await screen.findByText("Billing");
    await userEvent.click(screen.getByRole("button", { name: "Tambah aplikasi" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Client ID"), "pos");
    await userEvent.type(within(dialog).getByLabelText("Nama"), "POS");
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "Authorization code" }));
    expect(within(dialog).getByRole("button", { name: "Simpan" })).toBeDisabled();
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "Password" }));
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Simpan" })).toBeEnabled()
    );
  });

  it("toasts a refused create and keeps the form open", async () => {
    actions.createAppAction.mockResolvedValue(fail("Client ID sudah dipakai"));
    renderPage();
    await screen.findByText("Billing");
    const dialog = await fillCreateForm();
    await userEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText("Client ID sudah dipakai")).toBeInTheDocument();
    expect(screen.queryByText("Simpan sekarang — tidak akan ditampilkan lagi.")).toBeNull();
  });
});
