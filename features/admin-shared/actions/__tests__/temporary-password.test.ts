import { describe, expect, it } from "vitest";

import { generateTemporaryPassword } from "../temporary-password";

describe("generateTemporaryPassword", () => {
  it("returns 16 URL-safe characters", () => {
    expect(generateTemporaryPassword()).toMatch(/^[A-Za-z0-9_-]{16}$/);
  });

  it("differs between calls", () => {
    expect(generateTemporaryPassword()).not.toBe(generateTemporaryPassword());
  });
});
