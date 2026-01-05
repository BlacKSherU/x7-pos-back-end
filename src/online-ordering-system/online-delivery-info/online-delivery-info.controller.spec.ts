/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { OnlineDeliveryInfoController } from './online-delivery-info.controller';
import { OnlineDeliveryInfoService } from './online-delivery-info.service';
import { CreateOnlineDeliveryInfoDto } from './dto/create-online-delivery-info.dto';
import { UpdateOnlineDeliveryInfoDto } from './dto/update-online-delivery-info.dto';
import { GetOnlineDeliveryInfoQueryDto } from './dto/get-online-delivery-info-query.dto';
import { OneOnlineDeliveryInfoResponseDto } from './dto/online-delivery-info-response.dto';
import { PaginatedOnlineDeliveryInfoResponseDto } from './dto/paginated-online-delivery-info-response.dto';
import { OnlineDeliveryInfoStatus } from './constants/online-delivery-info-status.enum';

describe('OnlineDeliveryInfoController', () => {
  let controller: OnlineDeliveryInfoController;
  let service: OnlineDeliveryInfoService;

  const mockOnlineDeliveryInfoService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    merchant: {
      id: 1,
    },
  };

  const mockRequest = {
    user: mockUser,
  };

  const mockOnlineDeliveryInfoResponse: OneOnlineDeliveryInfoResponseDto = {
    statusCode: 201,
    message: 'Online delivery info created successfully',
    data: {
      id: 1,
      onlineOrderId: 1,
      customerName: 'John Doe',
      address: '123 Main Street, Apt 4B',
      city: 'New York',
      phone: '+1-555-123-4567',
      deliveryInstructions: 'Ring the doorbell twice',
      status: OnlineDeliveryInfoStatus.ACTIVE,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      onlineOrder: {
        id: 1,
        status: 'active',
      },
    },
  };

  const mockPaginatedResponse: PaginatedOnlineDeliveryInfoResponseDto = {
    statusCode: 200,
    message: 'Online delivery info retrieved successfully',
    data: [mockOnlineDeliveryInfoResponse.data],
    paginationMeta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnlineDeliveryInfoController],
      providers: [
        {
          provide: OnlineDeliveryInfoService,
          useValue: mockOnlineDeliveryInfoService,
        },
      ],
    }).compile();

    controller = module.get<OnlineDeliveryInfoController>(OnlineDeliveryInfoController);
    service = module.get<OnlineDeliveryInfoService>(OnlineDeliveryInfoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /online-delivery-info (create)', () => {
    const createDto: CreateOnlineDeliveryInfoDto = {
      onlineOrderId: 1,
      customerName: 'John Doe',
      address: '123 Main Street, Apt 4B',
      city: 'New York',
      phone: '+1-555-123-4567',
      deliveryInstructions: 'Ring the doorbell twice',
    };

    it('should create a new online delivery info successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlineDeliveryInfoResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineDeliveryInfoResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online delivery info created successfully');
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'Online order not found or you do not have access to it';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });
  });

  describe('GET /online-delivery-info (findAll)', () => {
    const query: GetOnlineDeliveryInfoQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online delivery info', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
    });

    it('should handle service errors during findAll', async () => {
      const errorMessage = 'Invalid query parameters';
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll(query, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
    });

    it('should pass query parameters correctly', async () => {
      const queryWithFilters: GetOnlineDeliveryInfoQueryDto = {
        ...query,
        onlineOrderId: 1,
        customerName: 'John',
        city: 'New York',
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(queryWithFilters, mockUser.merchant.id);
    });
  });

  describe('GET /online-delivery-info/:id (findOne)', () => {
    it('should return a single online delivery info by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlineDeliveryInfoResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineDeliveryInfoResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Online delivery info not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });

  describe('PUT /online-delivery-info/:id (update)', () => {
    const updateDto: UpdateOnlineDeliveryInfoDto = {
      address: '456 Oak Avenue, Suite 2',
      phone: '+1-555-987-6543',
    };

    it('should update an online delivery info successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlineDeliveryInfoResponseDto = {
        ...mockOnlineDeliveryInfoResponse,
        statusCode: 200,
        message: 'Online delivery info updated successfully',
        data: {
          ...mockOnlineDeliveryInfoResponse.data,
          address: '456 Oak Avenue, Suite 2',
          phone: '+1-555-987-6543',
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online delivery info updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Online delivery info not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.update(1, updateDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
    });
  });

  describe('DELETE /online-delivery-info/:id (remove)', () => {
    it('should delete an online delivery info successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlineDeliveryInfoResponseDto = {
        ...mockOnlineDeliveryInfoResponse,
        statusCode: 200,
        message: 'Online delivery info deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online delivery info deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Online delivery info not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });
});
