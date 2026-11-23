"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mono/ui";
import { MoreHorizontal } from "lucide-react";

import type { OrgListItem } from "../schema";

export type OrgAction = "detail" | "activate" | "deactivate";

export function OrgRowActions({
  org,
  onAction,
}: {
  org: OrgListItem;
  onAction: (action: OrgAction, org: OrgListItem) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Aksi untuk ${org.name}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onAction("detail", org)}>Detail</DropdownMenuItem>
        {org.isActive ? (
          <DropdownMenuItem onSelect={() => onAction("deactivate", org)}>
            Nonaktifkan
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onAction("activate", org)}>Aktifkan</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
