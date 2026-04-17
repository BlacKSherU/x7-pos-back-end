/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { OneOrderResponseDto, OrderResponseDto } from './dto/order-response.dto';
import { PaginatedOrdersResponseDto } from './dto/order-response.dto';
import { OrderStatus } from './constants/order-status.enum';
import { OrderBusinessStatus } from './constants/order-business-status.enum';
import { OrderType } from './constants/order-type.enum';
import { ForbiddenException } from '@nestjs/common';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
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

  const mockOrderResponseData: OrderResponseDto = {
    id: 1,
    merchantId: 1,
    tableId: 1,
    collaboratorId: 1,
    subscriptionId: 1,
    businessStatus: OrderBusinessStatus.PENDING,
    type: OrderType.DINE_IN,
    customerId: 1,
    status: OrderStatus.ACTIVE,
    createdAt: new Date('2024-01-15T08:00:00Z'),
    closedAt: null,
    updatedAt: new Date('2024-01-15T08:00:00Z'),
  };

  const mockOneOrderResponse: OneOrderResponseDto = {
    statusCode: 201,
    message: 'Order created successfully',
    data: mockOrderResponseData,
  };

  const mockPaginatedResponse: PaginatedOrdersResponseDto = {
    statusCode: 200,
    message: 'Orders retrieved successfully',
    data: [mockOrderResponseData],
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
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /orders (create)', () => {
    const createDto: CreateOrderDto = {
      merchantId: 1,
      tableId: 1,
      collaboratorId: 1,
      subscriptionId: 1,
      businessStatus: OrderBusinessStatus.PENDING,
      type: OrderType.DINE_IN,
      customerId: 1,
    };

    it('should create a new order successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOneOrderResponse);

      const result = await controller.create(createDto, mockRequest as any);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOneOrderResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Order created successfully');
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'Table not found';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDto, mockRequest as any)).rejects.toThrow(errorMessage);
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new ForbiddenException('You must be associated with a merchant'));

      await expect(controller.create(createDto, requestWithoutMerchant as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(createSpy).toHaveBeenCalledWith(createDto, undefined);
    });

    it('should pass merchant id from request user to service', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOneOrderResponse);

      await controller.create(createDto, mockRequest as any);

      expect(createSpy).toHaveBeenCalledWith(createDto, 1);
    });
  });

  describe('GET /orders (findAll)', () => {
    const query: GetOrdersQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated orders successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest as any);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Orders retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
    });

    it('should handle empty query parameters', async () => {
      const emptyQuery = {};
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(emptyQuery, mockRequest as any);

      expect(findAllSpy).toHaveBeenCalledWith(emptyQuery, mockUser.merchant.id);
    });

    it('should handle query with filters', async () => {
      const queryWithFilters: GetOrdersQueryDto = {
        tableId: 1,
        collaboratorId: 1,
        businessStatus: OrderBusinessStatus.PENDING,
        type: OrderType.DINE_IN,
        page: 1,
        limit: 20,
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest as any);

      expect(findAllSpy).toHaveBeenCalledWith(queryWithFilters, mockUser.merchant.id);
    });

    it('should handle service errors during findAll', async () => {
      const errorMessage = 'Invalid query parameters';
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll(query, mockRequest as any)).rejects.toThrow(errorMessage);
      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new ForbiddenException('You must be associated with a merchant'));

      await expect(controller.findAll(query, requestWithoutMerchant as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(findAllSpy).toHaveBeenCalledWith(query, undefined);
    });
  });

  describe('GET /orders/:id (findOne)', () => {
    const orderId = 1;

    it('should return an order successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneOrderResponse);

      const result = await controller.findOne(orderId, mockRequest as any);

      expect(findOneSpy).toHaveBeenCalledWith(orderId, mockUser.merchant.id);
      expect(result).toEqual(mockOneOrderResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(orderId);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Order not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(orderId, mockRequest as any)).rejects.toThrow(errorMessage);
      expect(findOneSpy).toHaveBeenCalledWith(orderId, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new ForbiddenException('You must be associated with a merchant'));

      await expect(controller.findOne(orderId, requestWithoutMerchant as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(findOneSpy).toHaveBeenCalledWith(orderId, undefined);
    });

    it('should parse id parameter correctly', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneOrderResponse);

      await controller.findOne(999, mockRequest as any);

      expect(findOneSpy).toHaveBeenCalledWith(999, mockUser.merchant.id);
    });
  });

  describe('PUT /orders/:id (update)', () => {
    const orderId = 1;
    const updateDto: UpdateOrderDto = {
      businessStatus: OrderBusinessStatus.COMPLETED,
      type: OrderType.TAKE_OUT,
    };

    it('should update an order successfully', async () => {
      const updatedResponse: OneOrderResponseDto = {
        statusCode: 200,
        message: 'Order updated successfully',
        data: {
          ...mockOrderResponseData,
          businessStatus: OrderBusinessStatus.COMPLETED,
          type: OrderType.TAKE_OUT,
        },
      };
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(orderId, updateDto, mockRequest as any);

      expect(updateSpy).toHaveBeenCalledWith(orderId, updateDto, mockUser.merchant.id);
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order updated successfully');
      expect(result.data.businessStatus).toBe(OrderBusinessStatus.COMPLETED);
    });

    it('should handle partial updates', async () => {
      const partialDto: UpdateOrderDto = { businessStatus: OrderBusinessStatus.COMPLETED };
      const updatedResponse: OneOrderResponseDto = {
        statusCode: 200,
        message: 'Order updated successfully',
        data: {
          ...mockOrderResponseData,
          businessStatus: OrderBusinessStatus.COMPLETED,
        },
      };
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updatedResponse);

      await controller.update(orderId, partialDto, mockRequest as any);

      expect(updateSpy).toHaveBeenCalledWith(orderId, partialDto, mockUser.merchant.id);
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Order not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.update(orderId, updateDto, mockRequest as any)).rejects.toThrow(
        errorMessage,
      );
      expect(updateSpy).toHaveBeenCalledWith(orderId, updateDto, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new ForbiddenException('You must be associated with a merchant'));

      await expect(controller.update(orderId, updateDto, requestWithoutMerchant as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(updateSpy).toHaveBeenCalledWith(orderId, updateDto, undefined);
    });

    it('should parse id parameter correctly', async () => {
      const updatedResponse: OneOrderResponseDto = {
        statusCode: 200,
        message: 'Order updated successfully',
        data: mockOrderResponseData,
      };
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updatedResponse);

      await controller.update(999, updateDto, mockRequest as any);

      expect(updateSpy).toHaveBeenCalledWith(999, updateDto, mockUser.merchant.id);
    });
  });

  describe('DELETE /orders/:id (remove)', () => {
    const orderId = 1;

    it('should delete an order successfully', async () => {
      const deleteResponse: OneOrderResponseDto = {
        statusCode: 200,
        message: 'Order deleted successfully',
        data: mockOrderResponseData,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(orderId, mockRequest as any);

      expect(removeSpy).toHaveBeenCalledWith(orderId, mockUser.merchant.id);
      expect(result).toEqual(deleteResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Order not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(orderId, mockRequest as any)).rejects.toThrow(errorMessage);
      expect(removeSpy).toHaveBeenCalledWith(orderId, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new ForbiddenException('You must be associated with a merchant'));

      await expect(controller.remove(orderId, requestWithoutMerchant as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(removeSpy).toHaveBeenCalledWith(orderId, undefined);
    });

    it('should parse id parameter correctly', async () => {
      const deleteResponse: OneOrderResponseDto = {
        statusCode: 200,
        message: 'Order deleted successfully',
        data: mockOrderResponseData,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      await controller.remove(999, mockRequest as any);

      expect(removeSpy).toHaveBeenCalledWith(999, mockUser.merchant.id);
    });
  });
});
