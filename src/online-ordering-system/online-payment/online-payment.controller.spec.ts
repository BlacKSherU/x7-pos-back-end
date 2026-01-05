/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { OnlinePaymentController } from './online-payment.controller';
import { OnlinePaymentService } from './online-payment.service';
import { CreateOnlinePaymentDto } from './dto/create-online-payment.dto';
import { UpdateOnlinePaymentDto } from './dto/update-online-payment.dto';
import { GetOnlinePaymentQueryDto } from './dto/get-online-payment-query.dto';
import { OneOnlinePaymentResponseDto } from './dto/online-payment-response.dto';
import { PaginatedOnlinePaymentResponseDto } from './dto/paginated-online-payment-response.dto';
import { OnlineOrderPaymentStatus } from '../online-order/constants/online-order-payment-status.enum';
import { OnlinePaymentStatus } from './constants/online-payment-status.enum';

describe('OnlinePaymentController', () => {
  let controller: OnlinePaymentController;
  let service: OnlinePaymentService;

  const mockOnlinePaymentService = {
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

  const mockOnlinePaymentResponse: OneOnlinePaymentResponseDto = {
    statusCode: 201,
    message: 'Online payment created successfully',
    data: {
      id: 1,
      onlineOrderId: 1,
      paymentProvider: 'stripe',
      transactionId: 'txn_1234567890',
      amount: 125.99,
      status: OnlineOrderPaymentStatus.PAID,
      processedAt: new Date('2024-01-15T08:30:00Z'),
      logicalStatus: OnlinePaymentStatus.ACTIVE,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      onlineOrder: {
        id: 1,
        status: 'active',
      },
    },
  };

  const mockPaginatedResponse: PaginatedOnlinePaymentResponseDto = {
    statusCode: 200,
    message: 'Online payments retrieved successfully',
    data: [mockOnlinePaymentResponse.data],
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
      controllers: [OnlinePaymentController],
      providers: [
        {
          provide: OnlinePaymentService,
          useValue: mockOnlinePaymentService,
        },
      ],
    }).compile();

    controller = module.get<OnlinePaymentController>(OnlinePaymentController);
    service = module.get<OnlinePaymentService>(OnlinePaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /online-payments (create)', () => {
    const createDto: CreateOnlinePaymentDto = {
      onlineOrderId: 1,
      paymentProvider: 'stripe',
      transactionId: 'txn_1234567890',
      amount: 125.99,
      status: OnlineOrderPaymentStatus.PAID,
      processedAt: new Date('2024-01-15T08:30:00Z'),
    };

    it('should create a new online payment successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlinePaymentResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOnlinePaymentResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online payment created successfully');
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

  describe('GET /online-payments (findAll)', () => {
    const query: GetOnlinePaymentQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online payments', async () => {
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
      const queryWithFilters: GetOnlinePaymentQueryDto = {
        ...query,
        onlineOrderId: 1,
        paymentProvider: 'stripe',
        status: OnlineOrderPaymentStatus.PAID,
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(queryWithFilters, mockUser.merchant.id);
    });
  });

  describe('GET /online-payments/:id (findOne)', () => {
    it('should return a single online payment by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlinePaymentResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockOnlinePaymentResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Online payment not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });

  describe('PUT /online-payments/:id (update)', () => {
    const updateDto: UpdateOnlinePaymentDto = {
      status: OnlineOrderPaymentStatus.PAID,
      processedAt: new Date('2024-01-15T08:30:00Z'),
    };

    it('should update an online payment successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlinePaymentResponseDto = {
        ...mockOnlinePaymentResponse,
        statusCode: 200,
        message: 'Online payment updated successfully',
        data: {
          ...mockOnlinePaymentResponse.data,
          status: OnlineOrderPaymentStatus.PAID,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online payment updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Online payment not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.update(1, updateDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
    });
  });

  describe('DELETE /online-payments/:id (remove)', () => {
    it('should delete an online payment successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlinePaymentResponseDto = {
        ...mockOnlinePaymentResponse,
        statusCode: 200,
        message: 'Online payment deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online payment deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Online payment not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });
});
