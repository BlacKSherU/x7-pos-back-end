import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../platform-saas/users/entities/user.entity';
import { SubscriptionAccessService } from './subscription-access.service';
import { UserRole } from '../platform-saas/users/constants/role.enum';
import { Scope } from '../platform-saas/users/constants/scope.enum';
import { getAllSubscriptionFeatureIds } from '../common/subscription/subscription-feature-ids';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let subscriptionAccessService: {
    getSubscriptionAccessForMerchant: jest.Mock;
  };

  const mockUser = {
    id: 1,
    email: 'u@test.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 99 },
  };

  beforeEach(async () => {
    const mockUserRepo = {
      findOne: jest.fn(),
    };
    subscriptionAccessService = {
      getSubscriptionAccessForMerchant: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'test-secret') },
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: SubscriptionAccessService,
          useValue: subscriptionAccessService,
        },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('validate returns AuthenticatedUser with planId and authorizedFeatureIds', async () => {
    userRepository.findOne.mockResolvedValue(mockUser as User);
    subscriptionAccessService.getSubscriptionAccessForMerchant.mockResolvedValue({
      planId: 2,
      authorizedFeatureIds: [7, 14],
    });

    const result = await strategy.validate({
      sub: '1',
      email: 'u@test.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
    });

    expect(result).toEqual({
      id: 1,
      email: 'u@test.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 99 },
      planId: 2,
      authorizedFeatureIds: [7, 14],
    });
    expect(
      subscriptionAccessService.getSubscriptionAccessForMerchant,
    ).toHaveBeenCalledWith(99);
  });

  it('validate throws when user missing', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 1,
        email: 'x@test.com',
        role: UserRole.MERCHANT_ADMIN,
        scope: Scope.MERCHANT_WEB,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('validate propagates subscription UnauthorizedException', async () => {
    userRepository.findOne.mockResolvedValue(mockUser as User);
    subscriptionAccessService.getSubscriptionAccessForMerchant.mockRejectedValue(
      new UnauthorizedException('Merchant subscription is not active'),
    );

    await expect(
      strategy.validate({
        sub: '1',
        email: 'u@test.com',
        role: UserRole.MERCHANT_ADMIN,
        scope: Scope.MERCHANT_WEB,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('validate skips subscription for portal_admin and returns full feature catalog', async () => {
    const portalUser = {
      id: 1,
      email: 'u@test.com',
      role: UserRole.PORTAL_ADMIN,
      scope: Scope.ADMIN_PORTAL,
      merchant: { id: 99 },
    };
    const catalog = getAllSubscriptionFeatureIds();
    userRepository.findOne.mockResolvedValue(portalUser as User);

    const result = await strategy.validate({
      sub: '1',
      email: 'u@test.com',
      role: UserRole.PORTAL_ADMIN,
      scope: Scope.ADMIN_PORTAL,
    });

    expect(
      subscriptionAccessService.getSubscriptionAccessForMerchant,
    ).not.toHaveBeenCalled();
    expect(result.planId).toBeUndefined();
    expect(result.authorizedFeatureIds).toEqual(catalog);
  });
});
