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
    getSubscriptionAccessForCompany: jest.Mock;
    calculateEffectiveFeatures: jest.Mock;
  };

  const mockUser = {
    id: 1,
    email: 'u@test.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 99, companyId: 5 },
    isActive: true,
  };

  beforeEach(async () => {
    const mockUserRepo = {
      findOne: jest.fn(),
    };
    subscriptionAccessService = {
      getSubscriptionAccessForCompany: jest.fn(),
      calculateEffectiveFeatures: jest.fn(),
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
    subscriptionAccessService.calculateEffectiveFeatures.mockResolvedValue({
      planId: 2,
      authorizedFeatureIds: [7, 14],
      shiftRole: null,
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
      merchant: { id: 99, companyId: 5 },
      planId: 2,
      authorizedFeatureIds: [7, 14],
      shiftRole: null,
      collaboratorId: undefined,
    });
    expect(
      subscriptionAccessService.calculateEffectiveFeatures,
    ).toHaveBeenCalledWith(mockUser);
  });

  it('validate rejects a deactivated account on its next request', async () => {
    userRepository.findOne.mockResolvedValue({
      ...mockUser,
      isActive: false,
    } as User);

    await expect(
      strategy.validate({
        sub: '1',
        email: 'u@test.com',
        role: UserRole.MERCHANT_ADMIN,
        scope: Scope.MERCHANT_WEB,
      }),
    ).rejects.toThrow(UnauthorizedException);
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
    subscriptionAccessService.calculateEffectiveFeatures.mockRejectedValue(
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
      isActive: true,
    };
    const catalog = getAllSubscriptionFeatureIds();
    userRepository.findOne.mockResolvedValue(portalUser as User);
    subscriptionAccessService.calculateEffectiveFeatures.mockResolvedValue({
      planId: undefined,
      authorizedFeatureIds: catalog,
      shiftRole: null,
    });

    const result = await strategy.validate({
      sub: '1',
      email: 'u@test.com',
      role: UserRole.PORTAL_ADMIN,
      scope: Scope.ADMIN_PORTAL,
    });

    expect(
      subscriptionAccessService.calculateEffectiveFeatures,
    ).toHaveBeenCalledWith(portalUser);
    expect(result.planId).toBeUndefined();
    expect(result.authorizedFeatureIds).toEqual(catalog);
  });
});
