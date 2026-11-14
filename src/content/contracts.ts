import { z } from 'zod';
import { contentSchema } from './schema';

export const publicContentResponseSchema = z.object({
  content: contentSchema,
  revision: z.number().int().nonnegative(),
  updatedAt: z.string(),
}).strict();
export type PublicContentResponse = z.infer<typeof publicContentResponseSchema>;

export const sessionInfoSchema = z.object({
  authenticated: z.boolean(),
  csrfToken: z.string().optional(),
  expiresAt: z.string().optional(),
  environment: z.enum(['local', 'production']).optional(),
}).strict();
export type SessionInfo = z.infer<typeof sessionInfoSchema>;

export const saveContentRequestSchema = z.object({
  content: contentSchema,
  expectedRevision: z.number().int().nonnegative(),
  label: z.string().trim().min(1).max(200),
}).strict();
export const revisionRequestSchema = z.object({ expectedRevision: z.number().int().nonnegative() }).strict();
export const loginRequestSchema = z.object({ password: z.string().min(16).max(256) }).strict();
