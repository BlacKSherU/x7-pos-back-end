import {
  createPasswordResetToken,
  hashToken,
  isPasswordResetTokenLive,
} from 'src/platform-saas/users/auth-tokens.util';

/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../platform-saas/users/entities/user.entity';
import { Company } from '../platform-saas/companies/entities/company.entity';
import { Merchant } from '../platform-saas/merchants/entities/merchant.entity';
import { SubscriptionPlan } from '../platform-saas/subscriptions/subscription-plan/entity/subscription-plan.entity';
import { CompanySubscription } from '../platform-saas/subscriptions/company-subscriptions/entities/company-subscription.entity';
import { OnboardingRegisterDto } from './dto/onboarding-register.dto';
import { UsersService } from '../platform-saas/users/users.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { SubscriptionAccessService } from './subscription-access.service';
import { UserRole } from '../platform-saas/users/constants/role.enum';
import { getAllSubscriptionFeatureIds } from '../common/subscription/subscription-feature-ids';

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  // let companyRepository: Repository<Company>; // Not used in tests
  // let merchantRepository: Repository<Merchant>; // Not used in tests
  let jwtService: JwtService;
  let usersService: UsersService;
  let mailService: MailService;

  const mockUserRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    exists: jest.fn(),
    manager: { transaction: jest.fn() },
  };

  const mockCompanyRepository = {
    findOneBy: jest.fn(),
    exists: jest.fn(),
  };

  const mockMerchantRepository = {
    findOneBy: jest.fn(),
    exists: jest.fn(),
  };

  const mockSubscriptionPlanRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    saveResetToken: jest.fn(),
    findByResetToken: jest.fn(),
    updatePassword: jest.fn(),
    updateRefreshToken: jest.fn(),
    findById: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn(),
  };

  const mockSubscriptionAccessService = {
    getSubscriptionAccessForCompany: jest.fn(),
    calculateEffectiveFeatures: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword123',
    role: 'merchant_admin' as any,
    scope: 'merchant' as any,
    merchant: {
      id: 1,
      name: 'Test Merchant',
      companyId: 1,
    },
    isActive: true,
    refreshToken: null,
  };

  // const mockMerchant = {
  //   id: 1,
  //   name: 'Test Merchant',
  //   companyId: 1,
  // };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(SubscriptionPlan),
          useValue: mockSubscriptionPlanRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: SubscriptionAccessService,
          useValue: mockSubscriptionAccessService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    // companyRepository = module.get<Repository<Company>>(
    //   getRepositoryToken(Company),
    // );
    // merchantRepository = module.get<Repository<Merchant>>(
    //   getRepositoryToken(Merchant),
    // );
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);
    mailService = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';
      const planId = 1;
      const authorizedFeatureIds = [1, 5, 9];

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockSubscriptionAccessService.calculateEffectiveFeatures.mockResolvedValue(
        { planId, authorizedFeatureIds, shiftRole: null },
      );
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);
      jest
        .spyOn(usersService, 'updateRefreshToken')
        .mockResolvedValue(undefined as any);

      const result = await service.login(loginDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        relations: ['merchant'],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(
        mockSubscriptionAccessService.calculateEffectiveFeatures,
      ).toHaveBeenCalledWith(mockUser);
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        refreshToken,
      );

      expect(result).toEqual({
        access_token: accessToken,
        refreshToken: refreshToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          scope: mockUser.scope,
          merchant: { id: mockUser.merchant.id },
          planId,
          authorizedFeatureIds,
          shiftRole: null,
          collaboratorId: undefined,
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid Credentials',
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid Credentials',
      );
    });

    it('should reject a deactivated account once the password is right', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ ...mockUser, isActive: false } as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        'This account has been deactivated',
      );
    });

    it('should throw UnauthorizedException if user has no associated merchant', async () => {
      const userWithoutMerchant = { ...mockUser, merchant: null };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithoutMerchant as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'User does not have an associated company',
      );
    });

    it('should login with empty plan when company has no subscription plan', async () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockSubscriptionAccessService.calculateEffectiveFeatures.mockResolvedValue(
        {
          planId: undefined,
          authorizedFeatureIds: [],
          shiftRole: null,
        },
      );
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);
      jest
        .spyOn(usersService, 'updateRefreshToken')
        .mockResolvedValue(undefined as any);

      const result = await service.login(loginDto);

      expect(result.user.planId).toBeUndefined();
      expect(result.user.authorizedFeatureIds).toEqual([]);
    });

    it('should login with empty plan when company subscription is not valid', async () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockSubscriptionAccessService.calculateEffectiveFeatures.mockResolvedValue(
        {
          planId: undefined,
          authorizedFeatureIds: [],
          shiftRole: null,
        },
      );
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);
      jest
        .spyOn(usersService, 'updateRefreshToken')
        .mockResolvedValue(undefined as any);

      const result = await service.login(loginDto);

      expect(result.user.planId).toBeUndefined();
      expect(result.user.authorizedFeatureIds).toEqual([]);
    });

    it('should login portal_admin without calling subscription service and with full catalog features', async () => {
      const portalUser = {
        ...mockUser,
        role: UserRole.PORTAL_ADMIN,
      };
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';

      const catalogIds = getAllSubscriptionFeatureIds();

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(portalUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockSubscriptionAccessService.calculateEffectiveFeatures.mockResolvedValue(
        {
          planId: undefined,
          authorizedFeatureIds: catalogIds,
          shiftRole: null,
        },
      );
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);
      jest
        .spyOn(usersService, 'updateRefreshToken')
        .mockResolvedValue(undefined as any);

      const result = await service.login(loginDto);

      expect(
        mockSubscriptionAccessService.calculateEffectiveFeatures,
      ).toHaveBeenCalledWith(portalUser);
      expect(result.user.planId).toBeUndefined();
      expect(result.user.authorizedFeatureIds).toEqual(catalogIds);
    });
  });

  describe('sendResetLink', () => {
    const email = 'test@example.com';

    it('should send reset link successfully for existing user', async () => {
      const userResponse = { data: mockUser };

      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue(userResponse as any);
      jest
        .spyOn(usersService, 'saveResetToken')
        .mockResolvedValue(undefined as any);
      jest.spyOn(mailService, 'sendMail').mockResolvedValue(undefined as any);

      const result = await service.sendResetLink(email);

      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
      // the link carries the token; only its hash is stored
      const mail = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      const sentToken = /token=([^"&\s]+)/.exec(mail.text)![1];
      expect(isPasswordResetTokenLive(sentToken)).toBe(true);
      expect(usersService.saveResetToken).toHaveBeenCalledWith(
        mockUser.id,
        hashToken(sentToken),
      );
      expect(mail).toMatchObject({
        to: mockUser.email,
        subject: 'Reset Password',
      });
      expect(result).toEqual({
        message:
          'If the email matches an active account, a recovery link has been sent.',
      });
    });

    it('should return a neutral message if user not found', async () => {
      jest
        .spyOn(usersService, 'findByEmail')
        .mockRejectedValue(new NotFoundException('User not found'));

      const result = await service.sendResetLink(email);

      expect(result).toEqual({
        message:
          'If the email matches an active account, a recovery link has been sent.',
      });
      expect(usersService.saveResetToken).not.toHaveBeenCalled();
      expect(mailService.sendMail).not.toHaveBeenCalled();
    });

    it('should return success even when mail service fails', async () => {
      const userResponse = { data: mockUser };

      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue(userResponse as any);
      jest
        .spyOn(usersService, 'saveResetToken')
        .mockResolvedValue(undefined as any);
      jest.spyOn(mailService, 'sendMail').mockResolvedValue(false);

      const result = await service.sendResetLink(email);

      expect(result).toEqual({
        message:
          'If the email matches an active account, a recovery link has been sent.',
      });
    });
  });

  describe('sendResetLink for a deactivated account', () => {
    it('sends nothing and answers with the same neutral message', async () => {
      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue({ data: { ...mockUser, isActive: false } } as any);
      const sendMail = jest.spyOn(mailService, 'sendMail');

      const result = await service.sendResetLink(mockUser.email);

      expect(sendMail).not.toHaveBeenCalled();
      expect(result.message).toContain(
        'If the email matches an active account',
      );
    });
  });

  describe('resetPassword', () => {
    const token = createPasswordResetToken().token;
    const newPassword = 'newPassword456';
    const hashedPassword = 'hashedNewPassword789';

    it('should reset password successfully with valid token', async () => {
      jest
        .spyOn(usersService, 'findByResetToken')
        .mockResolvedValue(mockUser as any);
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      jest
        .spyOn(usersService, 'updatePassword')
        .mockResolvedValue(undefined as any);

      const result = await service.resetPassword(token, newPassword);

      expect(usersService.findByResetToken).toHaveBeenCalledWith(
        hashToken(token),
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(usersService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        hashedPassword,
      );
      expect(result).toEqual({ message: 'Password updated successfully' });
    });

    it('should throw NotFoundException if token is invalid', async () => {
      jest.spyOn(usersService, 'findByResetToken').mockResolvedValue(null);

      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should refuse an expired link without querying the database', async () => {
      const expired = createPasswordResetToken(
        new Date(Date.now() - 31 * 60 * 1000),
      ).token;

      await expect(service.resetPassword(expired, newPassword)).rejects.toThrow(
        'Invalid or expired token',
      );
      expect(usersService.findByResetToken).not.toHaveBeenCalled();
    });

    it('should handle password hashing errors', async () => {
      jest
        .spyOn(usersService, 'findByResetToken')
        .mockResolvedValue(mockUser as any);
      mockedBcrypt.hash.mockRejectedValueOnce(
        new Error('Hashing failed') as never,
      );

      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        'Hashing failed',
      );
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const newAccessToken = 'new-access-token';

    it('should reject the refresh of a deactivated account', async () => {
      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ sub: mockUser.id, email: mockUser.email } as any);
      jest.spyOn(usersService, 'findById').mockResolvedValue({
        ...mockUser,
        refreshToken,
        isActive: false,
      } as any);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should refresh token successfully with valid refresh token', async () => {
      const payload = { sub: mockUser.id, email: mockUser.email };
      const userWithRefreshToken = {
        ...mockUser,
        refreshToken: hashToken(refreshToken),
      };

      jest.spyOn(jwtService, 'verify').mockReturnValue(payload as any);
      jest
        .spyOn(usersService, 'findById')
        .mockResolvedValue(userWithRefreshToken as any);
      jest.spyOn(jwtService, 'sign').mockReturnValue(newAccessToken);

      const result = await service.refreshToken(refreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      expect(usersService.findById).toHaveBeenCalledWith(payload.sub);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, email: mockUser.email },
        { expiresIn: '15m' },
      );
      expect(result).toEqual({ accessToken: newAccessToken });
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Refresh token expired or invalid',
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = { sub: 999, email: 'notfound@example.com' };

      jest.spyOn(jwtService, 'verify').mockReturnValue(payload as any);
      jest.spyOn(usersService, 'findById').mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        'Refresh token expired or invalid',
      );
    });

    it('should throw UnauthorizedException if refresh token does not match', async () => {
      const payload = { sub: mockUser.id, email: mockUser.email };
      const userWithDifferentToken = {
        ...mockUser,
        refreshToken: 'different-token',
      };

      jest.spyOn(jwtService, 'verify').mockReturnValue(payload as any);
      jest
        .spyOn(usersService, 'findById')
        .mockResolvedValue(userWithDifferentToken as any);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        'Refresh token expired or invalid',
      );
    });

    it('should throw UnauthorizedException if JWT verification fails', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        'Refresh token expired or invalid',
      );
    });
  });

  describe('registerOnboarding', () => {
    const dto: OnboardingRegisterDto = {
      companyName: 'Demo Group',
      companyEmail: 'contact@demo.dev',
      rut: '76.123.456-7',
      address: '123 Main Street',
      city: 'Austin',
      state: 'Texas',
      country: 'USA',
      branchName: 'Downtown',
      adminEmail: 'admin@demo.dev',
      password: 'Secret123',
    };

    let manager: { create: jest.Mock; save: jest.Mock };
    const originalDefaultPlan = process.env.ONBOARDING_DEFAULT_PLAN_ID;

    beforeEach(() => {
      mockUserRepository.exists.mockResolvedValue(false);
      mockUserRepository.find.mockResolvedValue([]);
      mockCompanyRepository.exists.mockResolvedValue(false);
      mockMerchantRepository.exists.mockResolvedValue(false);
      mockSubscriptionPlanRepository.findOne.mockImplementation(
        ({ where }: { where: { id: number } }) =>
          Promise.resolve({ id: where.id, status: 'active' }),
      );
      mockSubscriptionAccessService.getSubscriptionAccessForCompany.mockResolvedValue(
        { planId: 2, authorizedFeatureIds: [1, 2] },
      );
      mockJwtService.sign.mockReturnValue('token');

      manager = {
        create: jest.fn((_entity, data) => ({ ...data })),
        save: jest.fn((entity, data) => {
          const ids = new Map<unknown, number>([
            [Company, 10],
            [Merchant, 20],
            [User, 30],
          ]);
          return Promise.resolve({ ...data, id: ids.get(entity) ?? 40 });
        }),
      };
      mockDataSource.createQueryRunner.mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager,
      });
    });

    afterEach(() => {
      if (originalDefaultPlan === undefined) {
        delete process.env.ONBOARDING_DEFAULT_PLAN_ID;
      } else {
        process.env.ONBOARDING_DEFAULT_PLAN_ID = originalDefaultPlan;
      }
    });

    it('creates an active company subscription for the requested plan', async () => {
      const result = await service.registerOnboarding({ ...dto, planId: 2 });

      const subscriptionSave = manager.save.mock.calls.find(
        ([entity]) => entity === CompanySubscription,
      );
      expect(subscriptionSave).toBeDefined();
      expect(subscriptionSave![1]).toMatchObject({
        company_id: 10,
        plan: { id: 2 },
        status: 'active',
        paymentMethod: 'onboarding',
      });
      expect(
        mockSubscriptionAccessService.getSubscriptionAccessForCompany,
      ).toHaveBeenCalledWith(10);
      expect(result.user.planId).toBe(2);
      expect(result.user.authorizedFeatureIds).toEqual([1, 2]);
    });

    // Antes, el segundo admin@ de cualquier compañía recibía 409 "Username is already taken".
    it('derives a free username from the email, with a suffix when taken', async () => {
      mockUserRepository.find.mockResolvedValueOnce([
        { username: 'admin' },
        { username: 'admin-2' },
      ]);

      await service.registerOnboarding({ ...dto, planId: 2 });

      const userSave = manager.save.mock.calls.find(
        ([entity]) => entity === User,
      );
      expect(userSave![1]).toMatchObject({ username: 'admin-3' });
      expect(mockUserRepository.exists).not.toHaveBeenCalledWith({
        where: { username: 'admin' },
      });
    });

    it('still rejects a chosen username that is taken', async () => {
      mockUserRepository.exists.mockImplementation(
        ({ where }: { where: { username?: string } }) =>
          Promise.resolve(where.username === 'chef'),
      );

      await expect(
        service.registerOnboarding({ ...dto, planId: 2, username: 'chef' }),
      ).rejects.toThrow('Username is already taken');
    });

    it('falls back to ONBOARDING_DEFAULT_PLAN_ID when planId is omitted', async () => {
      process.env.ONBOARDING_DEFAULT_PLAN_ID = '1';

      await service.registerOnboarding(dto);

      expect(mockSubscriptionPlanRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, status: 'active' },
      });
      const subscriptionSave = manager.save.mock.calls.find(
        ([entity]) => entity === CompanySubscription,
      );
      expect(subscriptionSave![1]).toMatchObject({ plan: { id: 1 } });
    });

    it('rejects the registration when no plan can be resolved', async () => {
      delete process.env.ONBOARDING_DEFAULT_PLAN_ID;

      await expect(service.registerOnboarding(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('rejects an unknown or inactive plan', async () => {
      mockSubscriptionPlanRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registerOnboarding({ ...dto, planId: 99 }),
      ).rejects.toThrow('Subscription plan 99 does not exist or is not active');
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });
  });
});
