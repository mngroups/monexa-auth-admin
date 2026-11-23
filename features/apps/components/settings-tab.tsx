"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form } from "@mono/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useUpdateApp } from "../hooks/use-apps";
import {
  type App,
  type AppFormValues,
  appFormSchema,
  appToFormValues,
  toAppUpdateInput,
} from "../schema";
import { AppFormFields } from "./app-form-fields";

/** Edits everything but the client id, which is fixed at creation. */
export function SettingsTab({ app }: { app: App }) {
  const update = useUpdateApp(app.id);
  const form = useForm<AppFormValues>({
    resolver: zodResolver(appFormSchema),
    mode: "onChange",
    defaultValues: appToFormValues(app),
  });
  const { isValid, isDirty } = form.formState;

  // Re-sync after a save refetches the app.
  useEffect(() => {
    form.reset(appToFormValues(app));
  }, [app, form]);

  const submit = form.handleSubmit((values) => update.mutate(toAppUpdateInput(values)));

  return (
    <Form {...form}>
      <form onSubmit={submit} className="max-w-2xl space-y-4">
        <AppFormFields form={form} withClientId={false} />
        <div className="flex justify-end">
          <Button type="submit" disabled={!(isValid && isDirty) || update.isPending}>
            Simpan
          </Button>
        </div>
      </form>
    </Form>
  );
}
