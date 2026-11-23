import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test-utils/render";
import { OneTimeSecretModal } from "../one-time-secret-modal";

const writeText = vi.fn().mockResolvedValue(undefined);

// The parent owns the secret and drops it on close, as every caller must.
function Harness() {
  const [secret, setSecret] = useState<string | null>("s3cret-value");
  return (
    <>
      <OneTimeSecretModal
        open={secret !== null}
        title="Password sementara"
        label="Password"
        secret={secret ?? ""}
        onClose={() => setSecret(null)}
      />
      <p>{secret === null ? "dropped" : "held"}</p>
    </>
  );
}

describe("OneTimeSecretModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  it("shows the secret and the one-time warning", () => {
    renderWithProviders(<Harness />);
    expect(screen.getByDisplayValue("s3cret-value")).toHaveAttribute("readonly");
    expect(screen.getByText("Simpan sekarang — tidak akan ditampilkan lagi.")).toBeInTheDocument();
  });

  it("copies the secret to the clipboard", async () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /salin/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("s3cret-value"));
    expect(await screen.findByText("Disalin")).toBeInTheDocument();
  });

  it("tells the admin to copy manually when the clipboard rejects", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /salin/i }));
    expect(
      await screen.findByText("Gagal menyalin. Salin manual dari kolom di atas.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Disalin")).not.toBeInTheDocument();
  });

  it("tells the admin to copy manually when the clipboard API is missing", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /salin/i }));
    expect(
      await screen.findByText("Gagal menyalin. Salin manual dari kolom di atas.")
    ).toBeInTheDocument();
  });

  it("is dropped by the parent after closing", async () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Selesai" }));
    await waitFor(() => expect(screen.getByText("dropped")).toBeInTheDocument());
    expect(screen.queryByDisplayValue("s3cret-value")).not.toBeInTheDocument();
  });
});
