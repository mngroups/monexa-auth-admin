"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  DynamicModal,
  FloatingInput,
  Form,
  Skeleton,
  Switch,
  TabBar,
} from "@mono/ui";
import { getErrorMessage } from "@mono/utils";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ConfirmActionModal } from "@/features/admin-shared/components/confirm-action-modal";
import { LogoUploader } from "@/features/branding/components/logo-uploader";

import {
  useOrgApps,
  useRemoveOrgLogo,
  useSetOrgApp,
  useUpdateOrg,
  useUploadOrgLogo,
} from "../hooks/use-orgs";
import {
  type OrgApp,
  type OrgFormValues,
  type OrgListItem,
  type OrgUpdateValues,
  orgFormSchema,
} from "../schema";

type Tab = "info" | "apps" | "logo";
const TABS = [
  { key: "info", label: "Info" },
  { key: "apps", label: "Aplikasi" },
  { key: "logo", label: "Logo" },
] as const;

function InfoTab({ org }: { org: OrgListItem }) {
  const update = useUpdateOrg();
  const values: OrgFormValues = { name: org.name, slug: org.slug };
  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    mode: "onChange",
    defaultValues: values,
  });
  const { isValid, isDirty } = form.formState;

  useEffect(() => {
    form.reset({ name: org.name, slug: org.slug });
  }, [org.name, org.slug, form]);

  // PATCH only what changed.
  const submit = form.handleSubmit((v) => {
    const changed: OrgUpdateValues = {};
    if (v.name !== org.name) changed.name = v.name;
    if (v.slug !== org.slug) changed.slug = v.slug;
    update.mutate({ id: org.id, values: changed });
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <FloatingInput control={form.control} name="name" label="Nama" />
        <FloatingInput control={form.control} name="slug" label="Slug" />
        <div className="flex justify-end">
          <Button type="submit" disabled={!(isValid && isDirty) || update.isPending}>
            Simpan
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AppsTab({ org }: { org: OrgListItem }) {
  const apps = useOrgApps(org.id, true);
  const setApp = useSetOrgApp(org.id);
  const [confirm, setConfirm] = useState<OrgApp | null>(null);

  function toggle(app: OrgApp, enabled: boolean) {
    if (enabled) setApp.mutate({ appId: app.appId, enabled: true });
    else setConfirm(app);
  }

  if (apps.isLoading) {
    return (
      <div className="space-y-3" data-testid="org-apps-skeleton">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (apps.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {getErrorMessage(apps.error)}
      </p>
    );
  }
  const items = apps.data ?? [];
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada aplikasi terdaftar.</p>;
  }

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {items.map((app) => (
          <li key={app.appId} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 font-medium">
                <span className="truncate">{app.name}</span>
                {!app.isActive && <Badge variant="secondary">Aplikasi nonaktif</Badge>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{app.clientId}</div>
            </div>
            <Switch
              aria-label={app.name}
              checked={app.enabled}
              disabled={setApp.isPending}
              onCheckedChange={(next) => toggle(app, next)}
            />
          </li>
        ))}
      </ul>
      <ConfirmActionModal
        open={confirm !== null}
        title={confirm ? `Nonaktifkan ${confirm.name} untuk ${org.name}?` : "Nonaktifkan aplikasi"}
        description="Grant user ke aplikasi ini akan dicabut."
        confirmLabel="Nonaktifkan"
        destructive
        pending={setApp.isPending}
        onConfirm={() => {
          if (confirm) {
            setApp.mutate(
              { appId: confirm.appId, enabled: false },
              { onSettled: () => setConfirm(null) }
            );
          }
        }}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

function LogoTab({ org }: { org: OrgListItem }) {
  const upload = useUploadOrgLogo(org.id);
  const remove = useRemoveOrgLogo(org.id);
  return (
    <LogoUploader
      currentUrl={org.logoUrl}
      hasLogo={org.logo != null}
      onUpload={async (file) => {
        await upload.mutateAsync(file);
      }}
      onRemove={async () => {
        await remove.mutateAsync();
      }}
    />
  );
}

export function OrgDetailModal({ org, onClose }: { org: OrgListItem | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("info");

  const orgId = org?.id;
  useEffect(() => {
    setTab("info");
  }, [orgId]);

  return (
    <DynamicModal
      open={org !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={org ? org.name : "Organisasi"}
      description={org ? org.slug : undefined}
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
      modalWidth="40rem"
    >
      {org && (
        <div className="space-y-4">
          <TabBar items={TABS} active={tab} onChange={setTab} aria-label="Detail organisasi" />
          {tab === "info" && <InfoTab org={org} />}
          {tab === "apps" && <AppsTab org={org} />}
          {tab === "logo" && <LogoTab org={org} />}
        </div>
      )}
    </DynamicModal>
  );
}
