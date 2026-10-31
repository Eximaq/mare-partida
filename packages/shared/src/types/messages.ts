import type { z } from 'zod';
import type { clientMessageSchema } from '../schemas/messages.js';

export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type HealthResponse = { status: 'alive' | 'ready' | 'not_ready' };
