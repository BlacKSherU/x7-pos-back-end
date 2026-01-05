//src/subscriptions/features/features.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { OneFeatureResponseDto } from './dto/feature-response.dto';
import { PaginatedFeatureResponseDto } from './dto/paginated-feature-response.dto';

describe('FeaturesController', () => {
  let controller: FeaturesController;
  let featuresService: jest.Mocked<FeaturesService>;

  // Mock data
  const mockFeature = {
    id: 1,
    name: 'Advanced Analytics',
    description: 'Provides advanced data analytics capabilities',
    Unit: 'unit',
    status: 'active',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedFeatureResponseDto = {
    statusCode: 200,
    message: 'Subscription Plans retrieved successfully',
    data: [mockFeature],
    pagination: mockPagination,
  };

  const mockCreateFeatureDto: CreateFeatureDto = {
    name: 'New Feature',
    description: 'New feature description',
    Unit: 'unit',
    status: 'active',
  };

  const mockUpdateFeatureDto: UpdateFeatureDto = {
    name: 'Updated Feature',
    description: 'Updated feature description',
    Unit: 'unit',
    status: 'inactive',
  };

  const mockOneFeatureResponse: OneFeatureResponseDto = {
    statusCode: 200,
    message: 'Feature retrieved successfully',
    data: mockFeature,
  };

  beforeEach(async () => {
    const mockFeatureService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeaturesController],
      providers: [
        {
          provide: FeaturesService,
          useValue: mockFeatureService,
        },
      ],
    }).compile();

    controller = module.get<FeaturesController>(FeaturesController);
    featuresService = module.get(FeaturesService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have featuresService defined', () => {
      expect(featuresService).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /features
  // ----------------------------------------------------------
  describe('POST /features', () => {
    it('should create a feature successfully', async () => {
      const createResponse: OneFeatureResponseDto = {
        statusCode: 201,
        message: 'feature created successfully',
        data: mockFeature,
      };

      const createSpy = jest.spyOn(featuresService, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateFeatureDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateFeatureDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Database error during creation';
      const createSpy = jest.spyOn(featuresService, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateFeatureDto)).rejects.toThrow(
        errorMessage,
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreateFeatureDto);
    });
  });

  // ----------------------------------------------------------
  // GET /features
  // ----------------------------------------------------------
  describe('GET /features', () => {
    it('should return all features successfully', async () => {
      const findAllSpy = jest.spyOn(featuresService, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({
        page: 0,
        limit: 0,
      });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 0, limit: 0 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyResponse: PaginatedFeatureResponseDto = {
        statusCode: 200,
        message: 'features retrieved successfully',
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      const findAllSpy = jest.spyOn(featuresService, 'findAll');
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
      const findAllSpy = jest.spyOn(featuresService, 'findAll');
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
  // GET /features/:id
  // ----------------------------------------------------------
  describe('GET /features/:id', () => {
    it('should return a feature by ID successfully', async () => {
      const findOneSpy = jest.spyOn(featuresService, 'findOne');
      findOneSpy.mockResolvedValue(mockOneFeatureResponse);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneFeatureResponse);
    });

    it('should handle not found subscription plan', async () => {
      const errorMessage = 'Subscription Plan not found';
      const findOneSpy = jest.spyOn(featuresService, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);
      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /features/:id
  // ----------------------------------------------------------
  describe('PATCH /subscription-plans/:id', () => {
    it('should update a subscription plan successfully', async () => {
      const updateResponse: OneFeatureResponseDto = {
        statusCode: 200,
        message: 'Subscription Plan updated successfully',
        data: {
          ...mockOneFeatureResponse,
          ...mockUpdateFeatureDto,
          id: 0,
        },
      };

      const updateSpy = jest.spyOn(featuresService, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateFeatureDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateFeatureDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle update errors', async () => {
      const errorMessage = 'Feature not found';
      const updateSpy = jest.spyOn(featuresService, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateFeatureDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdateFeatureDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /features/:id
  // ----------------------------------------------------------
  describe('DELETE /features/:id', () => {
    it('should delete a feature successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Feature deleted successfully',
        data: mockOneFeatureResponse.data,
      };

      const deleteSpy = jest.spyOn(featuresService, 'remove');
      deleteSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(deleteSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle not found during deletion', async () => {
      const errorMessage = 'Feature not found';
      const deleteSpy = jest.spyOn(featuresService, 'remove');
      deleteSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(deleteSpy).toHaveBeenCalledWith(999);
    });
  });
});
