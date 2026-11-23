"use client";

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

import type { User } from "../schema";

export type UserAction =
  | "reset-password"
  | "deactivate"
  | "activate"
  | "grant-admin"
  | "revoke-admin";

export function userLabel(user: User): string {
  return user.name || user.email;
}

/** Row actions. The signed-in user's own row gets no menu at all (the BE refuses them too). */
export function UserRowActions({
  user,
  onAction,
}: {
  user: User;
  onAction: (action: UserAction, user: User) => void;
}) {
  const currentUserId = useCurrentUserId();
  if (user.id === currentUserId) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Aksi untuk ${userLabel(user)}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.isPlatformAdmin ? (
          <DropdownMenuItem onSelect={() => onAction("revoke-admin", user)}>
            Cabut platform admin
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onAction("grant-admin", user)}>
            Jadikan platform admin
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onAction("reset-password", user)}>
          Reset password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.isActive ? (
          <DropdownMenuItem variant="destructive" onSelect={() => onAction("deactivate", user)}>
            Nonaktifkan
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onAction("activate", user)}>Aktifkan</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
