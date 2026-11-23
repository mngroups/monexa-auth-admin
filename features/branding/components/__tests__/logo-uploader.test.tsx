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
