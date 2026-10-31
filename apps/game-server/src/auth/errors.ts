export class AuthFault extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}
export const unauthorized = () => new AuthFault(401, "authentication_required");
