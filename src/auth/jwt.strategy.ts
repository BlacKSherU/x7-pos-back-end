// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../platform-saas/users/entities/user.entity';
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
    private readonly subscriptionAccessService: SubscriptionAccessService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() as (
        req: unknown,
      ) => string,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
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

    const effectiveAccess =
      await this.subscriptionAccessService.calculateEffectiveFeatures(user);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchant: { id: user.merchant.id, companyId: user.merchant.companyId },
      planId: effectiveAccess.planId,
      authorizedFeatureIds: effectiveAccess.authorizedFeatureIds,
      shiftRole: effectiveAccess.shiftRole,
      collaboratorId: effectiveAccess.collaboratorId,
    };
  }
}
