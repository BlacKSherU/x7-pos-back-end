// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../platform-saas/users/entities/user.entity';
import { Merchant } from '../platform-saas/merchants/entities/merchant.entity';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { UserRole } from '../platform-saas/users/constants/role.enum';
import { Scope } from '../platform-saas/users/constants/scope.enum';
import { SubscriptionAccessService } from './subscription-access.service';

interface JwtPayload {
  sub: string | number;
  email: string;
  role: UserRole;
  scope: Scope;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly subscriptionAccessService: SubscriptionAccessService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() as (
        req: unknown,
      ) => string,
      passReqToCallback: true,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  async validate(
    reqOrPayload: any,
    maybePayload?: JwtPayload,
  ): Promise<AuthenticatedUser> {
    const req = maybePayload ? reqOrPayload : undefined;
    const payload: JwtPayload = maybePayload ? maybePayload : reqOrPayload;

    const userId =
      typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['merchant'],
    });

    // A deactivated account loses access on its next request, not when its token expires.
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token');
    }
    if (!user.merchant) {
      throw new UnauthorizedException('Invalid token');
    }

    let targetMerchant = user.merchant;
    if (user.role === UserRole.SUPER_ADMIN && req) {
      const rawMerchantId =
        req.headers?.['x-merchant-id'] || req.query?.merchantId;
      if (rawMerchantId) {
        const parsedMerchantId = parseInt(String(rawMerchantId), 10);
        if (!isNaN(parsedMerchantId) && parsedMerchantId > 0) {
          const found = await this.merchantRepository.findOne({
            where: { id: parsedMerchantId },
          });
          if (found) {
            targetMerchant = found;
          }
        }
      }
    }

    const effectiveAccess =
      await this.subscriptionAccessService.calculateEffectiveFeatures(user);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchant: { id: targetMerchant.id, companyId: targetMerchant.companyId },
      planId: effectiveAccess.planId,
      authorizedFeatureIds: effectiveAccess.authorizedFeatureIds,
      shiftRole: effectiveAccess.shiftRole,
      collaboratorId: effectiveAccess.collaboratorId,
    };
  }
}
