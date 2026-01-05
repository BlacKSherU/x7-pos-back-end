/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { KitchenOrderController } from './kitchen-order.controller';
import { KitchenOrderService } from './kitchen-order.service';
import { CreateKitchenOrderDto } from './dto/create-kitchen-order.dto';
import { UpdateKitchenOrderDto } from './dto/update-kitchen-order.dto';
import { GetKitchenOrderQueryDto } from './dto/get-kitchen-order-query.dto';
import { OneKitchenOrderResponseDto } from './dto/kitchen-order-response.dto';
import { PaginatedKitchenOrderResponseDto } from './dto/paginated-kitchen-order-response.dto';
import { KitchenOrderBusinessStatus } from './constants/kitchen-order-business-status.enum';
import { KitchenOrderStatus } from './constants/kitchen-order-status.enum';

describe('KitchenOrderController', () => {
  let controller: KitchenOrderController;
  let service: KitchenOrderService;

  const mockKitchenOrderService = {
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

  const mockKitchenOrderResponse: OneKitchenOrderResponseDto = {
    statusCode: 201,
    message: 'Kitchen order created successfully',
    data: {
      id: 1,
      merchantId: 1,
      orderId: 1,
      onlineOrderId: null,
      stationId: 1,
      priority: 1,
      businessStatus: KitchenOrderBusinessStatus.PENDING,
      startedAt: null,
      completedAt: null,
      notes: null,
      status: KitchenOrderStatus.ACTIVE,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      merchant: {
        id: 1,
        name: 'Test Merchant',
      },
      order: {
        id: 1,
        status: 'pending',
      },
      onlineOrder: null,
      station: {
        id: 1,
        name: 'Hot Station 1',
      },
    },
  };

  const mockPaginatedResponse: PaginatedKitchenOrderResponseDto = {
    statusCode: 200,
    message: 'Kitchen orders retrieved successfully',
    data: [mockKitchenOrderResponse.data],
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
      controllers: [KitchenOrderController],
      providers: [
        {
          provide: KitchenOrderService,
          useValue: mockKitchenOrderService,
        },
      ],
    }).compile();

    controller = module.get<KitchenOrderController>(KitchenOrderController);
    service = module.get<KitchenOrderService>(KitchenOrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /kitchen-orders (create)', () => {
    const createDto: CreateKitchenOrderDto = {
      orderId: 1,
      stationId: 1,
      priority: 1,
      businessStatus: KitchenOrderBusinessStatus.PENDING,
    };

    it('should create a new kitchen order successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockKitchenOrderResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockKitchenOrderResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Kitchen order created successfully');
    });
  });

  describe('GET /kitchen-orders (findAll)', () => {
    const query: GetKitchenOrderQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of kitchen orders', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /kitchen-orders/:id (findOne)', () => {
    it('should return a single kitchen order by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockKitchenOrderResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockKitchenOrderResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });
  });

  describe('PUT /kitchen-orders/:id (update)', () => {
    const updateDto: UpdateKitchenOrderDto = {
      businessStatus: KitchenOrderBusinessStatus.STARTED,
      priority: 2,
    };

    it('should update a kitchen order successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneKitchenOrderResponseDto = {
        ...mockKitchenOrderResponse,
        statusCode: 200,
        message: 'Kitchen order updated successfully',
        data: {
          ...mockKitchenOrderResponse.data,
          businessStatus: KitchenOrderBusinessStatus.STARTED,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order updated successfully');
    });
  });

  describe('DELETE /kitchen-orders/:id (remove)', () => {
    it('should delete a kitchen order successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneKitchenOrderResponseDto = {
        ...mockKitchenOrderResponse,
        statusCode: 200,
        message: 'Kitchen order deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order deleted successfully');
    });
  });
});
