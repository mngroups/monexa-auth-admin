import { z } from "zod";

import { pageOf } from "@/features/admin-shared/schema";

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  isActive: z.boolean(),
  isPlatformAdmin: z.boolean(),
  mustChangePassword: z.boolean().optional(),
  createdAt: z.string(),
});

export const usersPageSchema = pageOf(userSchema);

export type User = z.infer<typeof userSchema>;
export type UsersPage = z.infer<typeof usersPageSchema>;

export const createUserSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Email tidak valid"),
  username: z.string(),
  name: z.string().min(1, "Nama wajib diisi"),
});
export type CreateUserValues = z.infer<typeof createUserSchema>;
