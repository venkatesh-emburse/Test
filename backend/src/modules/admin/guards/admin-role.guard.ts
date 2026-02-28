import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../../../database/entities/enums';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  [AdminRole.SUPER_ADMIN]: 3,
  [AdminRole.ADMIN]: 2,
  [AdminRole.SUPPORT]: 1,
};

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access (just needs to be authenticated)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied');
    }

    const userLevel = ROLE_HIERARCHY[user.role as AdminRole] || 0;
    const minRequiredLevel = Math.min(
      ...requiredRoles.map((role) => ROLE_HIERARCHY[role] || 0),
    );

    if (userLevel < minRequiredLevel) {
      throw new ForbiddenException(
        'Insufficient permissions for this action',
      );
    }

    return true;
  }
}
