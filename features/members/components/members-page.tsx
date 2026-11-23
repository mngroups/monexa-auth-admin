"use client";

import { useIsMobile } from "@mono/hooks";
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
  useAddExistingMember,
  useCreateMember,
  useMembers,
  useOrgRoles,
  useRemoveMember,
  useResetMemberPassword,
  useSetMemberActive,
  useSetMemberRoles,
} from "../hooks/use-members";
import type { Member } from "../schema";
import { AddExistingMemberModal } from "./add-existing-member-modal";
import { CreateMemberModal } from "./create-member-modal";
import { MemberRolesModal } from "./member-roles-modal";
import { type MemberAction, MemberRowActions, memberLabel } from "./member-row-actions";

const PAGE_SIZE = 10;

type Secret = { title: string; label: string; value: string };
type Confirm = { kind: "remove" | "deactivate"; member: Member };

function RoleBadges({ member }: { member: Member }) {
  if (member.roles.length === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {member.roles.map((role) => (
        <Badge key={role.id} variant="secondary">
          {role.name}
        </Badge>
      ))}
    </div>
  );
}

function StatusCell({ member }: { member: Member }) {
  return (
    <StatusLabel tone={member.isActive ? "success" : "default"}>
      {member.isActive ? "Aktif" : "Nonaktif"}
    </StatusLabel>
  );
}

function NameCell({ member, isSelf }: { member: Member; isSelf: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 font-medium">
        <span className="truncate">{memberLabel(member)}</span>
        {isSelf && <Badge variant="info">Anda</Badge>}
      </div>
      <div className="truncate text-xs text-muted-foreground">{member.email}</div>
    </div>
  );
}

export function MembersPage() {
  const isMobile = useIsMobile();
  const currentUserId = useCurrentUserId();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [existingOpen, setExistingOpen] = useState(false);
  const [rolesFor, setRolesFor] = useState<Member | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  // One-time secret: component state only, dropped on close.
  const [secret, setSecret] = useState<Secret | null>(null);

  // Debounce the search so typing doesn't fire one request per key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const members = useMembers({ page, pageSize: PAGE_SIZE, ...(q ? { q } : {}) });
  const orgRoles = useOrgRoles(rolesFor !== null);

  const create = useCreateMember((value) =>
    setSecret({ title: "Password sementara", label: "Password sementara", value })
  );
  const reset = useResetMemberPassword((value) =>
    setSecret({ title: "Password baru", label: "Password sementara", value })
  );
  const addExisting = useAddExistingMember();
  const remove = useRemoveMember();
  const setActive = useSetMemberActive();
  const setRoles = useSetMemberRoles();

  function onAction(action: MemberAction, member: Member) {
    if (action === "roles") setRolesFor(member);
    else if (action === "reset-password") reset.mutate(member.userId);
    else if (action === "activate") setActive.mutate({ userId: member.userId, active: true });
    else setConfirm({ kind: action, member });
  }

  function confirmAction() {
    if (!confirm) return;
    const { kind, member } = confirm;
    const done = { onSuccess: () => setConfirm(null) };
    if (kind === "remove") remove.mutate(member.userId, done);
    else setActive.mutate({ userId: member.userId, active: false }, done);
  }

  const items = members.data?.items ?? [];
  const total = members.data?.total ?? 0;
  const loading = members.isLoading;
  const confirmPending = remove.isPending || setActive.isPending;

  const columns: TableColumn<Member>[] = [
    {
      id: "name",
      header: "Nama / email",
      cell: (m) => <NameCell member={m} isSelf={m.userId === currentUserId} />,
    },
    { id: "roles", header: "Role", cell: (m) => <RoleBadges member={m} /> },
    { id: "status", header: "Status", cell: (m) => <StatusCell member={m} /> },
    {
      id: "actions",
      header: "",
      width: 56,
      horizontalAlign: "right",
      cell: (m) => <MemberRowActions member={m} onAction={onAction} />,
    },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Anggota"
        subtitle="Kelola anggota organisasi, role, dan statusnya."
        actions={[
          {
            label: "Tambah anggota lama",
            variant: "secondary",
            onClick: () => setExistingOpen(true),
          },
          { label: "Tambah anggota", variant: "primary", onClick: () => setCreateOpen(true) },
        ]}
      />
      <div className="max-w-sm">
        <ListSearchInput value={search} onChange={setSearch} label="Cari anggota" />
      </div>

      {members.isError && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(members.error)}
        </p>
      )}

      {loading ? (
        <div data-testid="members-skeleton">
          {isMobile ? (
            <MobileCardList items={[]} isLoading keyOf={() => ""} renderCard={() => null} />
          ) : (
            <TableSkeleton rows={5} />
          )}
        </div>
      ) : isMobile ? (
        <MobileCardList
          items={items}
          keyOf={(m) => m.userId}
          pagination={{ total, page, pageSize: PAGE_SIZE, onChange: setPage }}
          renderCard={(m) => (
            <MobileDataCard
              header={
                <CardSummary
                  title={memberLabel(m)}
                  subtitle={m.email}
                  badge={
                    m.userId === currentUserId ? <Badge variant="info">Anda</Badge> : undefined
                  }
                />
              }
              collapsible
              rows={[
                { label: "Role", value: <RoleBadges member={m} /> },
                { label: "Status", value: <StatusCell member={m} /> },
              ]}
              footer={<MemberRowActions member={m} onAction={onAction} />}
            />
          )}
        />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          getRowId={(m) => m.userId}
          pagination={{
            total,
            current: page,
            pageSize: PAGE_SIZE,
            onChange: (next) => setPage(next),
          }}
        />
      )}

      <CreateMemberModal
        open={createOpen}
        pending={create.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => create.mutate(values, { onSuccess: () => setCreateOpen(false) })}
      />
      <AddExistingMemberModal
        open={existingOpen}
        pending={addExisting.isPending}
        onClose={() => setExistingOpen(false)}
        onSubmit={(values) =>
          addExisting.mutate(values, { onSuccess: () => setExistingOpen(false) })
        }
      />
      <MemberRolesModal
        member={rolesFor}
        roles={orgRoles.data ?? []}
        loading={orgRoles.isLoading}
        pending={setRoles.isPending}
        onClose={() => setRolesFor(null)}
        onSave={(member, roleIds) =>
          setRoles.mutate(
            { userId: member.userId, roleIds },
            { onSuccess: () => setRolesFor(null) }
          )
        }
      />
      <ConfirmActionModal
        open={confirm !== null}
        title={confirm?.kind === "remove" ? "Keluarkan anggota" : "Nonaktifkan anggota"}
        description={
          confirm
            ? confirm.kind === "remove"
              ? `Keluarkan ${memberLabel(confirm.member)} dari organisasi ini?`
              : `Nonaktifkan ${memberLabel(confirm.member)}? Ia tidak bisa masuk sampai diaktifkan lagi.`
            : ""
        }
        confirmLabel={confirm?.kind === "remove" ? "Keluarkan" : "Nonaktifkan"}
        destructive
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
