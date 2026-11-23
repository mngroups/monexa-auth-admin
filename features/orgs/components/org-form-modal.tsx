"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DynamicModal, FloatingInput, Form } from "@mono/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { type OrgFormValues, orgFormSchema } from "../schema";

const EMPTY: OrgFormValues = { name: "", slug: "" };

/** Creates an organization. A duplicate slug is refused by the BE; its message is toasted. */
export function OrgFormModal({
  open,
  pending,
  onSubmit,
  onClose,
}: {
  open: boolean;
  pending: boolean;
  onSubmit: (values: OrgFormValues) => void;
  onClose: () => void;
}) {
  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
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
      title="Tambah organisasi"
      description="Slug dipakai di URL login organisasi dan tidak boleh sama dengan organisasi lain."
      confirmLabel="Simpan"
      onConfirm={form.handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmDisabled={!(isValid && isDirty) || pending}
      loading={pending}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FloatingInput control={form.control} name="name" label="Nama" />
          <FloatingInput control={form.control} name="slug" label="Slug" />
        </form>
      </Form>
    </DynamicModal>
  );
}
