import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyProgramsController } from './loyalty-programs.controller';
import { LoyaltyProgramsService } from './loyalty-programs.service';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { GetLoyaltyProgramsQueryDto } from './dto/get-loyalty-programs-query.dto';
import { AllPaginatedLoyaltyPrograms } from './dto/all-paginated-loyalty-programs.dto';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';
import { UpdateLoyaltyProgramDto } from './dto/update-loyalty-program.dto';

describe('LoyaltyProgramsController', () => {
  let controller: LoyaltyProgramsController;
  let user: AuthenticatedUser;

  const mockLoyaltyProgramsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyProgramsController],
      providers: [
        {
          provide: LoyaltyProgramsService,
          useValue: mockLoyaltyProgramsService,
        },
      ],
    }).compile();

    controller = module.get<LoyaltyProgramsController>(
      LoyaltyProgramsController,
    );
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of loyalty programs', async () => {
      const query: GetLoyaltyProgramsQueryDto = {
        page: 1,
        limit: 10,
        name: 'Test',
      };
      const expectedResult: AllPaginatedLoyaltyPrograms = {
        statusCode: 200,
        message: 'Loyalty programs retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockLoyaltyProgramsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyProgramsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty loyalty program list', async () => {
      const query: GetLoyaltyProgramsQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedLoyaltyPrograms = {
        statusCode: 200,
        message: 'Loyalty programs retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockLoyaltyProgramsService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockLoyaltyProgramsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single loyalty program', async () => {
      const loyaltyProgramId = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Loyalty Program retrieved successfully',
        data: {
          id: loyaltyProgramId,
          name: 'Test Loyalty Program',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockLoyaltyProgramsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, loyaltyProgramId);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyProgramsService.findOne).toHaveBeenCalledWith(
        loyaltyProgramId,
        user.merchant.id,
      );
    });

    it('should handle loyalty program not found', async () => {
      const loyaltyProgramId = 999;
      const errorMessage = 'Loyalty Program not found';
      mockLoyaltyProgramsService.findOne.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.findOne(user, loyaltyProgramId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLoyaltyProgramsService.findOne).toHaveBeenCalledWith(
        loyaltyProgramId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create a loyalty program', async () => {
      const createLoyaltyProgramDto: CreateLoyaltyProgramDto = {
        name: 'New Loyalty Program',
        description: 'Test Description',
        points_per_currency: 1,
        min_points_to_redeem: 100,
      };
      const expectedResult = {
        statusCode: 201,
        message: 'Loyalty Program Created successfully',
        data: {
          id: 10,
          name: 'New Loyalty Program',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockLoyaltyProgramsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createLoyaltyProgramDto);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyProgramsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createLoyaltyProgramDto,
      );
    });

    it('should handle loyalty program name already exists', async () => {
      const createLoyaltyProgramDto: CreateLoyaltyProgramDto = {
        name: 'Existing Loyalty Program',
        description: 'Test Description',
        points_per_currency: 1,
        min_points_to_redeem: 100,
      };
      const errorMessage = 'Loyalty Program name already exists';
      mockLoyaltyProgramsService.create.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.create(user, createLoyaltyProgramDto),
      ).rejects.toThrow(errorMessage);
      expect(mockLoyaltyProgramsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createLoyaltyProgramDto,
      );
    });
  });

  describe('Update', () => {
    it('should update a loyalty program', async () => {
      const loyaltyProgramId = 1;
      const updateLoyaltyProgramDto: UpdateLoyaltyProgramDto = {
        name: 'Updated Loyalty Program',
      };
      const expectedResult = {
        statusCode: 200,
        message: 'Loyalty Program Updated successfully',
        data: {
          id: loyaltyProgramId,
          name: 'Updated Loyalty Program',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockLoyaltyProgramsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        user,
        loyaltyProgramId,
        updateLoyaltyProgramDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyProgramsService.update).toHaveBeenCalledWith(
        loyaltyProgramId,
        user.merchant.id,
        updateLoyaltyProgramDto,
      );
    });

    it('should handle loyalty program not found during update', async () => {
      const loyaltyProgramId = 999;
      const updateLoyaltyProgramDto: UpdateLoyaltyProgramDto = {
        name: 'Non Existent',
      };
      const errorMessage = 'Loyalty Program not found';
      mockLoyaltyProgramsService.update.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.update(user, loyaltyProgramId, updateLoyaltyProgramDto),
      ).rejects.toThrow(errorMessage);
      expect(mockLoyaltyProgramsService.update).toHaveBeenCalledWith(
        loyaltyProgramId,
        user.merchant.id,
        updateLoyaltyProgramDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a loyalty program', async () => {
      const loyaltyProgramId = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Loyalty Program Deleted successfully',
        data: {
          id: loyaltyProgramId,
          name: 'Deleted Loyalty Program',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockLoyaltyProgramsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, loyaltyProgramId);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyProgramsService.remove).toHaveBeenCalledWith(
        loyaltyProgramId,
        user.merchant.id,
      );
    });

    it('should handle loyalty program not found during removal', async () => {
      const loyaltyProgramId = 999;
      const errorMessage = 'Loyalty Program not found';
      mockLoyaltyProgramsService.remove.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.remove(user, loyaltyProgramId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLoyaltyProgramsService.remove).toHaveBeenCalledWith(
        loyaltyProgramId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with LoyaltyProgramsService', () => {
      expect(controller['loyaltyProgramsService']).toBe(
        mockLoyaltyProgramsService,
      );
    });

    it('should call service methods with correct parameters', async () => {
      const createLoyaltyProgramDto: CreateLoyaltyProgramDto = {
        name: 'Integration Test',
        description: 'Test',
        points_per_currency: 1,
        min_points_to_redeem: 10,
      };
      const updateLoyaltyProgramDto: UpdateLoyaltyProgramDto = {
        name: 'Updated Integration Test',
      };
      const loyaltyProgramId = 1;
      const query: GetLoyaltyProgramsQueryDto = { page: 1, limit: 10 };

      mockLoyaltyProgramsService.create.mockResolvedValue({});
      mockLoyaltyProgramsService.findAll.mockResolvedValue({});
      mockLoyaltyProgramsService.findOne.mockResolvedValue({});
      mockLoyaltyProgramsService.update.mockResolvedValue({});
      mockLoyaltyProgramsService.remove.mockResolvedValue({});

      await controller.create(user, createLoyaltyProgramDto);
      await controller.findAll(user, query);
      await controller.findOne(user, loyaltyProgramId);
      await controller.update(user, loyaltyProgramId, updateLoyaltyProgramDto);
      await controller.remove(user, loyaltyProgramId);

      expect(mockLoyaltyProgramsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createLoyaltyProgramDto,
      );
      expect(mockLoyaltyProgramsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockLoyaltyProgramsService.findOne).toHaveBeenCalledWith(
        loyaltyProgramId,
        user.merchant.id,
      );
      expect(mockLoyaltyProgramsService.update).toHaveBeenCalledWith(
        loyaltyProgramId,
        user.merchant.id,
        updateLoyaltyProgramDto,
      );
      expect(mockLoyaltyProgramsService.remove).toHaveBeenCalledWith(
        loyaltyProgramId,
        user.merchant.id,
      );
    });
  });
});
