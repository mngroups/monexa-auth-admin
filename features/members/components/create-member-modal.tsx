"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DynamicModal, FloatingInput, Form } from "@mono/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { type CreateMemberValues, createMemberSchema } from "../schema";

const EMPTY: CreateMemberValues = { email: "", username: "", name: "" };

/** The temporary password is generated server-side; the admin never types one. */
export function CreateMemberModal({
  open,
  pending,
  onSubmit,
  onClose,
}: {
  open: boolean;
  pending: boolean;
  onSubmit: (values: CreateMemberValues) => void;
  onClose: () => void;
}) {
  const form = useForm<CreateMemberValues>({
    resolver: zodResolver(createMemberSchema),
    mode: "onChange",
    defaultValues: EMPTY,
  });
  const { isValid, isDirty } = form.formState;

  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [open, form]);

  return (
    <DynamicModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Tambah anggota"
      description="Akun baru dibuat dengan password sementara yang ditampilkan sekali."
      confirmLabel="Simpan"
      onConfirm={form.handleSubmit(onSubmit)}
      confirmDisabled={!(isValid && isDirty) || pending}
      loading={pending}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FloatingInput control={form.control} name="email" label="Email" type="email" />
          <FloatingInput control={form.control} name="name" label="Nama" />
          <FloatingInput control={form.control} name="username" label="Username (opsional)" />
        </form>
      </Form>
    </DynamicModal>
  );
}
