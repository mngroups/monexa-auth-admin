"use client";

import { createContext, createElement, type ReactNode, useContext } from "react";

const CurrentUserContext = createContext<string | null>(null);

/** Fed by the protected layout with `user_id` from `/v1/auth/check`. */
export function CurrentUserProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  return createElement(CurrentUserContext.Provider, { value: userId }, children);
}

/** The signed-in user's id, for self-protection (hide actions on your own row). */
export function useCurrentUserId(): string | null {
  return useContext(CurrentUserContext);
}
