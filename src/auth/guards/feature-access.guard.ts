import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { isAuthorizedForFeature } from '../utils/is-authorized-for-feature.util';

@Injectable()
export class FeatureAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeatureId = this.reflector.getAllAndOverride<number>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredFeatureId === undefined || requiredFeatureId === null) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    if (!isAuthorizedForFeature(user, requiredFeatureId)) {
      throw new ForbiddenException(
        `Feature ${requiredFeatureId} is not included in the current merchant plan`,
      );
    }

    return true;
  }
}
