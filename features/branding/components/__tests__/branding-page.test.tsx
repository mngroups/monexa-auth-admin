import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveOrgProvider } from "@/features/admin-shared/hooks/use-active-org";
import { renderWithProviders } from "@/test-utils/render";

const actions = vi.hoisted(() => ({
  getBrandingAction: vi.fn(),
  uploadLogoAction: vi.fn(),
  removeLogoAction: vi.fn(),
}));
vi.mock("../../actions/branding.actions", () => actions);

const { BrandingPage } = await import("../branding-page");

const ok = <T,>(data: T) => ({ ok: true as const, data });
const fail = (message: string) => ({ ok: false as const, error: { message, status: 422 } });

const withLogo = { slug: "acme", logoUrl: "https://auth.example.id/branding/orgs/acme/logo?v=e1" };
const noLogo = { slug: "acme", logoUrl: null };

const file = (name: string, type: string, bytes = 1000) =>
  new File([new Uint8Array(bytes)], name, { type });

function renderPage() {
  return renderWithProviders(
    <ActiveOrgProvider orgId="o1">
      <BrandingPage />
    </ActiveOrgProvider>
  );
}

async function pick(f: File) {
  const input = await screen.findByTestId("logo-dropzone-input");
  await userEvent.upload(input, f, { applyAccept: false });
}

describe("BrandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("shows an empty state when there is no logo", async () => {
    actions.getBrandingAction.mockResolvedValue(ok(noLogo));
    renderPage();
    expect(await screen.findByText(/belum ada logo/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hapus logo" })).not.toBeInTheDocument();
    expect(screen.getByText(/AUTH_ORG_HINT=acme/)).toBeInTheDocument();
    expect(screen.getByText(/5 menit/)).toBeInTheDocument();
  });

  it("refuses a 600 KB PNG and never calls the upload", async () => {
    actions.getBrandingAction.mockResolvedValue(ok(noLogo));
    renderPage();
    await pick(file("big.png", "image/png", 600 * 1024));
    expect(await screen.findByText("Ukuran logo maksimal 512 KB.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simpan" })).toBeDisabled();
    expect(actions.uploadLogoAction).not.toHaveBeenCalled();
  });

  it("refuses a gif", async () => {
    actions.getBrandingAction.mockResolvedValue(ok(noLogo));
    renderPage();
    await pick(file("a.gif", "image/gif"));
    expect(await screen.findByText("Logo harus berupa PNG, JPG, atau WebP.")).toBeInTheDocument();
    expect(actions.uploadLogoAction).not.toHaveBeenCalled();
  });

  it("previews a valid PNG and Simpan uploads it as FormData", async () => {
    actions.getBrandingAction.mockResolvedValue(ok(noLogo));
    actions.uploadLogoAction.mockResolvedValue(ok({ etag: "e2", updatedAt: "t" }));
    renderPage();
    const png = file("logo.png", "image/png");
    await pick(png);
    expect(await screen.findByRole("img", { name: /pratinjau logo/i })).toHaveAttribute(
      "src",
      "blob:preview"
    );
    expect(screen.getByText("logo.png")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(actions.uploadLogoAction).toHaveBeenCalledTimes(1));
    const fd = actions.uploadLogoAction.mock.calls[0][0] as FormData;
    expect(fd.get("file")).toBe(png);
    // refetched after success
    await waitFor(() => expect(actions.getBrandingAction).toHaveBeenCalledTimes(2));
  });

  it("Batal drops the picked file", async () => {
    actions.getBrandingAction.mockResolvedValue(ok(noLogo));
    renderPage();
    await pick(file("logo.png", "image/png"));
    await userEvent.click(await screen.findByRole("button", { name: "Batal" }));
    expect(screen.queryByText("logo.png")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simpan" })).toBeDisabled();
  });

  it("toasts the BE message on a 422", async () => {
    actions.getBrandingAction.mockResolvedValue(ok(noLogo));
    actions.uploadLogoAction.mockResolvedValue(fail("Gambar rusak."));
    renderPage();
    await pick(file("logo.png", "image/png"));
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText("Gambar rusak.")).toBeInTheDocument();
    expect(screen.getByText("logo.png")).toBeInTheDocument();
  });

  it("confirms before removing the logo", async () => {
    actions.getBrandingAction.mockResolvedValue(ok(withLogo));
    actions.removeLogoAction.mockResolvedValue(ok(null));
    renderPage();
    expect(await screen.findByRole("img", { name: /logo saat ini/i })).toHaveAttribute(
      "src",
      withLogo.logoUrl
    );
    await userEvent.click(screen.getByRole("button", { name: "Hapus logo" }));
    expect(actions.removeLogoAction).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Hapus" }));
    await waitFor(() => expect(actions.removeLogoAction).toHaveBeenCalledTimes(1));
  });

  it("toasts when removing fails", async () => {
    actions.getBrandingAction.mockResolvedValue(ok(withLogo));
    actions.removeLogoAction.mockResolvedValue(fail("Gagal menghapus."));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Hapus logo" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Hapus" }));
    expect(await screen.findByText("Gagal menghapus.")).toBeInTheDocument();
  });

  it("opens the current logo in the previewer", async () => {
    actions.getBrandingAction.mockResolvedValue(ok(withLogo));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Lihat" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("shows the BE message when loading fails", async () => {
    actions.getBrandingAction.mockResolvedValue(fail("Tidak diizinkan."));
    renderPage();
    expect(await screen.findByText("Tidak diizinkan.")).toBeInTheDocument();
  });
});
