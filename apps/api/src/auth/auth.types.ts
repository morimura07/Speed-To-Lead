import type { UserRole } from '@leadarrow/shared';

/** Subject type carried in the access token. */
export type PrincipalType = 'user' | 'admin';

/** JWT access-token payload. */
export interface JwtPayload {
  sub: string;
  typ: PrincipalType;
  orgId?: string;
  role?: UserRole;
}

/** Authenticated company user, attached to the request by JwtAuthGuard. */
export interface AuthUser {
  userId: string;
  orgId: string;
  role: UserRole;
}

/** Authenticated platform admin, attached to the request by AdminJwtAuthGuard. */
export interface AuthAdmin {
  adminId: string;
}

/** Tokens returned to clients on successful auth. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime, e.g. "15m" — informational for clients. */
  expiresIn: string;
}
