"use client";

import {
  Checkbox,
  FloatingInput,
  FloatingTextarea,
  FormField,
  FormItem,
  FormMessage,
  Label,
} from "@mono/ui";
import type { UseFormReturn } from "react-hook-form";

import { type AppFormValues, GRANT_LABELS, GRANTS, TTL_LIMITS } from "../schema";

const fmt = (n: number) => n.toLocaleString("id-ID");

/** The fields shared by the create modal and the Pengaturan tab. */
export function AppFormFields({
  form,
  withClientId,
}: {
  form: UseFormReturn<AppFormValues>;
  withClientId: boolean;
}) {
  return (
    <div className="space-y-4">
      {withClientId && <FloatingInput control={form.control} name="clientId" label="Client ID" />}
      <FloatingInput control={form.control} name="name" label="Nama" />
      <FloatingTextarea
        control={form.control}
        name="redirectUris"
        label="Redirect URI (satu per baris)"
        rows={3}
      />
      <FloatingTextarea
        control={form.control}
        name="postLogoutRedirectUris"
        label="Post-logout redirect URI (satu per baris)"
        rows={3}
      />
      <FormField
        control={form.control}
        name="allowedGrants"
        render={({ field }) => (
          <FormItem>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Grant yang diizinkan</legend>
              {GRANTS.map((grant) => {
                const checked = field.value.includes(grant);
                return (
                  <div key={grant} className="flex items-center gap-2">
                    <Checkbox
                      id={`grant-${grant}`}
                      checked={checked}
                      onCheckedChange={(next) =>
                        field.onChange(
                          next ? [...field.value, grant] : field.value.filter((g) => g !== grant)
                        )
                      }
                    />
                    <Label htmlFor={`grant-${grant}`} className="font-normal">
                      {GRANT_LABELS[grant]}
                    </Label>
                  </div>
                );
              })}
            </fieldset>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingInput
          control={form.control}
          name="accessTtlSeconds"
          label="Masa berlaku access token (detik)"
          inputMode="numeric"
        />
        <FloatingInput
          control={form.control}
          name="refreshTtlSeconds"
          label="Masa berlaku refresh token (detik)"
          inputMode="numeric"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Access token: {fmt(TTL_LIMITS.access.min)}–{fmt(TTL_LIMITS.access.max)} detik (bawaan{" "}
        {fmt(TTL_LIMITS.access.default)}). Refresh token: {fmt(TTL_LIMITS.refresh.min)}–
        {fmt(TTL_LIMITS.refresh.max)} detik (bawaan {fmt(TTL_LIMITS.refresh.default)}).
      </p>
    </div>
  );
}
