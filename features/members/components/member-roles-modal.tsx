"use client";

import { DynamicModal, FloatingMultiSelect, Form } from "@mono/ui";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import type { Member, MemberRolesValues, OrgRole } from "../schema";
import { memberLabel } from "./member-row-actions";

export function MemberRolesModal({
  member,
  roles,
  loading,
  pending,
  onSave,
  onClose,
}: {
  /** The member being edited; the modal is open while this is set. */
  member: Member | null;
  roles: OrgRole[];
  loading: boolean;
  pending: boolean;
  onSave: (member: Member, roleIds: string[]) => void;
  onClose: () => void;
}) {
  const form = useForm<MemberRolesValues>({ defaultValues: { roleIds: [] } });

  useEffect(() => {
    if (member) form.reset({ roleIds: member.roles.map((r) => r.id) });
  }, [member, form]);

  // Grouped by app: sorted by app name, the app named in each option.
  const options = useMemo(
    () =>
      [...roles]
        .sort((a, b) => a.appName.localeCompare(b.appName) || a.name.localeCompare(b.name))
        .map((r) => ({ value: r.id, label: `${r.appName} · ${r.name}` })),
    [roles]
  );

  return (
    <DynamicModal
      open={member !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={member ? `Atur role ${memberLabel(member)}` : "Atur role"}
      confirmLabel="Simpan"
      onConfirm={form.handleSubmit((values) => member && onSave(member, values.roleIds))}
      confirmDisabled={pending}
      loading={pending}
    >
      <Form {...form}>
        <FloatingMultiSelect
          control={form.control}
          name="roleIds"
          label="Role"
          noun="Role"
          options={options}
          loading={loading}
          searchPlaceholder="Cari role"
        />
      </Form>
    </DynamicModal>
  );
}
