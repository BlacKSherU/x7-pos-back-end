import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyRewardsRedemptionsController } from './loyalty-rewards-redemptions.controller';
import { LoyaltyRewardsRedemptionsService } from './loyalty-rewards-redemptions.service';
import { CreateLoyaltyRewardsRedemptionDto } from './dto/create-loyalty-rewards-redemption.dto';
import { UpdateLoyaltyRewardsRedemptionDto } from './dto/update-loyalty-rewards-redemption.dto';
import { GetLoyaltyRewardsRedemptionsQueryDto } from './dto/get-loyalty-rewards-redemptions-query.dto';
import {
  OneLoyaltyRewardsRedemptionResponse,
  LoyaltyRewardsRedemptionResponseDto,
} from './dto/loyalty-rewards-redemption-response.dto';
// cspell:ignore redemption
import { AllPaginatedLoyaltyRewardsRedemptionDto } from './dto/all-paginated-loyalty-rewards-redemption.dto';
import { LoyaltyRewardLittleResponseDto } from '../loyalty-reward/dto/loyalty-reward-response.dto';
import { OrderLittleResponseDto } from 'src/restaurant-operations/pos/orders/dto/order-response.dto';
import { LoyaltyCustomerLittleResponseDto } from '../loyalty-customer/dto/loyalty-customer-response.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

describe('LoyaltyRewardsRedemptionsController', () => {
  let controller: LoyaltyRewardsRedemptionsController;

  const mockLoyaltyRewardsRedemptionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRedemptionDto: LoyaltyRewardsRedemptionResponseDto = {
    id: 1,
    loyaltyCustomer: {
      id: 1,
      current_points: 100,
      lifetime_points: 500,
    } as LoyaltyCustomerLittleResponseDto,
    reward: {
      id: 1,
      name: 'Test Reward',
      description: 'Desc',
      cost_points: 50,
    } as LoyaltyRewardLittleResponseDto,
    order: { id: 101, businessStatus: null } as OrderLittleResponseDto,
    redeemed_points: 50,
    redeemed_at: new Date(),
  };

  const mockOneResponse: OneLoyaltyRewardsRedemptionResponse = {
    statusCode: 200,
    message: 'Success',
    data: mockRedemptionDto,
  };

  const mockUser = {
    merchant: { id: 1 },
  } as AuthenticatedUser;

  const merchantId = mockUser.merchant.id;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyRewardsRedemptionsController],
      providers: [
        {
          provide: LoyaltyRewardsRedemptionsService,
          useValue: mockLoyaltyRewardsRedemptionsService,
        },
      ],
    }).compile();

    controller = module.get<LoyaltyRewardsRedemptionsController>(
      LoyaltyRewardsRedemptionsController,
    );

    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a redemption', async () => {
      const dto: CreateLoyaltyRewardsRedemptionDto = {
        loyalty_customer_id: 1,
        reward_id: 1,
        order_id: 101,
      };

      mockLoyaltyRewardsRedemptionsService.create.mockResolvedValue(
        mockOneResponse,
      );

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockOneResponse);
      expect(mockLoyaltyRewardsRedemptionsService.create).toHaveBeenCalledWith(
        merchantId,
        dto,
      );
    });

    it('should handle service errors when creating a redemption', async () => {
      const dto: CreateLoyaltyRewardsRedemptionDto = {
        loyalty_customer_id: 1,
        reward_id: 1,
        order_id: 101,
      };
      mockLoyaltyRewardsRedemptionsService.create.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(controller.create(mockUser, dto)).rejects.toThrow(
        'Service Error',
      );
    });
  });

  describe('findAll', () => {
    const query: GetLoyaltyRewardsRedemptionsQueryDto = { page: 1, limit: 10 };

    it('should return paginated redemptions', async () => {
      const expectedResult: AllPaginatedLoyaltyRewardsRedemptionDto = {
        statusCode: 200,
        message: 'Success',
        data: [mockRedemptionDto],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockLoyaltyRewardsRedemptionsService.findAll.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyRewardsRedemptionsService.findAll).toHaveBeenCalledWith(
        query,
        merchantId,
      );
    });

    it('should handle service errors when finding all redemptions', async () => {
      mockLoyaltyRewardsRedemptionsService.findAll.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(controller.findAll(mockUser, query)).rejects.toThrow(
        'Service Error',
      );
    });
  });

  describe('findOne', () => {
    const id = 1;

    it('should return a single redemption', async () => {
      mockLoyaltyRewardsRedemptionsService.findOne.mockResolvedValue(
        mockOneResponse,
      );

      const result = await controller.findOne(mockUser, id);

      expect(result).toEqual(mockOneResponse);
      expect(mockLoyaltyRewardsRedemptionsService.findOne).toHaveBeenCalledWith(
        id,
        merchantId,
      );
    });

    it('should handle redemption not found', async () => {
      mockLoyaltyRewardsRedemptionsService.findOne.mockRejectedValue(
        new Error('Not Found'),
      );

      await expect(controller.findOne(mockUser, id)).rejects.toThrow(
        'Not Found',
      );
    });
  });

  describe('update', () => {
    const id = 1;
    const dto: UpdateLoyaltyRewardsRedemptionDto = { reward_id: 2 };

    it('should update a redemption', async () => {
      mockLoyaltyRewardsRedemptionsService.update.mockResolvedValue(
        mockOneResponse,
      );

      const result = await controller.update(mockUser, id, dto);

      expect(result).toEqual(mockOneResponse);
      expect(mockLoyaltyRewardsRedemptionsService.update).toHaveBeenCalledWith(
        id,
        merchantId,
        dto,
      );
    });

    it('should handle service errors when updating a redemption', async () => {
      mockLoyaltyRewardsRedemptionsService.update.mockRejectedValue(
        new Error('Update Failed'),
      );

      await expect(controller.update(mockUser, id, dto)).rejects.toThrow(
        'Update Failed',
      );
    });
  });

  describe('remove', () => {
    const id = 1;

    it('should remove a redemption', async () => {
      mockLoyaltyRewardsRedemptionsService.remove.mockResolvedValue(
        mockOneResponse,
      );

      const result = await controller.remove(mockUser, id);

      expect(result).toEqual(mockOneResponse);
      expect(mockLoyaltyRewardsRedemptionsService.remove).toHaveBeenCalledWith(
        id,
        merchantId,
      );
    });

    it('should handle service errors when removing a redemption', async () => {
      mockLoyaltyRewardsRedemptionsService.remove.mockRejectedValue(
        new Error('Delete Failed'),
      );

      await expect(controller.remove(mockUser, id)).rejects.toThrow(
        'Delete Failed',
      );
    });
  });

  describe('Service Integration', () => {
    it('should call service methods with correct parameters', async () => {
      const id = 1;
      const updateDto: UpdateLoyaltyRewardsRedemptionDto = { reward_id: 2 };
      const query: GetLoyaltyRewardsRedemptionsQueryDto = {
        page: 1,
        limit: 10,
      };

      const createDto: CreateLoyaltyRewardsRedemptionDto = {
        loyalty_customer_id: 1,
        reward_id: 1,
        order_id: 101,
      };

      mockLoyaltyRewardsRedemptionsService.create.mockResolvedValue({});
      mockLoyaltyRewardsRedemptionsService.findAll.mockResolvedValue({});
      mockLoyaltyRewardsRedemptionsService.findOne.mockResolvedValue({});
      mockLoyaltyRewardsRedemptionsService.update.mockResolvedValue({});
      mockLoyaltyRewardsRedemptionsService.remove.mockResolvedValue({});

      await controller.create(mockUser, createDto);
      await controller.findAll(mockUser, query);
      await controller.findOne(mockUser, id);
      await controller.update(mockUser, id, updateDto);
      await controller.remove(mockUser, id);

      expect(mockLoyaltyRewardsRedemptionsService.create).toHaveBeenCalledWith(
        merchantId,
        createDto,
      );
      expect(mockLoyaltyRewardsRedemptionsService.findAll).toHaveBeenCalledWith(
        query,
        merchantId,
      );
      expect(mockLoyaltyRewardsRedemptionsService.findOne).toHaveBeenCalledWith(
        id,
        merchantId,
      );
      expect(mockLoyaltyRewardsRedemptionsService.update).toHaveBeenCalledWith(
        id,
        merchantId,
        updateDto,
      );
      expect(mockLoyaltyRewardsRedemptionsService.remove).toHaveBeenCalledWith(
        id,
        merchantId,
      );
    });
  });
});
