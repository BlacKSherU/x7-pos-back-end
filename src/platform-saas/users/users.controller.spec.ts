import { Test, TestingModule } from '@nestjs/testing';
import { CompanyStatus } from 'src/platform-saas/companies/constants/company-status.enum';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserRole } from './constants/role.enum';
import { Scope } from './constants/scope.enum';
import {
  OneUserResponseDto,
  AllUsersResponseDto,
} from './dtos/user-response.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Request } from 'express';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  // Mock data
  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchantId: 1,
    isActive: true,
  };

  const mockAuthenticatedUser: AuthenticatedUser = {
    id: 1,
    email: 'test@example.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: {
      id: 1,
    },
  };

  const authRequest = { user: mockAuthenticatedUser } as Request & {
    user: AuthenticatedUser;
  };

  const mockCreateUserDto: CreateUserDto = {
    username: 'newuser',
    email: 'newuser@example.com',
    password: 'password123',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    companyId: 1,
    merchantId: 1,
  };

  const mockUpdateUserDto: UpdateUserDto = {
    username: 'updateduser',
    email: 'updated@example.com',
  };

  const mockOneUserResponse: OneUserResponseDto = {
    statusCode: 200,
    message: 'User retrieved successfully',
    data: mockUser,
  };

  const mockAllUsersResponse: AllUsersResponseDto = {
    statusCode: 200,
    message: 'Users retrieved successfully',
    data: [mockUser],
  };

  beforeEach(async () => {
    // Mock UsersService
    const mockUsersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByMerchant: jest.fn(),
      findByCompany: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have usersService defined', () => {
      expect(usersService).toBeDefined();
    });
  });

  describe('POST /users (create)', () => {
    it('should create a new user successfully', async () => {
      const createSpy = jest.spyOn(usersService, 'create');
      createSpy.mockResolvedValue(mockOneUserResponse);

      const result = await controller.create(mockCreateUserDto, authRequest);

      expect(createSpy).toHaveBeenCalledWith(
        mockCreateUserDto,
        mockAuthenticatedUser,
      );
      expect(result).toEqual(mockOneUserResponse);
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'Email already exists';
      const createSpy = jest.spyOn(usersService, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreateUserDto, authRequest),
      ).rejects.toThrow(errorMessage);
      expect(createSpy).toHaveBeenCalledWith(
        mockCreateUserDto,
        mockAuthenticatedUser,
      );
    });
  });

  describe('GET /users (findAll)', () => {
    it('should return all users successfully', async () => {
      const findAllSpy = jest.spyOn(usersService, 'findAll');
      findAllSpy.mockResolvedValue(mockAllUsersResponse);

      const result = await controller.findAll({});

      expect(findAllSpy).toHaveBeenCalled();
      expect(result).toEqual(mockAllUsersResponse);
    });

    it('should handle empty user list', async () => {
      const emptyResponse: AllUsersResponseDto = {
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: [],
      };
      const findAllSpy = jest.spyOn(usersService, 'findAll');
      findAllSpy.mockResolvedValue(emptyResponse);

      const result = await controller.findAll({});

      expect(findAllSpy).toHaveBeenCalled();
      expect(result).toEqual(emptyResponse);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('GET /users/:id (findById)', () => {
    it('should return a user by ID successfully', async () => {
      const userId = 1;
      const findOneSpy = jest.spyOn(usersService, 'findOne');
      findOneSpy.mockResolvedValue(mockOneUserResponse);

      const result = await controller.findById(userId, authRequest);

      expect(findOneSpy).toHaveBeenCalledWith(userId, mockAuthenticatedUser);
      expect(result).toEqual(mockOneUserResponse);
    });

    it('should handle user not found', async () => {
      const userId = 999;
      const errorMessage = 'User not found';
      const findOneSpy = jest.spyOn(usersService, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findById(userId, authRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(userId, mockAuthenticatedUser);
    });
  });

  describe('GET /users/merchant/:merchantId (findByMerchant)', () => {
    it('should return users by merchant ID successfully', async () => {
      const merchantId = 1;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        user: mockAuthenticatedUser,
      } as any;

      const findByMerchantSpy = jest.spyOn(usersService, 'findByMerchant');
      findByMerchantSpy.mockResolvedValue(mockAllUsersResponse);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.findByMerchant(merchantId, mockRequest);

      expect(findByMerchantSpy).toHaveBeenCalledWith(
        merchantId,
        mockAuthenticatedUser,
      );
      expect(result).toEqual(mockAllUsersResponse);
    });

    it('should handle merchant not found', async () => {
      const merchantId = 999;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        user: mockAuthenticatedUser,
      } as any;
      const errorMessage = 'Merchant not found';

      const findByMerchantSpy = jest.spyOn(usersService, 'findByMerchant');
      findByMerchantSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        controller.findByMerchant(merchantId, mockRequest),
      ).rejects.toThrow(errorMessage);
      expect(findByMerchantSpy).toHaveBeenCalledWith(
        merchantId,
        mockAuthenticatedUser,
      );
    });
  });

  describe('GET /users/company (findByCompany)', () => {
    it('delegates with the session user, so the company comes from the token', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        user: mockAuthenticatedUser,
      } as any;

      const findByCompanySpy = jest.spyOn(usersService, 'findByCompany');
      findByCompanySpy.mockResolvedValue(mockAllUsersResponse);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.findByCompany(mockRequest);

      expect(findByCompanySpy).toHaveBeenCalledWith(mockAuthenticatedUser);
      expect(result).toEqual(mockAllUsersResponse);
    });
  });

  describe('GET /users/email/:email (findByEmail)', () => {
    it('should return user by email successfully', async () => {
      const email = 'test@example.com';
      const findByEmailSpy = jest.spyOn(usersService, 'findByEmail');
      findByEmailSpy.mockResolvedValue(mockOneUserResponse);

      const result = await controller.findByEmail(email, authRequest);

      expect(findByEmailSpy).toHaveBeenCalledWith(email, mockAuthenticatedUser);
      expect(result).toEqual(mockOneUserResponse);
    });

    it('should handle user not found by email', async () => {
      const email = 'notfound@example.com';
      const errorMessage = 'User not found';
      const findByEmailSpy = jest.spyOn(usersService, 'findByEmail');
      findByEmailSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findByEmail(email, authRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findByEmailSpy).toHaveBeenCalledWith(email, mockAuthenticatedUser);
    });
  });

  describe('PUT /users/:id (update)', () => {
    it('should update user successfully', async () => {
      const userId = 1;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        user: mockAuthenticatedUser,
      } as any;

      const updatedUserResponse: OneUserResponseDto = {
        statusCode: 200,
        message: 'User updated successfully',
        data: { ...mockUser, ...mockUpdateUserDto },
      };

      const updateSpy = jest.spyOn(usersService, 'update');
      updateSpy.mockResolvedValue(updatedUserResponse);

      const result = await controller.update(
        userId,
        mockUpdateUserDto,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        mockRequest,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        userId,
        mockUpdateUserDto,
        mockAuthenticatedUser,
      );
      expect(result).toEqual(updatedUserResponse);
    });

    it('should handle update user not found', async () => {
      const userId = 999;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        user: mockAuthenticatedUser,
      } as any;
      const errorMessage = 'User not found';

      const updateSpy = jest.spyOn(usersService, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(
          userId,
          mockUpdateUserDto,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          mockRequest,
        ),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(
        userId,
        mockUpdateUserDto,
        mockAuthenticatedUser,
      );
    });

    it('should handle validation errors during update', async () => {
      const userId = 1;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        user: mockAuthenticatedUser,
      } as any;
      const errorMessage = 'Email already exists';

      const updateSpy = jest.spyOn(usersService, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(
          userId,
          mockUpdateUserDto,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          mockRequest,
        ),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(
        userId,
        mockUpdateUserDto,
        mockAuthenticatedUser,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with UsersService', () => {
      expect(controller['usersService']).toBe(usersService);
    });

    it('should call service methods with correct parameters', async () => {
      // Test that controller passes parameters correctly to service
      const createSpy = jest.spyOn(usersService, 'create');
      const findAllSpy = jest.spyOn(usersService, 'findAll');
      const findOneSpy = jest.spyOn(usersService, 'findOne');

      await controller.create(mockCreateUserDto, authRequest);
      await controller.findAll({});
      await controller.findById(1, authRequest);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(findAllSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledTimes(1);
    });
  });
});
