import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { SubscriptionAccessService } from 'src/auth/subscription-access.service';

export type RealtimeAuthenticatedUser = AuthenticatedUser & {
  companyId: number;
};

interface JwtPayload {
  sub: string | number;
  email: string;
  role: UserRole;
}

@Injectable()
export class RealtimeAuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly subscriptionAccessService: SubscriptionAccessService,
  ) {}

  async authenticateToken(token: string): Promise<RealtimeAuthenticatedUser> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const userId =
      typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['merchant'],
    });

    if (!user || !user.isActive || !user.merchant) {
      throw new UnauthorizedException('Invalid token');
    }

    const effectiveAccess =
      await this.subscriptionAccessService.calculateEffectiveFeatures(user);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchant: { id: user.merchant.id },
      companyId: user.merchant.companyId ?? 0,
      planId: effectiveAccess.planId,
      authorizedFeatureIds: effectiveAccess.authorizedFeatureIds,
      shiftRole: effectiveAccess.shiftRole,
      collaboratorId: effectiveAccess.collaboratorId,
    };
  }
}
