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
import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmActionModal } from "@/features/admin-shared/components/confirm-action-modal";

import { useCreateOrg, useOrgs, useSetOrgActive } from "../hooks/use-orgs";
import type { OrgListItem } from "../schema";
import { OrgDetailModal } from "./org-detail-modal";
import { OrgFormModal } from "./org-form-modal";
import { type OrgAction, OrgRowActions } from "./org-row-actions";

const PAGE_SIZE = 10;
const MODAL_MODES = ["create", "detail"] as const;

function Thumb({ org }: { org: OrgListItem }) {
  if (org.logoUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: cross-origin portal URLs can't go through next/image
      <img
        src={org.logoUrl}
        alt={`Logo ${org.name}`}
        className="size-8 shrink-0 rounded-md border bg-background object-contain"
      />
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
      <Building2 className="size-4" aria-hidden="true" />
    </span>
  );
}

function NameCell({ org }: { org: OrgListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Thumb org={org} />
      <div className="min-w-0">
        <div className="truncate font-medium">{org.name}</div>
        <div className="truncate text-xs text-muted-foreground">{org.slug}</div>
      </div>
    </div>
  );
}

function StatusCell({ org }: { org: OrgListItem }) {
  return (
    <StatusLabel tone={org.isActive ? "success" : "default"}>
      {org.isActive ? "Aktif" : "Nonaktif"}
    </StatusLabel>
  );
}

export function OrgsPage() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { modal, openModal, closeModal } = useModalParam(MODAL_MODES);
  const [deactivating, setDeactivating] = useState<OrgListItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const orgs = useOrgs({ page, pageSize: PAGE_SIZE, ...(q ? { q } : {}) });
  const items = orgs.data?.items ?? [];
  const detail =
    modal?.mode === "detail" ? (items.find((o) => o.id === modal.target) ?? null) : null;

  const create = useCreateOrg();
  const setActive = useSetOrgActive();

  function onAction(action: OrgAction, org: OrgListItem) {
    if (action === "detail") openModal("detail", org.id);
    else if (action === "activate") setActive.mutate({ id: org.id, active: true });
    else setDeactivating(org);
  }

  const total = orgs.data?.total ?? 0;

  const columns: TableColumn<OrgListItem>[] = [
    { id: "name", header: "Organisasi", cell: (o) => <NameCell org={o} /> },
    { id: "status", header: "Status", cell: (o) => <StatusCell org={o} /> },
    {
      id: "actions",
      header: "",
      width: 56,
      horizontalAlign: "right",
      cell: (o) => <OrgRowActions org={o} onAction={onAction} />,
    },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Organisasi"
        subtitle="Kelola organisasi, aplikasi yang boleh dipakai, dan logonya."
        actions={[
          { label: "Tambah organisasi", variant: "primary", onClick: () => openModal("create") },
        ]}
      />
      <div className="max-w-sm">
        <ListSearchInput value={search} onChange={setSearch} label="Cari organisasi" />
      </div>

      {orgs.isError && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(orgs.error)}
        </p>
      )}

      {orgs.isLoading ? (
        <div data-testid="orgs-skeleton">
          {isMobile ? (
            <MobileCardList items={[]} isLoading keyOf={() => ""} renderCard={() => null} />
          ) : (
            <TableSkeleton rows={5} />
          )}
        </div>
      ) : isMobile ? (
        <MobileCardList
          items={items}
          keyOf={(o) => o.id}
          pagination={{ total, page, pageSize: PAGE_SIZE, onChange: setPage }}
          renderCard={(o) => (
            <MobileDataCard
              header={<CardSummary title={o.name} subtitle={o.slug} badge={<Thumb org={o} />} />}
              collapsible
              rows={[{ label: "Status", value: <StatusCell org={o} /> }]}
              footer={<OrgRowActions org={o} onAction={onAction} />}
            />
          )}
        />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          getRowId={(o) => o.id}
          pagination={{
            total,
            current: page,
            pageSize: PAGE_SIZE,
            onChange: (next) => setPage(next),
          }}
        />
      )}

      <OrgFormModal
        open={modal?.mode === "create"}
        pending={create.isPending}
        onClose={() => closeModal()}
        onSubmit={(values) => create.mutate(values, { onSuccess: () => closeModal() })}
      />
      <OrgDetailModal org={detail} onClose={() => closeModal()} />
      <ConfirmActionModal
        open={deactivating !== null}
        title="Nonaktifkan organisasi"
        description={
          deactivating
            ? `Nonaktifkan ${deactivating.name}? Anggotanya tidak bisa masuk sampai diaktifkan lagi.`
            : ""
        }
        confirmLabel="Nonaktifkan"
        destructive
        pending={setActive.isPending}
        onConfirm={() => {
          if (deactivating) {
            setActive.mutate(
              { id: deactivating.id, active: false },
              { onSuccess: () => setDeactivating(null) }
            );
          }
        }}
        onClose={() => setDeactivating(null)}
      />
    </div>
  );
}
