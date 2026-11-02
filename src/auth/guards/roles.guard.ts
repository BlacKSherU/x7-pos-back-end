// src/auth/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SCOPES_KEY } from '../decorators/scopes.decorator';
import { Request } from 'express';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { UserRole } from '../../platform-saas/users/constants/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.get<string[]>(ROLES_KEY, context.getHandler()) ??
      this.reflector.get<string[]>(ROLES_KEY, context.getClass());
    const requiredScopes =
      this.reflector.get<string[]>(SCOPES_KEY, context.getHandler()) ??
      this.reflector.get<string[]>(SCOPES_KEY, context.getClass());

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Role not enough (${user.role})`);
    }

    if (requiredScopes && !requiredScopes.includes(user.scope)) {
      throw new ForbiddenException(`Scope not enough (${user.scope})`);
    }

    return true;
  }
}
