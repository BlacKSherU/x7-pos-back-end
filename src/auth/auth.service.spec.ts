/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../platform-saas/users/entities/user.entity';
import { Company } from '../platform-saas/companies/entities/company.entity';
import { Merchant } from '../platform-saas/merchants/entities/merchant.entity';
import { UsersService } from '../platform-saas/users/users.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import {
  SubscriptionAccessService,
  MSG_NO_MERCHANT_PLAN,
  MSG_SUBSCRIPTION_OUTDATED,
} from './subscription-access.service';
import { UserRole } from '../platform-saas/users/constants/role.enum';
import { getAllSubscriptionFeatureIds } from '../common/subscription/subscription-feature-ids';

// Mock bcrypt
jest.mock('bcrypt');
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
  };

  const mockCompanyRepository = {
    findOneBy: jest.fn(),
  };

  const mockMerchantRepository = {
    findOneBy: jest.fn(),
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
    getSubscriptionAccessForMerchant: jest.fn(),
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
    },
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
      mockSubscriptionAccessService.getSubscriptionAccessForMerchant.mockResolvedValue(
        { planId, authorizedFeatureIds },
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

    it('should reject login when merchant has no subscription plan', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockSubscriptionAccessService.getSubscriptionAccessForMerchant.mockRejectedValue(
        new UnauthorizedException(MSG_NO_MERCHANT_PLAN),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        MSG_NO_MERCHANT_PLAN,
      );
    });

    it('should reject login when merchant subscription is not valid', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockSubscriptionAccessService.getSubscriptionAccessForMerchant.mockRejectedValue(
        new UnauthorizedException(MSG_SUBSCRIPTION_OUTDATED),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        MSG_SUBSCRIPTION_OUTDATED,
      );
    });

    it('should login portal_admin without calling subscription service and with full catalog features', async () => {
      const portalUser = {
        ...mockUser,
        role: UserRole.PORTAL_ADMIN,
      };
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const catalogIds = getAllSubscriptionFeatureIds();

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(portalUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);
      jest
        .spyOn(usersService, 'updateRefreshToken')
        .mockResolvedValue(undefined as any);

      const result = await service.login(loginDto);

      expect(
        mockSubscriptionAccessService.getSubscriptionAccessForMerchant,
      ).not.toHaveBeenCalled();
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
      expect(usersService.saveResetToken).toHaveBeenCalledWith(
        mockUser.id,
        'test-uuid-123',
      );
      expect(mailService.sendMail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject: 'Reset Password',
        text: expect.stringContaining('test-uuid-123'),
        html: expect.stringContaining('test-uuid-123'),
      });
      expect(result).toEqual({ message: 'Recovery link sent to email.' });
    });

    it('should throw NotFoundException if user not found', async () => {
      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue(undefined as any);

      await expect(service.sendResetLink(email)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.sendResetLink(email)).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle mail service errors gracefully', async () => {
      const userResponse = { data: mockUser };

      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue(userResponse as any);
      jest
        .spyOn(usersService, 'saveResetToken')
        .mockResolvedValue(undefined as any);
      jest
        .spyOn(mailService, 'sendMail')
        .mockRejectedValue(new Error('Mail service failed'));

      await expect(service.sendResetLink(email)).rejects.toThrow(
        'Mail service failed',
      );
    });
  });

  describe('resetPassword', () => {
    const token = 'reset-token-123';
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

      expect(usersService.findByResetToken).toHaveBeenCalledWith(token);
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

    it('should handle password hashing errors', async () => {
      jest
        .spyOn(usersService, 'findByResetToken')
        .mockResolvedValue(mockUser as any);
      mockedBcrypt.hash.mockRejectedValue(new Error('Hashing failed') as never);

      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        'Hashing failed',
      );
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const newAccessToken = 'new-access-token';

    it('should refresh token successfully with valid refresh token', async () => {
      const payload = { sub: mockUser.id, email: mockUser.email };
      const userWithRefreshToken = { ...mockUser, refreshToken };

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
});
