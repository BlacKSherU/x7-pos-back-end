//src/subscriptions/plan-features/plan-features.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PlanFeaturesController } from './plan-features.controller';
import { PlanFeaturesService } from './plan-features.service';
import { CreatePlanFeatureDto } from './dto/create-plan-feature.dto';
import { UpdatePlanFeatureDto } from './dto/update-plan-features.dto';
import { OnePlanFeatureResponseDto } from './dto/plan-feature-response.dto';
import { PaginatedPlanFeatureResponseDto } from './dto/paginated-plan-feature-response.dto';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { FeatureEntity } from '../features/entity/features.entity';

describe('PlanFeaturesController', () => {
  let controller: PlanFeaturesController;
  let service: jest.Mocked<PlanFeaturesService>;

  // Mock data
  const mockSubscriptionPlan: SubscriptionPlan = {
    id: 1,
    name: 'Basic Plan',
  } as SubscriptionPlan;

  const mockFeatureEntity: FeatureEntity = {
    id: 1,
    name: 'My Feature',
  } as FeatureEntity;

  const mockPlanFeature = {
    id: 1,
    subscriptionPlanId: mockSubscriptionPlan.id,
    featureId: mockFeatureEntity.id,
    limit_value: 1000,
    status: 'active',
    subscriptionPlan: mockSubscriptionPlan,
    feature: mockFeatureEntity,
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedPlanFeatureResponseDto = {
    statusCode: 200,
    message: 'Plan Features retrieved successfully',
    data: [mockPlanFeature],
    pagination: mockPagination,
  };

  const mockCreatePlanFeatureDto: CreatePlanFeatureDto = {
    subscriptionPlan: 2,
    feature: 3,
    limit_value: 500,
    status: 'active',
  };

  const mockUpdatePlanFeatureDto: UpdatePlanFeatureDto = {
    subscriptionPlan: 2,
    feature: 3,
    limit_value: 1500,
    status: 'inactive',
  };

  const mockOnePlanFeatureResponse: OnePlanFeatureResponseDto = {
    statusCode: 200,
    message: 'Plan Feature retrieved successfully',
    data: mockPlanFeature,
  };

  beforeEach(async () => {
    const mockPlanFeatureService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanFeaturesController],
      providers: [
        {
          provide: PlanFeaturesService,
          useValue: mockPlanFeatureService,
        },
      ],
    }).compile();

    controller = module.get<PlanFeaturesController>(PlanFeaturesController);
    service = module.get(PlanFeaturesService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have planFeatureService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /plan-features
  // ----------------------------------------------------------
  describe('POST /plan-features', () => {
    it('should create a plan feature successfully', async () => {
      const createResponse: OnePlanFeatureResponseDto = {
        statusCode: 201,
        message: 'Plan Feature created successfully',
        data: mockPlanFeature,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreatePlanFeatureDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreatePlanFeatureDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Plan Feature';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreatePlanFeatureDto)).rejects.toThrow(
        errorMessage,
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreatePlanFeatureDto);
    });
  });

  // ----------------------------------------------------------
  // GET /plan-features
  // ----------------------------------------------------------
  describe('GET /plan-features', () => {
    it('should retrieve all plan features successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedPlanFeatureResponseDto = {
        statusCode: 200,
        message: 'plan Features retrieved successfully',
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(emptyPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(emptyPaginatedResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle service errors in findAll', async () => {
      const errorMessage = 'Database error during retrieval';
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        errorMessage,
      );

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  // ----------------------------------------------------------
  // GET /plan-features/:id
  // ----------------------------------------------------------
  describe('GET /plan-features/:id', () => {
    it('should retrieve a plan feature by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnePlanFeatureResponse);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOnePlanFeatureResponse);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Plan Feature not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /plan-features/:id
  // ----------------------------------------------------------
  describe('PATCH /plan-features/:id', () => {
    it('should update a plan feature successfully', async () => {
      const updateResponse: OnePlanFeatureResponseDto = {
        statusCode: 200,
        message: 'Plan Feature updated successfully',
        data: mockPlanFeature,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdatePlanFeatureDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdatePlanFeatureDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Plan Feature';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdatePlanFeatureDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdatePlanFeatureDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /plan-features/:id
  // ----------------------------------------------------------
  describe('DELETE /plan-features/:id', () => {
    it('should delete a plan feature successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Plan Application deleted successfully',
        data: mockOnePlanFeatureResponse.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete Plan FEature';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
