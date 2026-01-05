//src/subscriptions/plan-applications/plan-applications.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PlanApplicationsController } from './plan-applications.controller';
import { PlanApplicationsService } from './plan-applications.service';
import { CreatePlanApplicationDto } from './dto/create-plan-application.dto';
import { UpdatePlanApplicationDto } from './dto/update-plan-application.dto';
import { OnePlanApplicationResponseDto } from './dto/summary-plan-applications.dto';
import { PaginatedPlanApplicationResponseDto } from './dto/paginated-plan-application-response.dto';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { ApplicationEntity } from '../applications/entity/application-entity';

describe('PlanApplicationsController', () => {
  let controller: PlanApplicationsController;
  let service: jest.Mocked<PlanApplicationsService>;

  const mockSubscriptionPlan: SubscriptionPlan = {
    id: 1,
    name: 'Basic Plan',
  } as SubscriptionPlan;

  const mockApplicationEntity: ApplicationEntity = {
    id: 1,
    name: 'My Application',
  } as ApplicationEntity;

  const mockPlanApplication = {
    id: 1,
    subscriptionPlanId: mockSubscriptionPlan.id,
    applicationId: mockApplicationEntity.id,
    limits: '100 users per month',
    status: 'active',
    subscriptionPlan: mockSubscriptionPlan,
    application: mockApplicationEntity,
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedPlanApplicationResponseDto = {
    statusCode: 200,
    message: 'Plan Applications retrieved successfully',
    data: [mockPlanApplication],
    pagination: mockPagination,
  };

  const mockCreatePlanApplicationDto: CreatePlanApplicationDto = {
    subscriptionPlan: 2,
    application: 3,
    limits: '100 users per month',
    status: 'active',
  };

  const mockUpdatePlanApplicationDto: UpdatePlanApplicationDto = {
    subscriptionPlan: 2,
    application: 3,
    limits: '200 users per month',
    status: 'inactive',
  };

  const mockOnePlanApplicationResponse: OnePlanApplicationResponseDto = {
    statusCode: 200,
    message: 'Plan Application retrieved successfully',
    data: mockPlanApplication,
  };

  beforeEach(async () => {
    const mockPlanApplicationService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanApplicationsController],
      providers: [
        {
          provide: PlanApplicationsService,
          useValue: mockPlanApplicationService,
        },
      ],
    }).compile();

    controller = module.get<PlanApplicationsController>(
      PlanApplicationsController,
    );
    service = module.get(PlanApplicationsService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have planApplicationService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /plan-applications
  // ----------------------------------------------------------
  describe('POST /plan-applications', () => {
    it('should create a plan application successfully', async () => {
      const createResponse: OnePlanApplicationResponseDto = {
        statusCode: 201,
        message: 'Plan Application created successfully',
        data: mockPlanApplication,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreatePlanApplicationDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreatePlanApplicationDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Plan Application';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreatePlanApplicationDto),
      ).rejects.toThrow(errorMessage);

      expect(createSpy).toHaveBeenCalledWith(mockCreatePlanApplicationDto);
    });
  });

  // ----------------------------------------------------------
  // GET /plan-applications
  // ----------------------------------------------------------
  describe('GET /plan-applications', () => {
    it('should retrieve all plan applications successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedPlanApplicationResponseDto = {
        statusCode: 200,
        message: 'Plan Applications retrieved successfully',
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
  // GET /plan-applications/:id
  // ----------------------------------------------------------
  describe('GET /plan-applications/:id', () => {
    it('should retrieve a plan application by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnePlanApplicationResponse);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOnePlanApplicationResponse);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Plan Application not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /plan-applications/:id
  // ----------------------------------------------------------
  describe('PATCH /plan-applications/:id', () => {
    it('should update a plan application successfully', async () => {
      const updateResponse: OnePlanApplicationResponseDto = {
        statusCode: 200,
        message: 'Plan Application updated successfully',
        data: mockPlanApplication,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdatePlanApplicationDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdatePlanApplicationDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Plan Application';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdatePlanApplicationDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdatePlanApplicationDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /plan-applications/:id
  // ----------------------------------------------------------
  describe('DELETE /plan-applications/:id', () => {
    it('should delete a plan application successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Plan Application deleted successfully',
        data: mockOnePlanApplicationResponse.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete Plan Application';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
