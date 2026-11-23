"use client";

import { useIsMobile } from "@mono/hooks";
import { useModalParam } from "@mono/hooks/next";
import type { TableColumn } from "@mono/ui";
import {
  CardSummary,
  DataTable,
  ListSearchInput,
  MobileCardList,
  MobileDataCard,
  PageHeader,
  StatusLabel,
  TableSkeleton,
} from "@mono/ui";
import { getErrorMessage } from "@mono/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

import { OneTimeSecretModal } from "@/features/admin-shared/components/one-time-secret-modal";

import { useApps, useCreateApp } from "../hooks/use-apps";
import { type App, GRANT_LABELS, toAppInput } from "../schema";
import { AppFormModal } from "./app-form-modal";

const PAGE_SIZE = 10;
const MODAL_MODES = ["create"] as const;

const grantsText = (app: App) => app.allowedGrants.map((g) => GRANT_LABELS[g]).join(", ") || "-";

function NameCell({ app }: { app: App }) {
  return (
    <div className="min-w-0">
      <Link
        href={`/apps/${encodeURIComponent(app.id)}`}
        className="truncate font-medium underline-offset-2 hover:underline"
      >
        {app.name}
      </Link>
      <div className="truncate text-xs text-muted-foreground">{app.clientId}</div>
    </div>
  );
}

function StatusCell({ app }: { app: App }) {
  return (
    <StatusLabel tone={app.isActive ? "success" : "default"}>
      {app.isActive ? "Aktif" : "Nonaktif"}
    </StatusLabel>
  );
}

export function AppsPage() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { modal, openModal, closeModal } = useModalParam(MODAL_MODES);
  // Component state only: dropped when the modal closes.
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    const next = search.trim();
    // Only a changed search resets the page: on mount (or a whitespace-only edit) this
    // would otherwise undo a page picked within the debounce window.
    if (next === q) return;
    const timer = setTimeout(() => {
      setQ(next);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, q]);

  const apps = useApps({ page, pageSize: PAGE_SIZE, ...(q ? { q } : {}) });
  const items = apps.data?.items ?? [];
  const total = apps.data?.total ?? 0;
  const create = useCreateApp(setSecret);

  const columns: TableColumn<App>[] = [
    { id: "name", header: "Aplikasi", cell: (a) => <NameCell app={a} /> },
    { id: "grants", header: "Grant", cell: (a) => grantsText(a) },
    { id: "status", header: "Status", cell: (a) => <StatusCell app={a} /> },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Aplikasi"
        subtitle="Kelola aplikasi OAuth, permission, dan rolenya."
        actions={[
          { label: "Tambah aplikasi", variant: "primary", onClick: () => openModal("create") },
        ]}
      />
      <div className="max-w-sm">
        <ListSearchInput value={search} onChange={setSearch} label="Cari aplikasi" />
      </div>

      {apps.isError && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(apps.error)}
        </p>
      )}

      {apps.isLoading ? (
        <div data-testid="apps-skeleton">
          {isMobile ? (
            <MobileCardList items={[]} isLoading keyOf={() => ""} renderCard={() => null} />
          ) : (
            <TableSkeleton rows={5} />
          )}
        </div>
      ) : items.length === 0 && !apps.isError ? (
        <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          {q ? "Tidak ada aplikasi yang cocok." : "Belum ada aplikasi"}
        </p>
      ) : isMobile ? (
        <MobileCardList
          items={items}
          keyOf={(a) => a.id}
          pagination={{ total, page, pageSize: PAGE_SIZE, onChange: setPage }}
          renderCard={(a) => (
            <MobileDataCard
              header={<CardSummary title={<NameCell app={a} />} />}
              collapsible
              rows={[
                { label: "Grant", value: grantsText(a) },
                { label: "Status", value: <StatusCell app={a} /> },
              ]}
            />
          )}
        />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          getRowId={(a) => a.id}
          pagination={{
            total,
            current: page,
            pageSize: PAGE_SIZE,
            onChange: (next) => setPage(next),
          }}
        />
      )}

      <AppFormModal
        open={modal?.mode === "create"}
        pending={create.isPending}
        onClose={() => closeModal()}
        onSubmit={(values) => create.mutate(toAppInput(values), { onSuccess: () => closeModal() })}
      />
      <OneTimeSecretModal
        open={secret !== null}
        title="Client secret"
        label="Client secret"
        secret={secret ?? ""}
        onClose={() => setSecret(null)}
      />
    </div>
  );
}
