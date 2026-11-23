"use client";

import { Button, DynamicModal, Input, toast } from "@mono/ui";

type OneTimeSecretModalProps = {
  open: boolean;
  title: string;
  label: string;
  secret: string;
  onClose: () => void;
};

/**
 * Shows a secret exactly once. The parent keeps `secret` in component state and
 * drops it in `onClose`; never cache it (query, URL, storage, store, console).
 */
export function OneTimeSecretModal({
  open,
  title,
  label,
  secret,
  onClose,
}: OneTimeSecretModalProps) {
  async function copy() {
    await navigator.clipboard.writeText(secret);
    toast.success("Disalin");
  }

  return (
    <DynamicModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      confirmLabel="Selesai"
      onConfirm={onClose}
      footerLayout="inline"
      testId="one-time-secret-modal"
    >
      <div className="space-y-3">
        <p className="text-sm font-medium">Simpan sekarang — tidak akan ditampilkan lagi.</p>
        <div className="flex items-center gap-2">
          <Input readOnly aria-label={label} value={secret} className="font-mono" />
          <Button type="button" variant="outline" onClick={copy}>
            Salin
          </Button>
        </div>
      </div>
    </DynamicModal>
  );
}
