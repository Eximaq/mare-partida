import { z } from "zod";
export const providerSessionSchema = z.object({
  provider: z.string().min(1).max(64),
  subject: z.uuid(),
  providerSessionId: z.uuid(),
  accessToken: z.string().min(1).max(16384),
  refreshToken: z.string().min(1).max(16384),
  expiresAt: z.number().finite().positive(),
});
export type ProviderSession = z.infer<typeof providerSessionSchema>;
export interface AuthProvider {
  login(email: string, password: string): Promise<ProviderSession>;
  refresh(refreshToken: string): Promise<ProviderSession>;
  start(
    kind: "signup" | "recovery",
    email: string,
    password: string | undefined,
    redirect: string,
  ): Promise<Record<string, string>>;
  exchange(
    state: Record<string, string>,
    code: string,
  ): Promise<ProviderSession>;
  logout(session: ProviderSession, scope: "local" | "all"): Promise<void>;
  reset(session: ProviderSession, password: string): Promise<void>;
}
