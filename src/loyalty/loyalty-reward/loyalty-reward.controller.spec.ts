import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyRewardController } from './loyalty-reward.controller';
import { LoyaltyRewardService } from './loyalty-reward.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { LoyaltyRewardType } from './constants/loyalty-reward-type.enum';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';
import { GetLoyaltyRewardQueryDto } from './dto/get-loyalty-reward-query.dto';
import {
  OneLoyaltyRewardResponse,
  LoyaltyRewardResponseDto,
} from './dto/loyalty-reward-response.dto';
import { AllPaginatedLoyaltyRewardDto } from './dto/all-paginated-loyalty-reward.dto';

describe('LoyaltyRewardController', () => {
  let controller: LoyaltyRewardController;
  let user: AuthenticatedUser;

  const mockLoyaltyRewardService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockLoyaltyReward: LoyaltyRewardResponseDto = {
    id: 1,
    name: 'Test Reward',
    type: LoyaltyRewardType.CASHBACK,
    description: 'Test Description',
    cost_points: 100,
    discount_value: 0,
    cashback_value: 5,
    loyalty_program: { id: 1, name: 'Test Program' },
    free_product: { id: 0, name: '' },
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyRewardController],
      providers: [
        {
          provide: LoyaltyRewardService,
          useValue: mockLoyaltyRewardService,
        },
      ],
    }).compile();

    controller = module.get<LoyaltyRewardController>(LoyaltyRewardController);
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };

    jest.resetAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('Create', () => {
    const dto: CreateLoyaltyRewardDto = {
      loyalty_program_id: 1,
      name: 'New Reward',
      type: LoyaltyRewardType.CASHBACK,
      cost_points: 100,
      cashback_value: 5,
      description: 'New Description',
      discount_value: 0,
      free_product_id: 0,
    };

    it('should create a loyalty reward', async () => {
      const expectedResult: OneLoyaltyRewardResponse = {
        statusCode: 201,
        message: 'Loyalty Reward Created successfully',
        data: mockLoyaltyReward,
      };

      mockLoyaltyRewardService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, dto);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyRewardService.create).toHaveBeenCalledWith(
        user.merchant.id,
        dto,
      );
    });

    it('should handle service errors when creating a reward', async () => {
      mockLoyaltyRewardService.create.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(controller.create(user, dto)).rejects.toThrow(
        'Service Error',
      );
    });
  });

  describe('FindAll', () => {
    const query: GetLoyaltyRewardQueryDto = { page: 1, limit: 10 };

    it('should return paginated rewards', async () => {
      const expectedResult: AllPaginatedLoyaltyRewardDto = {
        statusCode: 200,
        message: 'Loyalty rewards retrieved successfully',
        data: [mockLoyaltyReward],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockLoyaltyRewardService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyRewardService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle service errors when finding all rewards', async () => {
      mockLoyaltyRewardService.findAll.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(controller.findAll(user, query)).rejects.toThrow(
        'Service Error',
      );
    });
  });

  describe('FindOne', () => {
    const id = 1;

    it('should return a single reward', async () => {
      const expectedResult: OneLoyaltyRewardResponse = {
        statusCode: 200,
        message: 'Loyalty Reward retrieved successfully',
        data: mockLoyaltyReward,
      };

      mockLoyaltyRewardService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, id);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyRewardService.findOne).toHaveBeenCalledWith(
        id,
        user.merchant.id,
      );
    });

    it('should handle reward not found', async () => {
      mockLoyaltyRewardService.findOne.mockRejectedValue(
        new Error('Not Found'),
      );

      await expect(controller.findOne(user, id)).rejects.toThrow('Not Found');
    });
  });

  describe('Update', () => {
    const id = 1;
    const dto: UpdateLoyaltyRewardDto = { name: 'Updated Name' };

    it('should update a reward', async () => {
      const expectedResult: OneLoyaltyRewardResponse = {
        statusCode: 201,
        message: 'Loyalty Reward Updated successfully',
        data: { ...mockLoyaltyReward, name: 'Updated Name' },
      };

      mockLoyaltyRewardService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(user, id, dto);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyRewardService.update).toHaveBeenCalledWith(
        id,
        user.merchant.id,
        dto,
      );
    });

    it('should handle service errors when updating a reward', async () => {
      mockLoyaltyRewardService.update.mockRejectedValue(
        new Error('Update Failed'),
      );

      await expect(controller.update(user, id, dto)).rejects.toThrow(
        'Update Failed',
      );
    });
  });

  describe('Remove', () => {
    const id = 1;

    it('should remove a reward', async () => {
      const expectedResult: OneLoyaltyRewardResponse = {
        statusCode: 201,
        message: 'Loyalty Reward Deleted successfully',
        data: mockLoyaltyReward,
      };

      mockLoyaltyRewardService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, id);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyRewardService.remove).toHaveBeenCalledWith(
        id,
        user.merchant.id,
      );
    });

    it('should handle service errors when removing a reward', async () => {
      mockLoyaltyRewardService.remove.mockRejectedValue(
        new Error('Delete Failed'),
      );

      await expect(controller.remove(user, id)).rejects.toThrow(
        'Delete Failed',
      );
    });
  });

  describe('Service Integration', () => {
    it('should call service methods with correct parameters', async () => {
      const id = 1;
      const createDto: CreateLoyaltyRewardDto = {
        loyalty_program_id: 1,
        name: 'New Reward',
        type: LoyaltyRewardType.CASHBACK,
        cost_points: 100,
        cashback_value: 5,
        description: 'New Description',
        discount_value: 0,
        free_product_id: 0,
      };
      const updateDto: UpdateLoyaltyRewardDto = { name: 'Updated Name' };
      const query: GetLoyaltyRewardQueryDto = { page: 1, limit: 10 };

      mockLoyaltyRewardService.create.mockResolvedValue({});
      mockLoyaltyRewardService.findAll.mockResolvedValue({});
      mockLoyaltyRewardService.findOne.mockResolvedValue({});
      mockLoyaltyRewardService.update.mockResolvedValue({});
      mockLoyaltyRewardService.remove.mockResolvedValue({});

      await controller.create(user, createDto);
      await controller.findAll(user, query);
      await controller.findOne(user, id);
      await controller.update(user, id, updateDto);
      await controller.remove(user, id);

      expect(mockLoyaltyRewardService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
      expect(mockLoyaltyRewardService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockLoyaltyRewardService.findOne).toHaveBeenCalledWith(
        id,
        user.merchant.id,
      );
      expect(mockLoyaltyRewardService.update).toHaveBeenCalledWith(
        id,
        user.merchant.id,
        updateDto,
      );
      expect(mockLoyaltyRewardService.remove).toHaveBeenCalledWith(
        id,
        user.merchant.id,
      );
    });
  });
});
