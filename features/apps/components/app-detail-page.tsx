"use client";

import { PageHeader, Skeleton, StatusLabel, TabBar } from "@mono/ui";
import { getErrorMessage } from "@mono/utils";
import Link from "next/link";
import { useState } from "react";

import { ConfirmActionModal } from "@/features/admin-shared/components/confirm-action-modal";
import { OneTimeSecretModal } from "@/features/admin-shared/components/one-time-secret-modal";

import { useApp, useRotateSecret, useSetAppActive } from "../hooks/use-apps";
import { ADMIN_CLIENT_ID } from "../schema";
import { PermissionsTab } from "./permissions-tab";
import { RolesTab } from "./roles-tab";
import { SettingsTab } from "./settings-tab";

type Tab = "settings" | "permissions" | "roles";
const TABS = [
  { key: "settings", label: "Pengaturan" },
  { key: "permissions", label: "Permission" },
  { key: "roles", label: "Role" },
] as const;

export function AppDetailPage({ id }: { id: string }) {
  const app = useApp(id);
  const [tab, setTab] = useState<Tab>("settings");
  const [rotating, setRotating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  // Component state only: dropped when the modal closes.
  const [secret, setSecret] = useState<string | null>(null);
  const rotate = useRotateSecret(setSecret);
  const setActive = useSetAppActive(id);

  if (app.isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6" data-testid="app-detail-skeleton">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (app.isError || !app.data) {
    return (
      <div className="p-4 md:p-6">
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(app.error)}
        </p>
      </div>
    );
  }

  const data = app.data;
  // The admin UI's own client: deactivating it would lock every admin out.
  const isAdminApp = data.clientId === ADMIN_CLIENT_ID;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title={data.name}
        subtitle={data.clientId}
        back={{ href: "/apps", label: "Aplikasi" }}
        linkComponent={Link}
        actions={[
          {
            label: "Rotasi secret",
            variant: "secondary",
            hidden: isAdminApp,
            onClick: () => setRotating(true),
          },
          data.isActive
            ? {
                label: "Nonaktifkan",
                variant: "secondary",
                hidden: isAdminApp,
                onClick: () => setDeactivating(true),
              }
            : { label: "Aktifkan", variant: "primary", onClick: () => setActive.mutate(true) },
        ]}
      >
        <StatusLabel tone={data.isActive ? "success" : "default"}>
          {data.isActive ? "Aktif" : "Nonaktif"}
        </StatusLabel>
      </PageHeader>

      {isAdminApp && (
        <p className="text-sm text-muted-foreground">
          Secret aplikasi admin dirotasi lewat `pnpm auth:bootstrap` di monexa-auth
          (BOOTSTRAP_ROTATE_ADMIN_SECRET=true).
        </p>
      )}

      <TabBar items={TABS} active={tab} onChange={setTab} aria-label="Detail aplikasi" />
      {tab === "settings" && <SettingsTab app={data} />}
      {tab === "permissions" && <PermissionsTab appId={id} />}
      {tab === "roles" && <RolesTab appId={id} />}

      <ConfirmActionModal
        open={rotating}
        title="Rotasi secret"
        description={`Rotasi client secret ${data.name}? Secret lama langsung tidak berlaku.`}
        confirmLabel="Rotasi"
        destructive
        pending={rotate.isPending}
        onConfirm={() => rotate.mutate(id, { onSuccess: () => setRotating(false) })}
        onClose={() => setRotating(false)}
      />
      <ConfirmActionModal
        open={deactivating}
        title="Nonaktifkan aplikasi"
        description={`Nonaktifkan ${data.name}? Pengguna tidak bisa masuk lewat aplikasi ini sampai diaktifkan lagi.`}
        confirmLabel="Nonaktifkan"
        destructive
        pending={setActive.isPending}
        onConfirm={() => setActive.mutate(false, { onSuccess: () => setDeactivating(false) })}
        onClose={() => setDeactivating(false)}
      />
      <OneTimeSecretModal
        open={secret !== null}
        title="Client secret baru"
        label="Client secret"
        secret={secret ?? ""}
        onClose={() => setSecret(null)}
      />
    </div>
  );
}
