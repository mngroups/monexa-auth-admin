"use client";

import { createContext, createElement, type ReactNode, useContext } from "react";

const ActiveOrgContext = createContext<string | null>(null);

/** Fed by the protected layout with the active org's id, for org-scoped query keys. */
export function ActiveOrgProvider({
  orgId,
  children,
}: {
  orgId: string | null;
  children: ReactNode;
}) {
  return createElement(ActiveOrgContext.Provider, { value: orgId }, children);
}

/** The active org id; part of every org-scoped React Query key. */
export function useActiveOrgId(): string | null {
  return useContext(ActiveOrgContext);
}
