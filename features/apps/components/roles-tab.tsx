"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useModalParam } from "@mono/hooks/next";
import { Button, FloatingMultiSelect, Form, Skeleton } from "@mono/ui";
import { getErrorMessage } from "@mono/utils";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ConfirmActionModal } from "@/features/admin-shared/components/confirm-action-modal";

import {
  useAppPermissions,
  useAppRoles,
  useCreateRole,
  useDeleteRole,
  useSetRolePermissions,
  useUpdateRole,
} from "../hooks/use-apps";
import type { AppRole } from "../schema";
import { RoleFormModal } from "./role-form-modal";

const MODAL_MODES = ["create-role", "edit-role"] as const;
const FIELD = "permissions";
const permissionsFormSchema = z.object({ [FIELD]: z.array(z.string()) });
type PermissionsForm = { [FIELD]: string[] };

function RoleCard({
  role,
  options,
  saving,
  onSave,
  onEdit,
  onDelete,
}: {
  role: AppRole;
  options: { label: string; value: string }[];
  saving: boolean;
  onSave: (permissions: string[]) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const form = useForm<PermissionsForm>({
    resolver: zodResolver(permissionsFormSchema),
    defaultValues: { [FIELD]: role.permissions },
  });

  useEffect(() => {
    form.reset({ [FIELD]: role.permissions });
  }, [role.permissions, form]);

  return (
    <section aria-label={`Role ${role.name}`} className="space-y-4 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{role.name}</h3>
          {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Ubah role ${role.name}`}
            onClick={onEdit}
          >
            Ubah
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Hapus role ${role.name}`}
            onClick={onDelete}
          >
            Hapus
          </Button>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => onSave(values[FIELD]))} className="space-y-3">
          <FloatingMultiSelect
            control={form.control}
            name={FIELD}
            label="Permission"
            noun="permission"
            options={options}
            searchPlaceholder="Cari permission"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!form.formState.isDirty || saving}>
              Simpan permission
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}

export function RolesTab({ appId }: { appId: string }) {
  const roles = useAppRoles(appId);
  const catalog = useAppPermissions(appId);
  const create = useCreateRole(appId);
  const update = useUpdateRole(appId);
  const remove = useDeleteRole(appId);
  const setPermissions = useSetRolePermissions(appId);
  const { modal, openModal, closeModal } = useModalParam(MODAL_MODES);
  const [deleting, setDeleting] = useState<AppRole | null>(null);

  const items = roles.data ?? [];
  const options = (catalog.data ?? []).map((p) => ({ label: p.permission, value: p.permission }));
  const editing =
    modal?.mode === "edit-role" ? (items.find((r) => r.id === modal.target) ?? null) : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => openModal("create-role")}>
          Tambah role
        </Button>
      </div>

      {roles.isLoading ? (
        <div className="space-y-3" data-testid="roles-skeleton">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : roles.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(roles.error)}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          Belum ada role
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              options={options}
              saving={setPermissions.isPending}
              onSave={(permissions) => setPermissions.mutate({ roleId: role.id, permissions })}
              onEdit={() => openModal("edit-role", role.id)}
              onDelete={() => setDeleting(role)}
            />
          ))}
        </div>
      )}

      <RoleFormModal
        open={modal?.mode === "create-role" || editing !== null}
        role={editing}
        pending={create.isPending || update.isPending}
        onClose={() => closeModal()}
        onSubmit={(values) => {
          const description = values.description || undefined;
          if (editing) {
            update.mutate(
              { roleId: editing.id, name: values.name, description: values.description },
              { onSuccess: () => closeModal() }
            );
          } else {
            create.mutate({ name: values.name, description }, { onSuccess: () => closeModal() });
          }
        }}
      />
      <ConfirmActionModal
        open={deleting !== null}
        title="Hapus role"
        description={deleting ? `Hapus role ${deleting.name}? Pengguna kehilangan role ini.` : ""}
        confirmLabel="Hapus"
        destructive
        pending={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onSettled: () => setDeleting(null) });
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
