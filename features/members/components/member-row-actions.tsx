"use client";

import { usePermissions } from "@mono/auth/react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@mono/ui";
import { MoreHorizontal } from "lucide-react";

import { useCurrentUserId } from "@/features/admin-shared/hooks/use-current-user";

import { ADMIN_PERMISSIONS } from "@/lib/permissions/admin";

import type { Member } from "../schema";

export type MemberAction = "roles" | "reset-password" | "deactivate" | "activate" | "remove";

export function memberLabel(member: Member): string {
  return member.name || member.email;
}

/** Row actions. The signed-in user's own row gets no menu at all (the BE refuses them too). */
export function MemberRowActions({
  member,
  onAction,
}: {
  member: Member;
  onAction: (action: MemberAction, member: Member) => void;
}) {
  const currentUserId = useCurrentUserId();
  const { has } = usePermissions();
  // The BE answers 403 without org.role:assign; isGranted does not let platform:all cover org.*.
  const canAssignRole = has(ADMIN_PERMISSIONS.roleAssign, ADMIN_PERMISSIONS.platformAll);
  if (member.userId === currentUserId) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Aksi untuk ${memberLabel(member)}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canAssignRole && (
          <DropdownMenuItem onSelect={() => onAction("roles", member)}>Atur role</DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onAction("reset-password", member)}>
          Reset password
        </DropdownMenuItem>
        {member.isActive ? (
          <DropdownMenuItem onSelect={() => onAction("deactivate", member)}>
            Nonaktifkan
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onAction("activate", member)}>
            Aktifkan
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onAction("remove", member)}>
          Keluarkan dari org
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
