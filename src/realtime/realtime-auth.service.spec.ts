import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { RealtimeAuthService } from './realtime-auth.service';
import { SubscriptionAccessService } from 'src/auth/subscription-access.service';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

describe('RealtimeAuthService', () => {
  let service: RealtimeAuthService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockSubscriptionAccessService = {
    getSubscriptionAccessForCompany: jest.fn(),
    calculateEffectiveFeatures: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RealtimeAuthService,
        { provide: JwtService, useValue: mockJwtService },
        {
          provide: SubscriptionAccessService,
          useValue: mockSubscriptionAccessService,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();

    service = moduleRef.get(RealtimeAuthService);

    jest.clearAllMocks();
  });

  it('throws UnauthorizedException for invalid token', async () => {
    mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('bad token'));

    await expect(service.authenticateToken('bad')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid token',
    });
    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('bad');
  });

  it('returns authenticated user and resolves companyId', async () => {
    mockJwtService.verifyAsync.mockResolvedValueOnce({
      sub: 10,
      email: 'a@b.com',
      role: UserRole.MERCHANT_ADMIN,
    });

    mockUserRepository.findOne.mockResolvedValueOnce({
      id: 10,
      email: 'a@b.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 77, companyId: 55 },
      isActive: true,
    });

    mockSubscriptionAccessService.calculateEffectiveFeatures.mockResolvedValueOnce(
      {
        planId: 1,
        authorizedFeatureIds: [1, 2],
        shiftRole: null,
        collaboratorId: undefined,
      },
    );

    const user = await service.authenticateToken('good');

    expect(user).toEqual({
      id: 10,
      email: 'a@b.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 77 },
      companyId: 55,
      planId: 1,
      authorizedFeatureIds: [1, 2],
      shiftRole: null,
      collaboratorId: undefined,
    });
    expect(mockUserRepository.findOne).toHaveBeenCalledWith({
      where: { id: 10 },
      relations: ['merchant'],
    });
    expect(
      mockSubscriptionAccessService.calculateEffectiveFeatures,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 10,
        email: 'a@b.com',
      }),
    );
  });
});
