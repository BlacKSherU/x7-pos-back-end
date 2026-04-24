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
import { getAllSubscriptionFeatureIds } from 'src/common/subscription/subscription-feature-ids';

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
        req: any,
      ) => string,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const userId =
      typeof payload.sub === 'string'
        ? parseInt(payload.sub, 10)
        : payload.sub;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['merchant'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    if (!user.merchant) {
      throw new UnauthorizedException('Invalid token');
    }

    const isPortalStaff =
      user.role === UserRole.PORTAL_ADMIN || user.role === UserRole.PORTAL_USER;

    let planId: number | undefined;
    let authorizedFeatureIds: number[];
    if (isPortalStaff) {
      planId = undefined;
      authorizedFeatureIds = getAllSubscriptionFeatureIds();
    } else {
      const access =
        await this.subscriptionAccessService.getSubscriptionAccessForMerchant(
          user.merchant.id,
        );
      planId = access.planId;
      authorizedFeatureIds = access.authorizedFeatureIds;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchant: { id: user.merchant.id },
      planId,
      authorizedFeatureIds,
    };
  }
}
