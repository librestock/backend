import { z } from 'zod/v4'

export const TenantSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)

export const CreateSuperAdminTenantSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: TenantSlugSchema,
  admin: z.object({
    email: z.string().trim().email().max(320),
    name: z.string().trim().min(1).max(200),
    password: z.string().min(8).max(256),
  }),
})

export type CreateSuperAdminTenantInput = z.infer<
  typeof CreateSuperAdminTenantSchema
>
