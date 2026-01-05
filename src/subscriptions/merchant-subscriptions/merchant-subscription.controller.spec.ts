//src/subscriptions/merchant-subscription/merchant-subscription.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MerchantSubscriptionController } from './merchant-subscription.controller';
import { MerchantSubscriptionService } from './merchant-subscription.service';
import { CreateMerchantSubscriptionDto } from './dtos/create-merchant-subscription.dto';
import { UpdateMerchantSubscriptionDto } from './dtos/update-merchant-subscription.dto';
import { OneMerchantSubscriptionSummaryDto } from './dtos/merchant-subscription-summary.dto';
import { PaginatedMerchantSuscriptionResponseDto } from './dtos/paginated-merchant-subscription-response.dto';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';

describe('MerchantSubscriptionController', () => {
  let controller: MerchantSubscriptionController;
  let merchantSubscriptionService: jest.Mocked<MerchantSubscriptionService>;

  // Mock data
  const mockMerchant: Merchant = {
    id: 1,
    name: 'Test Merchant',
  } as Merchant;

  const mockPlan: SubscriptionPlan = {
    id: 1,
    name: 'Basic Plan',
  } as SubscriptionPlan;

  const mockMerchantSubscription = {
    id: 1,
    merchantId: mockMerchant.id,
    planId: mockPlan.id,
    startDate: new Date(),
    endDate: new Date(),
    renewalDate: new Date(),
    status: 'active',
    paymentMethod: 'credit_card',
    merchant: mockMerchant,
    plan: mockPlan,
    createdAt: new Date(),
    updatedAt: new Date(),
    orders: [],
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedMerchantSuscriptionResponseDto = {
    statusCode: 200,
    message: 'Merchant Subscriptions retrieved successfully',
    data: [mockMerchantSubscription],
    pagination: mockPagination,
  };

  const mockCreateMerchantSubscriptionDto: CreateMerchantSubscriptionDto = {
    merchantId: 2,
    planId: 3,
    startDate: new Date(),
    endDate: new Date(),
    status: 'active',
    paymentMethod: 'credit_card',
  };

  const mockUpdateMerchantSubscriptionDto: UpdateMerchantSubscriptionDto = {
    planId: 4,
    endDate: new Date(),
    status: 'inactive',
    paymentMethod: 'credit_card',
    merchantId: 0,
    startDate: new Date(),
  };

  const mockOneMerchantSubscriptionSummaryDto: OneMerchantSubscriptionSummaryDto =
    {
      statusCode: 200,
      message: 'Merchant Subscription retrieved successfully',
      data: mockMerchantSubscription,
    };

  beforeEach(async () => {
    const mockMerchantSubscriptionService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantSubscriptionController],
      providers: [
        {
          provide: MerchantSubscriptionService,
          useValue: mockMerchantSubscriptionService,
        },
      ],
    }).compile();

    controller = module.get<MerchantSubscriptionController>(
      MerchantSubscriptionController,
    );
    merchantSubscriptionService = module.get(MerchantSubscriptionService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have merchantSubscriptionService defined', () => {
      expect(merchantSubscriptionService).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /merchant-subscriptions
  // ----------------------------------------------------------
  describe('POST /merchant-subscriptions', () => {
    it('should create a merchant subscription successfully', async () => {
      const createResponse: OneMerchantSubscriptionSummaryDto = {
        statusCode: 201,
        message: 'Merchant Subscription created successfully',
        data: mockMerchantSubscription,
      };

      const createSpy = jest.spyOn(merchantSubscriptionService, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateMerchantSubscriptionDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateMerchantSubscriptionDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Merchant Subscription';
      const createSpy = jest.spyOn(merchantSubscriptionService, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreateMerchantSubscriptionDto),
      ).rejects.toThrow(errorMessage);

      expect(createSpy).toHaveBeenCalledWith(mockCreateMerchantSubscriptionDto);
    });
  });

  // ----------------------------------------------------------
  // GET /merchant-subscriptions
  // ----------------------------------------------------------
  describe('GET /merchant-subscriptions', () => {
    it('should retrieve all merchant subscriptions successfully', async () => {
      const findAllSpy = jest.spyOn(merchantSubscriptionService, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedMerchantSuscriptionResponseDto = {
        statusCode: 200,
        message: 'Merchant Subscriptions retrieved successfully',
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      const findAllSpy = jest.spyOn(merchantSubscriptionService, 'findAll');
      findAllSpy.mockResolvedValue(emptyPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(emptyPaginatedResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle service errors in findAll', async () => {
      const errorMessage = 'Database error during retrieval';
      const findAllSpy = jest.spyOn(merchantSubscriptionService, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        errorMessage,
      );

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  // ----------------------------------------------------------
  // GET /merchant-subscriptions/:id
  // ----------------------------------------------------------
  describe('GET /merchant-subscriptions/:id', () => {
    it('should retrieve a merchant subscription by ID successfully', async () => {
      const findOneSpy = jest.spyOn(merchantSubscriptionService, 'findOne');
      findOneSpy.mockResolvedValue(mockOneMerchantSubscriptionSummaryDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneMerchantSubscriptionSummaryDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Merchant Subscription not found';
      const findOneSpy = jest.spyOn(merchantSubscriptionService, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /merchant-subscriptions/:id
  // ----------------------------------------------------------
  describe('PATCH /merchant-subscriptions/:id', () => {
    it('should update a merchant subscription successfully', async () => {
      const updateResponse: OneMerchantSubscriptionSummaryDto = {
        statusCode: 200,
        message: 'Merchant Subscription updated successfully',
        data: mockMerchantSubscription,
      };

      const updateSpy = jest.spyOn(merchantSubscriptionService, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(
        1,
        mockUpdateMerchantSubscriptionDto,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        mockUpdateMerchantSubscriptionDto,
      );
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Merchant Subscription';
      const updateSpy = jest.spyOn(merchantSubscriptionService, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateMerchantSubscriptionDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(
        999,
        mockUpdateMerchantSubscriptionDto,
      );
    });
  });

  // ----------------------------------------------------------
  // DELETE /merchant-subscriptions/:id
  // ----------------------------------------------------------
  describe('DELETE /merchant-subscriptions/:id', () => {
    it('should delete a merchant subscription successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Merchant Subscription deleted successfully',
        data: mockOneMerchantSubscriptionSummaryDto.data,
      };
      const removeSpy = jest.spyOn(merchantSubscriptionService, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete Merchant Subscription';
      const removeSpy = jest.spyOn(merchantSubscriptionService, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
