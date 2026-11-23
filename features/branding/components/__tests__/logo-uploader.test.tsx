import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test-utils/render";

const previewer = vi.hoisted(() => ({ files: [] as { mimeType?: string; name: string }[] }));
vi.mock("@mono/ui/file-previewer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mono/ui/file-previewer")>()),
  FilePreviewer: ({ files }: { files: { mimeType?: string; name: string }[] }) => {
    previewer.files = files;
    return null;
  },
}));

const { LogoUploader } = await import("../logo-uploader");

describe("LogoUploader previewer mime", () => {
  beforeEach(() => {
    previewer.files = [];
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("does not claim the current logo is a PNG (it may be JPEG or WebP)", () => {
    renderWithProviders(
      <LogoUploader
        currentUrl="https://auth.example.id/branding/orgs/acme/logo?v=e1"
        hasLogo
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    const [current] = previewer.files;
    expect(current.mimeType).not.toBe("image/png");
    expect(current.mimeType).toBe("image/*");
  });

  it("uses the picked file's own type for the preview", async () => {
    renderWithProviders(
      <LogoUploader currentUrl={null} hasLogo={false} onUpload={vi.fn()} onRemove={vi.fn()} />
    );
    const input = await screen.findByTestId("logo-dropzone-input");
    const jpeg = new File([new Uint8Array(100)], "a.jpg", { type: "image/jpeg" });
    await userEvent.upload(input, jpeg, { applyAccept: false });
    await screen.findByText("a.jpg");
    expect(previewer.files[0].mimeType).toBe("image/jpeg");
  });
});

describe("LogoUploader tone", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("uses a dark slate preview background for the dark tone so a white logo is visible", () => {
    renderWithProviders(
      <LogoUploader
        tone="dark"
        currentUrl="https://auth.example.id/branding/orgs/acme/logo?variant=dark&v=d1"
        hasLogo
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    const area = screen.getByTestId("logo-preview");
    expect(area).toHaveClass("bg-[#0f172a]");
    expect(screen.getByRole("img", { name: "Logo versi putih saat ini" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hapus logo versi putih" })).toBeInTheDocument();
  });

  it("keeps the muted preview background by default and shows the given helper text", () => {
    renderWithProviders(
      <LogoUploader
        currentUrl={null}
        hasLogo={false}
        helperText="Teks bantuan khusus"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByTestId("logo-preview")).not.toHaveClass("bg-[#0f172a]");
    expect(screen.getByText("Teks bantuan khusus")).toBeInTheDocument();
  });

  it("asks 'Hapus logo versi putih?' before removing the dark logo", async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <LogoUploader tone="dark" currentUrl={null} hasLogo onUpload={vi.fn()} onRemove={onRemove} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Hapus logo versi putih" }));
    expect(await screen.findByText("Hapus logo versi putih?")).toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
