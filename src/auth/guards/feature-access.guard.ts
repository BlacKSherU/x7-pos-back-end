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
import { PaymentRequiredException } from '../exceptions/payment-required.exception';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { isAuthorizedForFeature } from '../utils/is-authorized-for-feature.util';
import { UserRole } from '../../platform-saas/users/constants/role.enum';

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

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const isMerchantUser =
      user.role === UserRole.MERCHANT_ADMIN ||
      user.role === UserRole.MERCHANT_USER;

    // If the user is a merchant user and there is no active subscription resolved in the JWT,
    // treat it as a payment/subscription status issue (402) rather than a feature mismatch (403).
    if (isMerchantUser && !user.planId) {
      throw new PaymentRequiredException(
        'Company subscription is inactive or expired; payment required',
      );
    }

    if (!isAuthorizedForFeature(user, requiredFeatureId)) {
      throw new ForbiddenException(
        `Feature ${requiredFeatureId} is not included in the current company plan`,
      );
    }

    return true;
  }
}
