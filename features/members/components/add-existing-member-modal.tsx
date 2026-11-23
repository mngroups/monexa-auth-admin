"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DynamicModal, FloatingInput, Form } from "@mono/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { type ExistingMemberValues, existingMemberSchema } from "../schema";

export function AddExistingMemberModal({
  open,
  pending,
  onSubmit,
  onClose,
}: {
  open: boolean;
  pending: boolean;
  onSubmit: (values: ExistingMemberValues) => void;
  onClose: () => void;
}) {
  const form = useForm<ExistingMemberValues>({
    resolver: zodResolver(existingMemberSchema),
    mode: "onChange",
    defaultValues: { email: "" },
  });
  const { isValid, isDirty } = form.formState;

  useEffect(() => {
    if (open) form.reset({ email: "" });
  }, [open, form]);

  return (
    <DynamicModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Tambah anggota lama"
      description="Masukkan email pengguna yang sudah punya akun."
      confirmLabel="Tambah"
      onConfirm={form.handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmDisabled={!(isValid && isDirty) || pending}
      loading={pending}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FloatingInput control={form.control} name="email" label="Email" type="email" />
        </form>
      </Form>
    </DynamicModal>
  );
}
