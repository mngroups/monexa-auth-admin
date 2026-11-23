"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DynamicModal, FloatingInput, Form } from "@mono/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { type AppRole, type RoleFormValues, roleFormSchema } from "../schema";

const EMPTY: RoleFormValues = { name: "", description: "" };

/** Creates a role, or renames/re-describes `role` when given. */
export function RoleFormModal({
  open,
  role,
  pending,
  onSubmit,
  onClose,
}: {
  open: boolean;
  role: AppRole | null;
  pending: boolean;
  onSubmit: (values: RoleFormValues) => void;
  onClose: () => void;
}) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    mode: "onChange",
    defaultValues: EMPTY,
  });
  const { isValid, isDirty } = form.formState;

  useEffect(() => {
    if (open) form.reset(role ? { name: role.name, description: role.description ?? "" } : EMPTY);
  }, [open, role, form]);

  return (
    <DynamicModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={role ? "Ubah role" : "Tambah role"}
      description="Permission role diatur dari kartu role setelah dibuat."
      confirmLabel="Simpan"
      onConfirm={form.handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmDisabled={!(isValid && isDirty) || pending}
      loading={pending}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FloatingInput control={form.control} name="name" label="Nama" />
          <FloatingInput control={form.control} name="description" label="Deskripsi (opsional)" />
        </form>
      </Form>
    </DynamicModal>
  );
}
