import type { CookieOptions, Response } from 'express';

/** httpOnly refresh-token cookies — separate names so a user session and an
 * admin session can coexist in one browser without colliding or racing on
 * rotation. */
export const USER_REFRESH_COOKIE = 'la_sess';
export const ADMIN_REFRESH_COOKIE = 'la_admin_sess';

/**
 * Cookie options. In production: cross-site-safe (`SameSite=None; Secure`,
 * requires HTTPS). In development: `SameSite=Lax` without `Secure`, which works
 * for the same-site localhost:3000 → localhost:4000 setup over http.
 */
function baseOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
}

export function setRefreshCookie(
  res: Response,
  name: string,
  token: string,
  maxAgeMs: number,
  isProduction: boolean,
): void {
  res.cookie(name, token, { ...baseOptions(isProduction), maxAge: maxAgeMs });
}

export function clearRefreshCookie(res: Response, name: string, isProduction: boolean): void {
  res.clearCookie(name, baseOptions(isProduction));
}
