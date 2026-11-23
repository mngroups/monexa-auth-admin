"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DynamicModal, Form } from "@mono/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { type AppFormValues, appFormSchema, EMPTY_APP_FORM } from "../schema";
import { AppFormFields } from "./app-form-fields";

/** Registers an app. Its client secret is shown once after the BE creates it. */
export function AppFormModal({
  open,
  pending,
  onSubmit,
  onClose,
}: {
  open: boolean;
  pending: boolean;
  onSubmit: (values: AppFormValues) => void;
  onClose: () => void;
}) {
  const form = useForm<AppFormValues>({
    resolver: zodResolver(appFormSchema),
    mode: "onChange",
    defaultValues: EMPTY_APP_FORM,
  });
  const { isValid, isDirty } = form.formState;

  useEffect(() => {
    if (open) form.reset(EMPTY_APP_FORM);
  }, [open, form]);

  return (
    <DynamicModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Tambah aplikasi"
      description="Client ID tidak bisa diubah setelah dibuat. Client secret ditampilkan sekali."
      confirmLabel="Simpan"
      onConfirm={form.handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmDisabled={!(isValid && isDirty) || pending}
      loading={pending}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AppFormFields form={form} withClientId />
        </form>
      </Form>
    </DynamicModal>
  );
}
