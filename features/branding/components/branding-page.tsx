"use client";

import { PageHeader, Skeleton } from "@mono/ui";
import { getErrorMessage } from "@mono/utils";
import { useBranding, useRemoveLogo, useUploadLogo } from "../hooks/use-branding";
import { PORTAL_URL_NOTE } from "../schema";
import { LogoUploader } from "./logo-uploader";

const CARD = "rounded-xl border bg-card p-5 md:p-6";

function PageSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="branding-skeleton">
      <div className={CARD}>
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
      <div className={CARD}>
        <Skeleton className="mb-4 h-5 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

export function BrandingPage() {
  const { data, isPending, error } = useBranding();
  const upload = useUploadLogo();
  const remove = useRemoveLogo();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branding"
        subtitle="Atur logo yang tampil di halaman login organisasi Anda."
      />
      {isPending ? (
        <PageSkeleton />
      ) : error || !data ? (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section className={CARD} aria-labelledby="logo-title">
            <h2 id="logo-title" className="mb-4 text-base font-semibold">
              Logo login
            </h2>
            <LogoUploader
              currentUrl={data.logoUrl}
              hasLogo={data.hasLogo}
              onUpload={async (file) => {
                await upload.mutateAsync(file);
              }}
              onRemove={async () => {
                await remove.mutateAsync();
              }}
            />
          </section>
          <section className={CARD} aria-labelledby="preview-title">
            <h2 id="preview-title" className="mb-4 text-base font-semibold">
              Pratinjau halaman login
            </h2>
            <div className="mb-4 flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/40 p-6">
              {data.logoUrl ? (
                // biome-ignore lint/performance/noImgElement: cross-origin portal URL, not optimizable by next/image
                <img
                  src={data.logoUrl}
                  alt="Logo di halaman login"
                  className="max-h-16 object-contain"
                />
              ) : data.hasLogo ? (
                <p className="text-sm text-muted-foreground">{PORTAL_URL_NOTE}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Logo belum diatur.</p>
              )}
              <p className="text-sm text-muted-foreground">Masuk ke akun Anda</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Aplikasi yang menampilkan halaman ini memakai <code>AUTH_ORG_HINT={data.slug}</code>.
              Perubahan dapat memakan waktu hingga 5 menit untuk tampil di semua aplikasi.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
