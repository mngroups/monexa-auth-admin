"use client";

import { Button } from "@mono/ui";
import { FilePreviewer, formatFileSize } from "@mono/ui/file-previewer";
import { SingleFileDropzone, type SinglePreviewState } from "@mono/ui/file-upload";
import { cn } from "@mono/utils";
import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmActionModal } from "@/features/admin-shared/components/confirm-action-modal";

import { PORTAL_URL_NOTE, validateLogo } from "../schema";

// The dropzone enforces extensions itself, with its own wording. Listing the
// usual image extensions lets every picked image reach `transformFile`, where
// the exact BE-mirroring messages are produced (type via MIME, then size).
const LOGO_HELPER = "PNG, JPG, atau WebP · maksimal 512 KB";
export const LIGHT_LOGO_HELPER = `Logo berwarna untuk latar putih. ${LOGO_HELPER}.`;
export const DARK_LOGO_HELPER =
  "Versi putih/terang dengan latar transparan (PNG atau WebP) untuk mode gelap. Opsional — jika kosong, logo biasa yang dipakai. Maksimal 512 KB.";
const DROPZONE_EXTS = ".png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.tif,.tiff,.heic,.avif,.ico";

type LogoUploaderProps = {
  /** The logo already on the server (public URL), or null. */
  currentUrl: string | null;
  /** The org has a logo on the server, even if its public URL cannot be built (no portal URL). */
  hasLogo: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  /**
   * `dark` is the white-logo slot: its preview sits on a dark slate background so a
   * white logo is visible, and its labels say "versi putih". Default `light`.
   */
  tone?: "light" | "dark";
  /** Replaces the default helper line under the preview. */
  helperText?: string;
  /** Accessible name of the slot, so two uploaders on one page can be told apart. */
  label?: string;
};

/**
 * Logo picker with client-side validation (PNG/JPG/WebP, 512 KB), preview,
 * "Simpan", "Batal" and a confirmed "Hapus logo". A refused file is never
 * handed to `onUpload`. Failures are `onUpload`/`onRemove`'s to report (toast);
 * a rejected promise just leaves the picked file in place for a retry.
 */
export function LogoUploader({
  currentUrl,
  hasLogo,
  onUpload,
  onRemove,
  tone = "light",
  helperText = LOGO_HELPER,
  label,
}: LogoUploaderProps) {
  const dark = tone === "dark";
  const noun = dark ? "logo versi putih" : "logo";
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = async () => {
    if (!file) return;
    setSaving(true);
    try {
      await onUpload(file);
      setFile(null);
    } catch {
      // Reported by the caller; keep the file so the admin can retry.
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    setRemoving(true);
    try {
      await onRemove();
    } catch {
      // Reported by the caller.
    } finally {
      setRemoving(false);
      setConfirmOpen(false);
    }
  };

  const shownUrl = previewUrl ?? currentUrl;
  const shownName = file?.name ?? (dark ? "Logo versi putih saat ini" : "Logo saat ini");
  const busy = saving || removing;

  const renderSlot = (state: SinglePreviewState) => (
    <div className="space-y-3 p-4">
      <div
        data-testid="logo-preview"
        className={cn(
          "flex min-h-32 items-center justify-center rounded-lg p-4",
          dark ? "bg-[#0f172a]" : "bg-muted/40"
        )}
      >
        {shownUrl ? (
          // biome-ignore lint/performance/noImgElement: blob: and cross-origin portal URLs can't go through next/image
          <img
            src={shownUrl}
            alt={file ? `Pratinjau ${noun}` : shownName}
            className="max-h-24 max-w-full object-contain"
          />
        ) : (
          <div
            className={cn(
              "flex flex-col items-center gap-2 text-center",
              dark ? "text-slate-300" : "text-muted-foreground"
            )}
          >
            <ImageIcon className="size-8" aria-hidden="true" />
            <p className="text-sm">{hasLogo ? PORTAL_URL_NOTE : `Belum ada ${noun}.`}</p>
          </div>
        )}
      </div>
      {shownUrl ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{shownName}</p>
            {file ? (
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setViewing(true)}>
              Lihat
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={state.openPicker}>
              Ganti
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={state.openPicker}>
          Pilih {noun}
        </Button>
      )}
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4" role="group" aria-label={label}>
      <SingleFileDropzone
        testId={dark ? "logo-dark-dropzone" : "logo-dropzone"}
        accept={DROPZONE_EXTS}
        maxSizeMB={0}
        helperText={helperText}
        value={file}
        onChange={setFile}
        readOnly={busy}
        transformFile={async (picked) => {
          const refusal = validateLogo(picked);
          return refusal ? { error: refusal } : { file: picked };
        }}
        preview={renderSlot}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hasLogo ? (
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
          >
            {dark ? "Hapus logo versi putih" : "Hapus logo"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!file || busy}
            onClick={() => setFile(null)}
          >
            Batal
          </Button>
          <Button type="button" disabled={!file || busy} onClick={save}>
            {saving ? "Menyimpan" : "Simpan"}
          </Button>
        </div>
      </div>
      <ConfirmActionModal
        open={confirmOpen}
        title={dark ? "Hapus logo versi putih?" : "Hapus logo?"}
        description={
          dark
            ? "Mode gelap akan kembali memakai logo biasa."
            : "Halaman login akan kembali memakai tampilan bawaan tanpa logo organisasi."
        }
        confirmLabel="Hapus"
        destructive
        pending={removing}
        onConfirm={confirmRemove}
        onClose={() => setConfirmOpen(false)}
      />
      {shownUrl ? (
        <FilePreviewer
          open={viewing}
          onOpenChange={setViewing}
          title={dark ? "Logo versi putih" : "Logo"}
          files={[
            {
              id: "logo",
              name: shownName,
              url: shownUrl,
              size: file?.size,
              // A picked file knows its type. The saved logo may be PNG, JPEG or
              // WebP and the portal URL has no extension, so use the neutral image
              // type (the previewer only checks the "image/" prefix).
              mimeType: file?.type || "image/*",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
