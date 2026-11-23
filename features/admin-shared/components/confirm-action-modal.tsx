"use client";

import { DynamicModal } from "@mono/ui";

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  /** Names the target, e.g. "Hapus Budi dari organisasi?". */
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** The one confirmation step for every destructive admin action. */
export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  pending,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  return (
    <DynamicModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel="Batal"
      variant={destructive ? "danger" : "default"}
      loading={pending}
      confirmDisabled={pending}
      onConfirm={onConfirm}
      onCancel={onClose}
    />
  );
}
