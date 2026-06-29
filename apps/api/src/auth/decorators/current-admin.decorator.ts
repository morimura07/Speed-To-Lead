import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthAdmin } from '../auth.types';

/** Injects the authenticated platform admin (set by AdminJwtAuthGuard). */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthAdmin => {
    const request = ctx.switchToHttp().getRequest<Request & { admin?: AuthAdmin }>();
    return request.admin as AuthAdmin;
  },
);
