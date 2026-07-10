import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Shape attached to req.user by JwtStrategy.validate(). */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Injects the authenticated user (or one of its fields) into a handler.
 * Usage: `@CurrentUser() user: AuthUser` or `@CurrentUser('id') userId: string`
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return field ? user?.[field] : user;
  },
);
