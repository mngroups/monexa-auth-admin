"use client";

import { useIsMobile } from "@mono/hooks";
import { useModalParam } from "@mono/hooks/next";
import type { TableColumn } from "@mono/ui";
import {
  Badge,
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
import { useEffect, useState } from "react";

import { ConfirmActionModal } from "@/features/admin-shared/components/confirm-action-modal";
import { OneTimeSecretModal } from "@/features/admin-shared/components/one-time-secret-modal";
import { useCurrentUserId } from "@/features/admin-shared/hooks/use-current-user";

import {
  useCreateUser,
  useResetUserPassword,
  useSetPlatformAdmin,
  useSetUserActive,
  useUsers,
} from "../hooks/use-users";
import type { User } from "../schema";
import { CreateUserModal } from "./create-user-modal";
import { type UserAction, UserRowActions, userLabel } from "./user-row-actions";

const PAGE_SIZE = 10;
const MODAL_MODES = ["create"] as const;

type Secret = { title: string; label: string; value: string };
type Confirm = {
  kind: "deactivate" | "grant-admin" | "revoke-admin" | "reset-password";
  user: User;
};

const CONFIRM_COPY = {
  deactivate: {
    title: "Nonaktifkan pengguna?",
    confirmLabel: "Nonaktifkan",
    destructive: true,
    describe: (name: string) => `Nonaktifkan ${name}? Ia tidak bisa masuk sampai diaktifkan lagi.`,
  },
  "grant-admin": {
    title: "Jadikan platform admin?",
    confirmLabel: "Jadikan admin",
    destructive: false,
    describe: (name: string) =>
      `${name} akan mendapat akses penuh ke seluruh platform, termasuk semua organisasi.`,
  },
  "reset-password": {
    title: "Reset password?",
    confirmLabel: "Reset",
    destructive: true,
    describe: (name: string) => `Reset password ${name}? Password lama tidak berlaku lagi.`,
  },
  "revoke-admin": {
    title: "Cabut platform admin?",
    confirmLabel: "Cabut",
    destructive: true,
    describe: (name: string) => `${name} akan kehilangan akses platform admin.`,
  },
} as const;

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : dateFormat.format(date);
};

function RoleCell({ user }: { user: User }) {
  if (!user.isPlatformAdmin) return <span className="text-muted-foreground">-</span>;
  return <Badge variant="secondary">Platform admin</Badge>;
}

function StatusCell({ user }: { user: User }) {
  return (
    <StatusLabel tone={user.isActive ? "success" : "default"}>
      {user.isActive ? "Aktif" : "Nonaktif"}
    </StatusLabel>
  );
}

function NameCell({ user, isSelf }: { user: User; isSelf: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 font-medium">
        <span className="truncate">{userLabel(user)}</span>
        {isSelf && <Badge variant="info">Anda</Badge>}
      </div>
      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
    </div>
  );
}

export function UsersPage() {
  const isMobile = useIsMobile();
  const currentUserId = useCurrentUserId();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  // The create form lives in the URL (?modal=create); the confirmation and
  // the one-time secret stay in component state.
  const { modal, openModal, closeModal } = useModalParam(MODAL_MODES);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  // One-time secret: component state only, dropped on close.
  const [secret, setSecret] = useState<Secret | null>(null);

  // Debounce the search so typing doesn't fire one request per key.
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

  const users = useUsers({ page, pageSize: PAGE_SIZE, ...(q ? { q } : {}) });
  const items = users.data?.items ?? [];

  const create = useCreateUser((value) =>
    setSecret({ title: "Password sementara", label: "Password sementara", value })
  );
  const reset = useResetUserPassword((value) =>
    setSecret({ title: "Password baru", label: "Password sementara", value })
  );
  const setActive = useSetUserActive();
  const setAdmin = useSetPlatformAdmin();

  function onAction(action: UserAction, user: User) {
    if (action === "activate") setActive.mutate({ id: user.id, active: true });
    else setConfirm({ kind: action, user });
  }

  function confirmAction() {
    if (!confirm) return;
    const { kind, user } = confirm;
    const done = { onSuccess: () => setConfirm(null) };
    if (kind === "deactivate") setActive.mutate({ id: user.id, active: false }, done);
    else if (kind === "reset-password") reset.mutate(user.id, done);
    else setAdmin.mutate({ id: user.id, on: kind === "grant-admin" }, done);
  }

  const total = users.data?.total ?? 0;
  const confirmPending = setActive.isPending || setAdmin.isPending || reset.isPending;
  const copy = confirm ? CONFIRM_COPY[confirm.kind] : null;

  const columns: TableColumn<User>[] = [
    {
      id: "name",
      header: "Nama / email",
      cell: (u) => <NameCell user={u} isSelf={u.id === currentUserId} />,
    },
    { id: "role", header: "Peran platform", cell: (u) => <RoleCell user={u} /> },
    { id: "status", header: "Status", cell: (u) => <StatusCell user={u} /> },
    { id: "createdAt", header: "Dibuat", cell: (u) => formatDate(u.createdAt) },
    {
      id: "actions",
      header: "",
      width: 56,
      horizontalAlign: "right",
      cell: (u) => <UserRowActions user={u} onAction={onAction} />,
    },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Pengguna"
        subtitle="Kelola semua akun pengguna dan platform admin."
        actions={[
          { label: "Tambah pengguna", variant: "primary", onClick: () => openModal("create") },
        ]}
      />
      <div className="max-w-sm">
        <ListSearchInput value={search} onChange={setSearch} label="Cari pengguna" />
      </div>

      {users.isError && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(users.error)}
        </p>
      )}

      {users.isLoading ? (
        <div data-testid="users-skeleton">
          {isMobile ? (
            <MobileCardList items={[]} isLoading keyOf={() => ""} renderCard={() => null} />
          ) : (
            <TableSkeleton rows={5} />
          )}
        </div>
      ) : items.length === 0 && !users.isError ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Belum ada pengguna.</p>
      ) : isMobile ? (
        <MobileCardList
          items={items}
          keyOf={(u) => u.id}
          pagination={{ total, page, pageSize: PAGE_SIZE, onChange: setPage }}
          renderCard={(u) => (
            <MobileDataCard
              header={
                <CardSummary
                  title={userLabel(u)}
                  subtitle={u.email}
                  badge={u.id === currentUserId ? <Badge variant="info">Anda</Badge> : undefined}
                />
              }
              collapsible
              rows={[
                { label: "Peran platform", value: <RoleCell user={u} /> },
                { label: "Status", value: <StatusCell user={u} /> },
                { label: "Dibuat", value: formatDate(u.createdAt) },
              ]}
              footer={<UserRowActions user={u} onAction={onAction} />}
            />
          )}
        />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          getRowId={(u) => u.id}
          pagination={{
            total,
            current: page,
            pageSize: PAGE_SIZE,
            onChange: (next) => setPage(next),
          }}
        />
      )}

      <CreateUserModal
        open={modal?.mode === "create"}
        pending={create.isPending}
        onClose={() => closeModal()}
        onSubmit={(values) => create.mutate(values, { onSuccess: () => closeModal() })}
      />
      <ConfirmActionModal
        open={confirm !== null}
        title={copy?.title ?? ""}
        description={confirm && copy ? copy.describe(userLabel(confirm.user)) : ""}
        confirmLabel={copy?.confirmLabel ?? ""}
        destructive={copy?.destructive ?? false}
        pending={confirmPending}
        onConfirm={confirmAction}
        onClose={() => setConfirm(null)}
      />
      <OneTimeSecretModal
        open={secret !== null}
        title={secret?.title ?? ""}
        label={secret?.label ?? ""}
        secret={secret?.value ?? ""}
        onClose={() => setSecret(null)}
      />
    </div>
  );
}
