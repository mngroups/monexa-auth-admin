import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test-utils/render";
import { ConfirmActionModal } from "../confirm-action-modal";

function setup(props: Partial<React.ComponentProps<typeof ConfirmActionModal>> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <ConfirmActionModal
      open
      title="Hapus anggota"
      description="Hapus Budi dari organisasi?"
      confirmLabel="Hapus"
      pending={false}
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    />
  );
  return { onConfirm, onClose };
}

describe("ConfirmActionModal", () => {
  it("names the target and confirms once", () => {
    const { onConfirm } = setup();
    expect(screen.getByText("Hapus Budi dari organisasi?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables the confirm button while pending", () => {
    const { onConfirm } = setup({ pending: true });
    const button = screen.getByRole("button", { name: /Hapus/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("closes on cancel", () => {
    const { onClose } = setup({ destructive: true });
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onClose).toHaveBeenCalled();
  });
});
