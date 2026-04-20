import { z } from 'zod';

export const SHARED_SCHEMA_VERSION = 1;

export const HealthResponse = z.object({
  ok: z.boolean(),
  version: z.string(),
  uptime: z.number().nonnegative(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
