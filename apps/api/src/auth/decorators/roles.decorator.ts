import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@leadarrow/shared';

export const ROLES_KEY = 'roles';

/** Restrict a route to the given company-user roles (used with RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
