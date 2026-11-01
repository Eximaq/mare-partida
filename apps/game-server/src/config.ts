import { z } from 'zod';

const databaseUrl = z.string().min(1).refine((value) => {
  try {
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol) && Boolean(url.hostname) && url.pathname.length > 1;
  } catch { return false; }
});
const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test']).default('development'),
  HOST: z.enum(['127.0.0.1', '::1', '0.0.0.0']).default('127.0.0.1'),
  PORT: z.string().regex(/^\d+$/).default('8787').transform(Number).pipe(z.number().int().min(1).max(65535)),
  DATABASE_URL: databaseUrl,
});

export function readConfig(env: NodeJS.ProcessEnv) {
  const result = environmentSchema.safeParse(env);
  if (!result.success) throw new Error('Invalid server configuration: check NODE_ENV, HOST, PORT and DATABASE_URL');
  return { host: result.data.HOST, port: result.data.PORT, databaseUrl: result.data.DATABASE_URL };
}
