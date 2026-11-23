"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FloatingInput, Form, Skeleton } from "@mono/ui";
import { getErrorMessage } from "@mono/utils";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ConfirmActionModal } from "@/features/admin-shared/components/confirm-action-modal";

import { useAddPermission, useAppPermissions, useRemovePermission } from "../hooks/use-apps";
import { type PermissionFormValues, permissionFormSchema } from "../schema";

const EMPTY: PermissionFormValues = { permission: "", description: "" };

/** The app's permission catalog; roles pick their permissions from it. */
export function PermissionsTab({ appId }: { appId: string }) {
  const permissions = useAppPermissions(appId);
  const add = useAddPermission(appId);
  const remove = useRemovePermission(appId);
  const [removing, setRemoving] = useState<string | null>(null);
  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    mode: "onChange",
    defaultValues: EMPTY,
  });
  const { isValid, isDirty } = form.formState;

  const submit = form.handleSubmit((values) =>
    add.mutate(
      {
        permission: values.permission,
        ...(values.description ? { description: values.description } : {}),
      },
      { onSuccess: () => form.reset(EMPTY) }
    )
  );

  const items = permissions.data ?? [];

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-start">
          <FloatingInput control={form.control} name="permission" label="Permission baru" />
          <FloatingInput control={form.control} name="description" label="Deskripsi (opsional)" />
          <Button type="submit" className="h-12" disabled={!(isValid && isDirty) || add.isPending}>
            Tambah permission
          </Button>
        </form>
      </Form>

      {permissions.isLoading ? (
        <div className="space-y-3" data-testid="permissions-skeleton">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : permissions.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(permissions.error)}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          Belum ada permission
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((p) => (
            <li key={p.permission} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="truncate font-mono text-sm">{p.permission}</div>
                {p.description && (
                  <div className="truncate text-xs text-muted-foreground">{p.description}</div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Hapus permission ${p.permission}`}
                onClick={() => setRemoving(p.permission)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmActionModal
        open={removing !== null}
        title="Hapus permission"
        description={`Hapus ${removing ?? ""}? Permission juga dihapus dari semua role.`}
        confirmLabel="Hapus"
        destructive
        pending={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing, { onSettled: () => setRemoving(null) });
        }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
