//src/commerce/delivery-system/delivery-assignment/delivery-assignment.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryAssignmentController } from './delivery-assignment.controller';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { DeliveryAssignment } from './entity/delivery-assignment.entity';
import { DeliveryStatus } from '../constants/delivery-status.enum';
import { DeliveryDriver } from '../delivery-driver/entity/delivery-driver.entity';
import { Order } from 'src/orders/entities/order.entity';
import { CreateDeliveryAssignmentDto } from './dto/create-delivery-assignment.dto';
import { UpdateDeliveryAssignmentDto } from './dto/update-delivery-assignment.dto';
import { PaginatedDeliveryAssignmentResponseDto } from './dto/paginated-delivery-assignment-response.dto';
import { OneDeliveryAssignmentResponseDto } from './dto/delivery-assignment-response.dto';

describe('DeliveryAssignmentController', () => {
  let controller: DeliveryAssignmentController;
  let service: DeliveryAssignmentService;

  // Mock data
  const mockDeliveryDriver: DeliveryDriver = {
    id: 1,
    name: 'John Doe',
    phone: '1234567890',
    email: 'john.doe@example.com',
    vehicle_type: 'car',
    status: 'active',
  } as unknown as DeliveryDriver;

  const mockOrder: Order = {
    id: 1,
    customer: 1,
    total_amount: 50.0,
    status: 'pending',
    created_at: '2024-06-01T11:00:00Z',
    updated_at: '2024-06-01T11:00:00Z',
  } as unknown as Order;

  const mockDeliveryAssignment: DeliveryAssignment = {
    id: 1,
    order: mockOrder,
    deliveryDriver: mockDeliveryDriver,
    delivery_status: DeliveryStatus.ASSIGNED,
    assigned_at: '2024-06-01T12:00:00Z',
    picked_up_at: '2024-06-01T12:15:00Z',
    delivered_at: '2024-06-01T12:30:00Z',
    status: 'active',
  } as unknown as DeliveryAssignment;

  const mockCreateDeliveryAssignmentDto: CreateDeliveryAssignmentDto = {
    order: 1,
    deliveryDriver: 1,
    delivery_status: DeliveryStatus.ASSIGNED,
    assigned_at: new Date('2024-06-01T12:00:00Z'),
    picked_up_at: new Date('2024-06-01T12:15:00Z'),
    delivered_at: new Date('2024-06-01T12:30:00Z'),
    status: 'active',
  };

  const mockUpdateDeliveryAssignmentDto: UpdateDeliveryAssignmentDto = {
    order: 1,
    deliveryDriver: 1,
    delivery_status: DeliveryStatus.UNASSIGNED,
    assigned_at: new Date('2024-06-01T12:00:00Z'),
    picked_up_at: new Date('2024-06-01T12:15:00Z'),
    delivered_at: new Date('2024-06-01T12:30:00Z'),
    status: 'inactive',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedDeliveryAssignmentResponseDto = {
    statusCode: 200,
    message: 'Delivery Assignments retrieved successfully',
    data: [mockDeliveryAssignment],
    pagination: mockPagination,
  };

  const mockOneDeliveryAssignmentResponseDto: OneDeliveryAssignmentResponseDto =
    {
      statusCode: 200,
      message: 'Delivery Assignment retrieved successfully',
      data: mockDeliveryAssignment,
    };

  beforeEach(async () => {
    const mockDeliveryAssignmentService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryAssignmentController],
      providers: [
        {
          provide: DeliveryAssignmentService,
          useValue: mockDeliveryAssignmentService,
        },
      ],
    }).compile();

    controller = module.get<DeliveryAssignmentController>(
      DeliveryAssignmentController,
    );
    service = module.get(DeliveryAssignmentService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have DeliveryAssignmentService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /delivery-assignment
  // ----------------------------------------------------------
  describe('POST /delivery-assignment', () => {
    it('should create a delivery assignment successfully', async () => {
      const createResponse: OneDeliveryAssignmentResponseDto = {
        statusCode: 201,
        message: 'Delivery Assignment created successfully',
        data: mockDeliveryAssignment,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateDeliveryAssignmentDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateDeliveryAssignmentDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Delivery Assignment';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreateDeliveryAssignmentDto),
      ).rejects.toThrow(errorMessage);

      expect(createSpy).toHaveBeenCalledWith(mockCreateDeliveryAssignmentDto);
    });
  });

  // ----------------------------------------------------------
  // GET /delivery-assignment
  // ----------------------------------------------------------
  describe('GET /delivery-assignment', () => {
    it('should retrieve all delivery assignments successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedDeliveryAssignmentResponseDto = {
        statusCode: 200,
        message: 'Delivery assignments retrieved successfully',
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
  // GET /delivery-assignment/:id
  // ----------------------------------------------------------
  describe('GET /delivery-assignment/:id', () => {
    it('should retrieve a delivery assignment by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneDeliveryAssignmentResponseDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneDeliveryAssignmentResponseDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Delivery Assignment not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /delivery-assignment/:id
  // ----------------------------------------------------------
  describe('PATCH /delivery-assignment/:id', () => {
    it('should update a delivery assignment successfully', async () => {
      const updateResponse: OneDeliveryAssignmentResponseDto = {
        statusCode: 200,
        message: 'Delivery Assignment updated successfully',
        data: mockDeliveryAssignment,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(
        1,
        mockUpdateDeliveryAssignmentDto,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        mockUpdateDeliveryAssignmentDto,
      );
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Delivery Assignment';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateDeliveryAssignmentDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(
        999,
        mockUpdateDeliveryAssignmentDto,
      );
    });
  });

  // ----------------------------------------------------------
  // DELETE /delivery-assignment/:id
  // ----------------------------------------------------------
  describe('DELETE /delivery-assignment/:id', () => {
    it('should delete a delivery assignment successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Delivery Assignment deleted successfully',
        data: mockOneDeliveryAssignmentResponseDto.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete Delivery Assignment';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
