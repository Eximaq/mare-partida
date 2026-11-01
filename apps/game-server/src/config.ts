import {isIP} from 'node:net';
import { z } from 'zod';

const databaseUrl = z.string().min(1).refine((value) => {
  try {
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol) && Boolean(url.hostname) && url.pathname.length > 1;
  } catch { return false; }
});
const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.enum(['127.0.0.1', '::1', '0.0.0.0']).default('127.0.0.1'),
  PORT: z.string().regex(/^\d+$/).default('8787').transform(Number).pipe(z.number().int().min(1).max(65535)),
  DATABASE_URL: databaseUrl,
  TRUSTED_PROXY_IP: z.string().refine(v=>isIP(v)!==0).optional(),
});

export function readConfig(env: NodeJS.ProcessEnv) {
  const result = environmentSchema.safeParse(env);
  if (!result.success) throw new Error('Invalid server configuration: check NODE_ENV, HOST, PORT and DATABASE_URL');
  if(result.data.NODE_ENV==='production' && (result.data.HOST!=='127.0.0.1' || result.data.TRUSTED_PROXY_IP!=='127.0.0.1' || env.AUTH_ENABLED!=='true' || !env.AUTH_PUBLIC_ORIGIN?.startsWith('https://') || env.SESSION_ABSOLUTE_SECONDS!=='86400' || env.SESSION_IDLE_SECONDS!=='7200'))throw new Error('Production requires loopback proxy, HTTPS authentication and approved session policy');
  return { trustedProxyIp:result.data.TRUSTED_PROXY_IP, host: result.data.HOST, port: result.data.PORT, databaseUrl: result.data.DATABASE_URL };
}
