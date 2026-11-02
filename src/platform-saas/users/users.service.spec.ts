// src/platform-saas/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from 'src/mail/mail.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { hashToken } from './auth-tokens.util';
import { User } from './entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { UserRole } from './constants/role.enum';
import { Scope } from './constants/scope.enum';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let companyRepository: jest.Mocked<Repository<Company>>;
  let merchantRepository: jest.Mocked<Repository<Merchant>>;

  // Mock data
  const mockMerchant: Partial<Merchant> = {
    id: 1,
    name: 'Test Merchant',
    email: 'merchant@test.com',
  };

  const mockUser: Partial<User> = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchantId: 1,
    merchant: mockMerchant as Merchant,
  };

  beforeEach(async () => {
    const mockUserRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockCompanyRepository = {
      findOne: jest.fn(),
    };

    const mockMerchantRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
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
          // Dependencia que el servicio ganó y este spec nunca registró.
          provide: MailService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    companyRepository = module.get(getRepositoryToken(Company));
    merchantRepository = module.get(getRepositoryToken(Merchant));

    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have userRepository defined', () => {
      expect(userRepository).toBeDefined();
    });

    it('should have companyRepository defined', () => {
      expect(companyRepository).toBeDefined();
    });

    it('should have merchantRepository defined', () => {
      expect(merchantRepository).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all users successfully', async () => {
      const users = [mockUser as User];
      const findSpy = jest.spyOn(userRepository, 'findAndCount');
      findSpy.mockResolvedValue([users, 1]);

      const result = await service.findAll();

      // Sin page ni limit: todos, y la respuesta sin datos de paginación.
      expect(findSpy).toHaveBeenCalledWith({
        relations: ['merchant'],
        order: { id: 'ASC' },
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: [
          {
            id: mockUser.id,
            username: mockUser.username,
            email: mockUser.email,
            role: mockUser.role,
            scope: mockUser.scope,
            merchantId: mockUser.merchantId,
            merchant: mockUser.merchant,
          },
        ],
      });
    });

    it('should return empty array when no users found', async () => {
      userRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Users retrieved successfully');
    });

    it('pages and adds the pagination data when page or limit is sent', async () => {
      userRepository.findAndCount.mockResolvedValue([[mockUser as User], 61]);

      const result = await service.findAll({ page: 2, limit: 30 });

      expect(userRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 30, take: 30 }),
      );
      expect(result).toMatchObject({
        page: 2,
        limit: 30,
        total: 61,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });
  });

  describe('findByCompany', () => {
    const adminOf = (companyId?: number) =>
      ({
        id: 10,
        email: 'admin@test.com',
        role: UserRole.MERCHANT_ADMIN,
        scope: Scope.MERCHANT_WEB,
        merchant: { id: 1, companyId },
      }) as AuthenticatedUser;

    it("lists the users of every merchant in the session's company", async () => {
      const findSpy = jest.spyOn(userRepository, 'find');
      findSpy.mockResolvedValue([mockUser as User]);

      const result = await service.findByCompany(adminOf(7));

      expect(findSpy).toHaveBeenCalledWith({
        where: { merchant: { companyId: 7 } },
        relations: ['merchant'],
        order: { merchantId: 'ASC', id: 'ASC' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('password');
    });

    it('refuses a session without a company instead of listing everyone', async () => {
      const findSpy = jest.spyOn(userRepository, 'find');

      await expect(service.findByCompany(adminOf(undefined))).rejects.toThrow(
        'Company not found',
      );
      expect(findSpy).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a user by ID', async () => {
      const findOneBySpy = jest.spyOn(userRepository, 'findOneBy');
      findOneBySpy.mockResolvedValue(mockUser as User);

      const result = await service.findById(1);

      expect(findOneBySpy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const findOneBySpy = jest.spyOn(userRepository, 'findOneBy');
      findOneBySpy.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(findOneBySpy).toHaveBeenCalledWith({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe('Repository Methods', () => {
    it('should call findByResetToken with correct parameters', async () => {
      const findOneSpy = jest.spyOn(userRepository, 'findOne');
      findOneSpy.mockResolvedValue(mockUser as User);

      const result = await service.findByResetToken('reset-token');

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { resetToken: 'reset-token' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should call findByRefreshToken with correct parameters', async () => {
      const findOneSpy = jest.spyOn(userRepository, 'findOne');
      findOneSpy.mockResolvedValue(mockUser as User);

      const result = await service.findByRefreshToken('refresh-token');

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { refreshToken: hashToken('refresh-token') },
      });
      expect(result).toEqual(mockUser);
    });

    it('should save reset token correctly', async () => {
      const updateSpy = jest.spyOn(userRepository, 'update');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      updateSpy.mockResolvedValue({ affected: 1 } as any);

      await service.saveResetToken(1, 'reset-token-123');

      expect(updateSpy).toHaveBeenCalledWith(1, {
        resetToken: 'reset-token-123',
      });
    });

    it('should update password correctly', async () => {
      const updateSpy = jest.spyOn(userRepository, 'update');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      updateSpy.mockResolvedValue({ affected: 1 } as any);

      await service.updatePassword(1, 'newHashedPassword');

      expect(updateSpy).toHaveBeenCalledWith(1, {
        password: 'newHashedPassword',
        resetToken: null,
        // a new password ends every open session
        refreshToken: null,
      });
    });

    it('should save refresh token correctly', async () => {
      const updateSpy = jest.spyOn(userRepository, 'update');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      updateSpy.mockResolvedValue({ affected: 1 } as any);

      await service.saveRefreshToken(1, 'refresh-token-abc');

      expect(updateSpy).toHaveBeenCalledWith(1, {
        // only the token's hash is stored
        refreshToken: hashToken('refresh-token-abc'),
      });
    });

    it('should update refresh token correctly', async () => {
      const updateSpy = jest.spyOn(userRepository, 'update');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      updateSpy.mockResolvedValue({ affected: 1 } as any);

      await service.updateRefreshToken(1, 'new-refresh-token');

      expect(updateSpy).toHaveBeenCalledWith(1, {
        refreshToken: hashToken('new-refresh-token'),
      });
    });
  });

  describe('setActiveStatus', () => {
    it('deactivating a user also drops its refresh token', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        isActive: true,
        refreshToken: 'live-refresh-token',
      } as User);
      userRepository.save.mockImplementation((u) => Promise.resolve(u as User));

      await service.setActiveStatus(1, false, {
        id: 99,
        email: 'portal@test.com',
        role: UserRole.PORTAL_ADMIN,
        scope: Scope.ADMIN_PORTAL,
        merchant: { id: 1 },
      } as AuthenticatedUser);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false, refreshToken: null }),
      );
    });
  });

  describe('Entity Relationships', () => {
    it('should call companyRepository when needed', () => {
      expect(companyRepository).toBeDefined();
      expect(typeof companyRepository.findOne).toBe('function');
    });

    it('should call merchantRepository when needed', () => {
      expect(merchantRepository).toBeDefined();
      expect(typeof merchantRepository.findOne).toBe('function');
    });
  });

  describe('lookups by id or email for API callers', () => {
    const otherMerchantAdmin = {
      id: 99,
      email: 'admin@other.dev',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 2 },
    } as AuthenticatedUser;
    const sameMerchantAdmin = { ...otherMerchantAdmin, merchant: { id: 1 } };
    const portalAdmin = {
      ...otherMerchantAdmin,
      role: UserRole.PORTAL_ADMIN,
    } as AuthenticatedUser;

    beforeEach(() => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
    });

    it.each([
      ['findOne', 1],
      ['findByEmail', 'test@example.com'],
    ] as const)(
      '%s hides users of another merchant (404, not 403)',
      async (method, arg) => {
        await expect(
          (
            service[method] as (
              a: unknown,
              u: AuthenticatedUser,
            ) => Promise<unknown>
          )(arg, otherMerchantAdmin),
        ).rejects.toThrow(NotFoundException);
      },
    );

    it.each([sameMerchantAdmin, portalAdmin])(
      'returns the user to its merchant admin or a portal admin',
      async (currentUser) => {
        const result = await service.findOne(1, currentUser);
        expect(result.data.id).toBe(1);
      },
    );

    it('keeps internal email lookups unrestricted', async () => {
      const result = await service.findByEmail('test@example.com');
      expect(result.data.id).toBe(1);
    });
  });

  describe('who may change roles, scopes and status', () => {
    const merchantA = { id: 1 } as Merchant;
    const staff = (
      id: number,
      role: UserRole,
      scope = Scope.MERCHANT_WEB,
    ): User =>
      ({
        id,
        username: `user${id}`,
        email: `user${id}@test.com`,
        role,
        scope,
        isActive: true,
        merchantId: 1,
        merchant: merchantA,
      }) as User;
    const asCaller = (u: User) =>
      ({
        id: u.id,
        email: u.email,
        role: u.role,
        scope: u.scope,
        merchant: { id: 1 },
      }) as AuthenticatedUser;

    const cashier = staff(10, UserRole.MERCHANT_USER);
    const admin = staff(20, UserRole.MERCHANT_ADMIN);

    const loads = (target: User) => {
      userRepository.findOne.mockResolvedValue({ ...target });
      userRepository.save.mockImplementation((u) => Promise.resolve(u as User));
    };

    it('a merchant user cannot promote itself to portal admin', async () => {
      loads(cashier);

      await expect(
        service.update(
          cashier.id,
          { role: UserRole.PORTAL_ADMIN, scope: Scope.ADMIN_PORTAL },
          asCaller(cashier),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('a merchant user cannot edit a coworker (e.g. take over the admin account)', async () => {
      loads(admin);

      await expect(
        service.update(
          admin.id,
          { email: 'attacker@test.com', password: 'x' },
          asCaller(cashier),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('a merchant user can edit its own profile, even resending its current role and scope', async () => {
      loads(cashier);

      await service.update(
        cashier.id,
        {
          username: 'renamed',
          role: cashier.role,
          scope: cashier.scope,
        },
        asCaller(cashier),
      );

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'renamed', role: cashier.role }),
      );
    });

    it('a merchant admin can change a coworker between merchant roles', async () => {
      loads(cashier);

      await service.update(
        cashier.id,
        { role: UserRole.MERCHANT_ADMIN },
        asCaller(admin),
      );

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.MERCHANT_ADMIN }),
      );
    });

    it.each([
      ['a portal role', { role: UserRole.PORTAL_ADMIN }],
      ['the admin portal scope', { scope: Scope.ADMIN_PORTAL }],
    ])('a merchant admin cannot grant %s', async (_label, dto) => {
      loads(cashier);

      await expect(
        service.update(cashier.id, dto, asCaller(admin)),
      ).rejects.toThrow(ForbiddenException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('a merchant admin cannot touch a portal user attached to its merchant', async () => {
      loads(staff(30, UserRole.PORTAL_ADMIN, Scope.ADMIN_PORTAL));

      await expect(
        service.update(30, { username: 'x' }, asCaller(admin)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('a merchant admin cannot create a portal admin', async () => {
      await expect(
        service.create(
          {
            username: 'new',
            email: 'new@test.com',
            password: 'Secret123!',
            role: UserRole.PORTAL_ADMIN,
            scope: Scope.ADMIN_PORTAL,
          },
          asCaller(admin),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('a portal admin can grant any role', async () => {
      loads(cashier);
      const portalAdmin = {
        ...asCaller(admin),
        role: UserRole.PORTAL_ADMIN,
      } as AuthenticatedUser;

      await service.update(
        cashier.id,
        { role: UserRole.PORTAL_USER, scope: Scope.ADMIN_PORTAL },
        portalAdmin,
      );

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.PORTAL_USER }),
      );
    });
  });
});
