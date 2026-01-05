//src/subscriptions/subscription-plan/subscription-plan.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPlanController } from './subscription-plan.controller';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { OneSubscriptionPlanResponseDto } from './dto/subscription-plan-response.dto';
import { PaginatedSubscriptionPlanResponseDto } from './dto/paginated-subscription-plan-response.dto';

describe('SubscriptionPlanController', () => {
  let controller: SubscriptionPlanController;
  let subscriptionPlanService: jest.Mocked<SubscriptionPlanService>;

  // Mock data
  const mockSubscriptionPlan = {
    id: 1,
    name: 'Basic Plan',
    description: 'Includes basic features',
    price: 19.99,
    billingCycle: 'monthly',
    status: 'active',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedSubscriptionPlanResponseDto = {
    statusCode: 200,
    message: 'Subscription Plans retrieved successfully',
    data: [mockSubscriptionPlan],
    pagination: mockPagination,
  };

  const mockCreateSubscriptionPlanDto: CreateSubscriptionPlanDto = {
    name: 'New Plan',
    description: 'New plan description',
    price: 29.99,
    billingCycle: 'monthly',
    status: 'active',
  };

  const mockUpdateSubscriptionPlanDto: UpdateSubscriptionPlanDto = {
    name: 'Updated Plan',
    description: 'Updated plan description',
    price: 24.99,
    billingCycle: 'monthly',
    status: 'inactive',
  };

  const mockOneSubscriptionPlanResponse: OneSubscriptionPlanResponseDto = {
    statusCode: 200,
    message: 'Subscription Plan retrieved successfully',
    data: mockSubscriptionPlan,
  };

  beforeEach(async () => {
    const mockSubscriptionPlanService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionPlanController],
      providers: [
        {
          provide: SubscriptionPlanService,
          useValue: mockSubscriptionPlanService,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionPlanController>(
      SubscriptionPlanController,
    );
    subscriptionPlanService = module.get(SubscriptionPlanService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have subscriptionPlanService defined', () => {
      expect(subscriptionPlanService).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /subscription-plans
  // ----------------------------------------------------------
  describe('POST /subscription-plans', () => {
    it('should create a subscription plan successfully', async () => {
      const createResponse: OneSubscriptionPlanResponseDto = {
        statusCode: 201,
        message: 'Subscription Plan created successfully',
        data: mockSubscriptionPlan,
      };

      const createSpy = jest.spyOn(subscriptionPlanService, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateSubscriptionPlanDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateSubscriptionPlanDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Database error during creation';
      const createSpy = jest.spyOn(subscriptionPlanService, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreateSubscriptionPlanDto),
      ).rejects.toThrow(errorMessage);

      expect(createSpy).toHaveBeenCalledWith(mockCreateSubscriptionPlanDto);
    });
  });

  // ----------------------------------------------------------
  // GET /subscription-plans
  // ----------------------------------------------------------
  describe('GET /subscription-plans', () => {
    it('should return all subscription plans successfully', async () => {
      const findAllSpy = jest.spyOn(subscriptionPlanService, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({
        page: 0,
        limit: 0,
      });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 0, limit: 0 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyResponse: PaginatedSubscriptionPlanResponseDto = {
        statusCode: 200,
        message: 'Subscription Plans retrieved successfully',
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      const findAllSpy = jest.spyOn(subscriptionPlanService, 'findAll');
      findAllSpy.mockResolvedValue(emptyResponse);

      const result = await controller.findAll({
        page: 0,
        limit: 0,
      });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 0, limit: 0 });
      expect(result).toEqual(emptyResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle service errors in findAll', async () => {
      const errorMessage = 'Database connection failed';
      const findAllSpy = jest.spyOn(subscriptionPlanService, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.findAll({
          page: 0,
          limit: 0,
        }),
      ).rejects.toThrow(errorMessage);
      expect(findAllSpy).toHaveBeenCalledWith({ page: 0, limit: 0 });
    });
  });

  // ----------------------------------------------------------
  // GET /subscription-plans/:id
  // ----------------------------------------------------------
  describe('GET /subscription-plans/:id', () => {
    it('should return a subscription plan by ID successfully', async () => {
      const findOneSpy = jest.spyOn(subscriptionPlanService, 'findOne');
      findOneSpy.mockResolvedValue(mockOneSubscriptionPlanResponse);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneSubscriptionPlanResponse);
    });

    it('should handle not found subscription plan', async () => {
      const errorMessage = 'Subscription Plan not found';
      const findOneSpy = jest.spyOn(subscriptionPlanService, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);
      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /subscription-plans/:id
  // ----------------------------------------------------------
  describe('PATCH /subscription-plans/:id', () => {
    it('should update a subscription plan successfully', async () => {
      const updateResponse: OneSubscriptionPlanResponseDto = {
        statusCode: 200,
        message: 'Subscription Plan updated successfully',
        data: { ...mockSubscriptionPlan, ...mockUpdateSubscriptionPlanDto },
      };

      const updateSpy = jest.spyOn(subscriptionPlanService, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateSubscriptionPlanDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateSubscriptionPlanDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle update errors', async () => {
      const errorMessage = 'Subscription Plan not found';
      const updateSpy = jest.spyOn(subscriptionPlanService, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateSubscriptionPlanDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(
        999,
        mockUpdateSubscriptionPlanDto,
      );
    });
  });

  // ----------------------------------------------------------
  // DELETE /subscription-plans/:id
  // ----------------------------------------------------------
  describe('DELETE /subscription-plans/:id', () => {
    it('should delete a subscription plan successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Subscription Plan deleted successfully',
        data: mockOneSubscriptionPlanResponse.data,
      };

      const deleteSpy = jest.spyOn(subscriptionPlanService, 'remove');
      deleteSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(deleteSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle not found during deletion', async () => {
      const errorMessage = 'Subscription Plan not found';
      const deleteSpy = jest.spyOn(subscriptionPlanService, 'remove');
      deleteSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(deleteSpy).toHaveBeenCalledWith(999);
    });
  });
});
