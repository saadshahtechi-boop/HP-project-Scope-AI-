import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Declares which roles may access a route. Enforced by RolesGuard.
 * Usage: `@Roles(Role.ADMIN, Role.DOCTOR)`
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
