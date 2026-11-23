import "server-only";

import { randomBytes } from "node:crypto";

/**
 * A 16-char URL-safe temporary password, generated server-side so the admin
 * never types one. Deliberately not a `"use server"` module: it must not be a
 * browser-callable action.
 */
export function generateTemporaryPassword(): string {
  return randomBytes(12).toString("base64url");
}
