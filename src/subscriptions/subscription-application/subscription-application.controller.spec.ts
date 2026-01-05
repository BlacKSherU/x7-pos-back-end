//src/subscriptions/subscription-application/subscription-application.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionApplicationController } from './subscription-application.controller';
import { SubscriptionApplicationService } from './subscription-application.service';
import { CreateSubscriptionApplicationDto } from './dto/create-subscription-application.dto';
import { UpdateSubscriptionApplicationDto } from './dto/update-subscription-application.dto';
import { OneSubscriptionApplicationResponseDto } from './dto/subscription-application-response.dto';
import { PaginatedSubscriptionApplicationResponseDto } from './dto/paginated-subscription-application-response.dto';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';
import { ApplicationEntity } from '../applications/entity/application-entity';

describe('SubscriptionApplicationController', () => {
  let controller: SubscriptionApplicationController;
  let service: jest.Mocked<SubscriptionApplicationService>;

  const mockMerchantSubscription: MerchantSubscription = {
    id: 1,
  } as MerchantSubscription;

  const mockApplication: ApplicationEntity = {
    id: 1,
    name: 'My Application',
  } as ApplicationEntity;

  const mockSubscriptionApplication = {
    id: 1,
    merchantSubscriptionId: mockMerchantSubscription.id,
    applicationId: mockApplication.id,
    status: 'active',
    merchantSubscription: mockMerchantSubscription,
    application: mockApplication,
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedSubscriptionApplicationResponseDto = {
    statusCode: 200,
    message: 'Subscription Applications retrieved successfully',
    data: [mockSubscriptionApplication],
    pagination: mockPagination,
  };

  const mockCreateSubscriptionApplicationDto: CreateSubscriptionApplicationDto =
    {
      merchantSubscriptionId: 2,
      applicationId: 3,
      status: 'active',
    };

  const mockUpdateSubscriptionApplicationDto: UpdateSubscriptionApplicationDto =
    {
      merchantSubscriptionId: 2,
      applicationId: 3,
      status: 'inactive',
    };

  const mockOneSubscriptionApplicationResponse: OneSubscriptionApplicationResponseDto =
    {
      statusCode: 200,
      message: 'Subscription Application retrieved successfully',
      data: mockSubscriptionApplication,
    };

  beforeEach(async () => {
    const mockSubscriptionApplicationService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionApplicationController],
      providers: [
        {
          provide: SubscriptionApplicationService,
          useValue: mockSubscriptionApplicationService,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionApplicationController>(
      SubscriptionApplicationController,
    );
    service = module.get(SubscriptionApplicationService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have subscriptionApplicationService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /subscription-applications
  // ----------------------------------------------------------
  describe('POST /subscription-applications', () => {
    it('should create a subscription application  successfully', async () => {
      const createResponse: OneSubscriptionApplicationResponseDto = {
        statusCode: 201,
        message: 'Subscription Application created successfully',
        data: mockSubscriptionApplication,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(
        mockCreateSubscriptionApplicationDto,
      );

      expect(createSpy).toHaveBeenCalledWith(
        mockCreateSubscriptionApplicationDto,
      );
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Subscription Application';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreateSubscriptionApplicationDto),
      ).rejects.toThrow(errorMessage);

      expect(createSpy).toHaveBeenCalledWith(
        mockCreateSubscriptionApplicationDto,
      );
    });
  });

  // ----------------------------------------------------------
  // GET /subscription-applications
  // ----------------------------------------------------------
  describe('GET /subscription-applications', () => {
    it('should retrieve all subscription applications successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedSubscriptionApplicationResponseDto =
        {
          statusCode: 200,
          message: 'Subscription Applications retrieved successfully',
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
  // GET /subscription-applications/:id
  // ----------------------------------------------------------
  describe('GET /subscription-applications/:id', () => {
    it('should retrieve a subscription application by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneSubscriptionApplicationResponse);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneSubscriptionApplicationResponse);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Subscription Application not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /subscription-applications/:id
  // ----------------------------------------------------------
  describe('PATCH /subscription-applications/:id', () => {
    it('should update a subscription application successfully', async () => {
      const updateResponse: OneSubscriptionApplicationResponseDto = {
        statusCode: 200,
        message: 'Subscription Application updated successfully',
        data: mockSubscriptionApplication,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(
        1,
        mockUpdateSubscriptionApplicationDto,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        mockUpdateSubscriptionApplicationDto,
      );
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Subscription Application';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateSubscriptionApplicationDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(
        999,
        mockUpdateSubscriptionApplicationDto,
      );
    });
  });

  // ----------------------------------------------------------
  // DELETE /subscription-applications/:id
  // ----------------------------------------------------------
  describe('DELETE /subscription-applications/:id', () => {
    it('should delete a subscription application successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Subscription Application deleted successfully',
        data: mockOneSubscriptionApplicationResponse.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete Subscription Application';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
