import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { CurrentUserProvider, useCurrentUserId } from "../use-current-user";

describe("useCurrentUserId", () => {
  it("returns the provided user id", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CurrentUserProvider userId="u1">{children}</CurrentUserProvider>
    );
    expect(renderHook(() => useCurrentUserId(), { wrapper }).result.current).toBe("u1");
  });

  it("is null without a provider or when the id is unknown", () => {
    expect(renderHook(() => useCurrentUserId()).result.current).toBeNull();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CurrentUserProvider userId={null}>{children}</CurrentUserProvider>
    );
    expect(renderHook(() => useCurrentUserId(), { wrapper }).result.current).toBeNull();
  });
});
