//src/commerce/delivery-system/delivery-tracking/delivery-tracking.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryTrackingController } from './delivery-tracking.controller';
import { DeliveryTrackingService } from './delivery-tracking.service';
import { DeliveryAssignment } from '../delivery-assignment/entity/delivery-assignment.entity';
import { CreateDeliveryTrackingDto } from './dto/create-delivery-tracking.dto';
import { UpdateDeliveryTrackingDto } from './dto/update-delivery-tracking.dto';
import { PaginatedDeliveryTrackingResponseDto } from './dto/paginated-delivery-tracking-response.dto';
import { OneDeliveryTrackingResponseDto } from './dto/delivery-tracking-response.dto';

describe('DeliveryTrackingController', () => {
  let controller: DeliveryTrackingController;
  let service: DeliveryTrackingService;

  // Mock data
  const mockDeliveryAssignment: DeliveryAssignment = {
    id: 1,
    order: { id: 1, total_amount: 100 },
    deliveryDriver: {
      id: 1,
      name: 'John Doe',
      phone: '1234567890',
      email: 'john.doe@example.com',
    },
    delivery_status: 'active',
    assigned_at: new Date('2024-06-01T12:00:00Z'),
    picked_up_at: new Date('2024-06-01T12:15:00Z'),
    delivered_at: new Date('2024-06-01T12:30:00Z'),
    status: 'active',
    created_at: new Date('2024-06-01T11:45:00Z'),
  } as unknown as DeliveryAssignment;

  const mockDeliveryTracking = {
    id: 1,
    deliveryAssignment: mockDeliveryAssignment,
    latitude: 37.7749,
    longitude: -122.4194,
    recorded_at: new Date('2024-06-01T12:00:00Z'),
    status: 'active',
  };

  const mockCreateDeliveryTrackingDto: CreateDeliveryTrackingDto = {
    deliveryAssignment: 1,
    latitude: 37.7749,
    longitude: -122.4194,
    recorded_at: new Date('2024-06-01T12:00:00Z'),
    status: 'active',
  };

  const mockUpdateDeliveryTrackingDto: UpdateDeliveryTrackingDto = {
    deliveryAssignment: 1,
    latitude: 37.7749,
    longitude: -122.4194,
    recorded_at: new Date('2024-06-01T12:00:00Z'),
    status: 'active',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedDeliveryTrackingResponseDto = {
    statusCode: 200,
    message: 'DeliveryTracking records retrieved successfully',
    data: [mockDeliveryTracking],
    pagination: mockPagination,
  };

  const mockOneDeliveryTrackingResponseDto: OneDeliveryTrackingResponseDto = {
    statusCode: 200,
    message: 'DeliveryTracking retrieved successfully',
    data: mockDeliveryTracking,
  };

  beforeEach(async () => {
    const mockDeliveryTrackingService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryTrackingController],
      providers: [
        {
          provide: DeliveryTrackingService,
          useValue: mockDeliveryTrackingService,
        },
      ],
    }).compile();

    controller = module.get<DeliveryTrackingController>(
      DeliveryTrackingController,
    );
    service = module.get(DeliveryTrackingService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have DeliveryTrackingService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /delivery-tracking
  // ----------------------------------------------------------
  describe('POST /delivery-tracking', () => {
    it('should create a delivery tracking successfully', async () => {
      const createResponse: OneDeliveryTrackingResponseDto = {
        statusCode: 201,
        message: 'Delivery Tracking created successfully',
        data: mockDeliveryTracking,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateDeliveryTrackingDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateDeliveryTrackingDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Delivery Tracking';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreateDeliveryTrackingDto),
      ).rejects.toThrow(errorMessage);

      expect(createSpy).toHaveBeenCalledWith(mockCreateDeliveryTrackingDto);
    });
  });

  // ----------------------------------------------------------
  // GET /delivery-tracking
  // ----------------------------------------------------------
  describe('GET /delivery-tracking', () => {
    it('should retrieve all delivery trackings successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedDeliveryTrackingResponseDto = {
        statusCode: 200,
        message: 'Delivery trackings retrieved successfully',
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
  // GET /delivery-tracking/:id
  // ----------------------------------------------------------
  describe('GET /delivery-tracking/:id', () => {
    it('should retrieve a delivery tracking by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneDeliveryTrackingResponseDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneDeliveryTrackingResponseDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Delivery Tracking record not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /delivery-tracking/:id
  // ----------------------------------------------------------
  describe('PATCH /delivery-tracking/:id', () => {
    it('should update a delivery tracking successfully', async () => {
      const updateResponse: OneDeliveryTrackingResponseDto = {
        statusCode: 200,
        message: 'Delivery Tracking updated successfully',
        data: mockDeliveryTracking,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateDeliveryTrackingDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateDeliveryTrackingDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Delivery Tracking';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateDeliveryTrackingDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(
        999,
        mockUpdateDeliveryTrackingDto,
      );
    });
  });

  // ----------------------------------------------------------
  // DELETE /delivery-tracking/:id
  // ----------------------------------------------------------
  describe('DELETE /delivery-tracking/:id', () => {
    it('should delete a delivery tracking successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Delivery Tracking deleted successfully',
        data: mockOneDeliveryTrackingResponseDto.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete Delivery Tracking';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
