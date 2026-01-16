import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyTierController } from './loyalty-tier.controller';
import { LoyaltyTierService } from './loyalty-tier.service';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { AllPaginatedLoyaltyTierDto } from './dto/all-paginated-loyalty-tier.dto';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { CreateLoyaltyTierDto } from './dto/create-loyalty-tier.dto';
import { UpdateLoyaltyTierDto } from './dto/update-loyalty-tier.dto';
import { LoyaltyTierBenefit } from './constants/loyalty-tier-benefit.enum';
import { GetLoyaltyTiersQueryDto } from './dto/get-loyalty-tiers-query.dto';

describe('LoyaltyTierController', () => {
  let controller: LoyaltyTierController;
  let user: AuthenticatedUser;

  const mockLoyaltyTierService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyTierController],
      providers: [
        {
          provide: LoyaltyTierService,
          useValue: mockLoyaltyTierService,
        },
      ],
    }).compile();

    controller = module.get<LoyaltyTierController>(LoyaltyTierController);
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
    it('should return a paginated list of loyalty tiers', async () => {
      const query: GetLoyaltyTiersQueryDto = {
        page: 1,
        limit: 10,
        name: 'Gold',
      };
      const expectedResult: AllPaginatedLoyaltyTierDto = {
        statusCode: 200,
        message: 'Loyalty tiers retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockLoyaltyTierService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyTierService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty loyalty tier list', async () => {
      const query: GetLoyaltyTiersQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedLoyaltyTierDto = {
        statusCode: 200,
        message: 'Loyalty tiers retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockLoyaltyTierService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockLoyaltyTierService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single loyalty tier', async () => {
      const tierId = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Loyalty Tier retrieved successfully',
        data: { id: tierId, name: 'Gold' },
      };

      mockLoyaltyTierService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, tierId);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyTierService.findOne).toHaveBeenCalledWith(
        tierId,
        user.merchant.id,
      );
    });

    it('should handle loyalty tier not found', async () => {
      const tierId = 999;
      const errorMessage = 'Loyalty Tier not found';
      mockLoyaltyTierService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(user, tierId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLoyaltyTierService.findOne).toHaveBeenCalledWith(
        tierId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create a loyalty tier', async () => {
      const createDto: CreateLoyaltyTierDto = {
        loyalty_program_id: 1,
        name: 'Gold',
        level: 1,
        min_points: 1000,
        multiplier: 1.5,
        benefits: [LoyaltyTierBenefit.DISCOUNT],
      };
      const expectedResult = {
        statusCode: 201,
        message: 'Loyalty Tier Created successfully',
        data: { id: 1, ...createDto },
      };

      mockLoyaltyTierService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createDto);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyTierService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
    });

    it('should handle loyalty tier name already exists', async () => {
      const createDto: CreateLoyaltyTierDto = {
        loyalty_program_id: 1,
        name: 'Gold',
        level: 1,
        min_points: 1000,
        multiplier: 1.5,
      };
      const errorMessage = 'Loyalty Tier name already exists';
      mockLoyaltyTierService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(user, createDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLoyaltyTierService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
    });
  });

  describe('Update', () => {
    it('should update a loyalty tier', async () => {
      const tierId = 1;
      const updateDto: UpdateLoyaltyTierDto = { name: 'Platinum' };
      const expectedResult = {
        statusCode: 200,
        message: 'Loyalty Tier Updated successfully',
        data: { id: tierId, name: 'Platinum' },
      };

      mockLoyaltyTierService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(user, tierId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyTierService.update).toHaveBeenCalledWith(
        tierId,
        user.merchant.id,
        updateDto,
      );
    });

    it('should handle loyalty tier not found during update', async () => {
      const tierId = 999;
      const updateDto: UpdateLoyaltyTierDto = { name: 'Non Existent' };
      const errorMessage = 'Loyalty Tier not found';
      mockLoyaltyTierService.update.mockRejectedValue(new Error(errorMessage));

      await expect(controller.update(user, tierId, updateDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLoyaltyTierService.update).toHaveBeenCalledWith(
        tierId,
        user.merchant.id,
        updateDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a loyalty tier', async () => {
      const tierId = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Loyalty Tier Deleted successfully',
        data: { id: tierId, name: 'Deleted Tier' },
      };

      mockLoyaltyTierService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, tierId);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyTierService.remove).toHaveBeenCalledWith(
        tierId,
        user.merchant.id,
      );
    });

    it('should handle loyalty tier not found during removal', async () => {
      const tierId = 999;
      const errorMessage = 'Loyalty Tier not found';
      mockLoyaltyTierService.remove.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(user, tierId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLoyaltyTierService.remove).toHaveBeenCalledWith(
        tierId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with LoyaltyTierService', () => {
      expect(controller['loyaltyTierService']).toBe(mockLoyaltyTierService);
    });

    it('should call service methods with correct parameters', async () => {
      const createDto: CreateLoyaltyTierDto = {
        loyalty_program_id: 1,
        name: 'Integration Test',
        level: 1,
        min_points: 0,
        multiplier: 1,
      };
      const updateDto: UpdateLoyaltyTierDto = {
        name: 'Updated Integration Test',
      };
      const tierId = 1;
      const query: GetLoyaltyTiersQueryDto = { page: 1, limit: 10 };

      mockLoyaltyTierService.create.mockResolvedValue({});
      mockLoyaltyTierService.findAll.mockResolvedValue({});
      mockLoyaltyTierService.findOne.mockResolvedValue({});
      mockLoyaltyTierService.update.mockResolvedValue({});
      mockLoyaltyTierService.remove.mockResolvedValue({});

      await controller.create(user, createDto);
      await controller.findAll(user, query);
      await controller.findOne(user, tierId);
      await controller.update(user, tierId, updateDto);
      await controller.remove(user, tierId);

      expect(mockLoyaltyTierService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
      expect(mockLoyaltyTierService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockLoyaltyTierService.findOne).toHaveBeenCalledWith(
        tierId,
        user.merchant.id,
      );
      expect(mockLoyaltyTierService.update).toHaveBeenCalledWith(
        tierId,
        user.merchant.id,
        updateDto,
      );
      expect(mockLoyaltyTierService.remove).toHaveBeenCalledWith(
        tierId,
        user.merchant.id,
      );
    });
  });
});
