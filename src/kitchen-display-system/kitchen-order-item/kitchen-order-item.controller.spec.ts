/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { KitchenOrderItemController } from './kitchen-order-item.controller';
import { KitchenOrderItemService } from './kitchen-order-item.service';
import { CreateKitchenOrderItemDto } from './dto/create-kitchen-order-item.dto';
import { UpdateKitchenOrderItemDto } from './dto/update-kitchen-order-item.dto';
import { GetKitchenOrderItemQueryDto } from './dto/get-kitchen-order-item-query.dto';
import { OneKitchenOrderItemResponseDto } from './dto/kitchen-order-item-response.dto';
import { PaginatedKitchenOrderItemResponseDto } from './dto/kitchen-order-item-response.dto';
import { KitchenOrderItemStatus } from './constants/kitchen-order-item-status.enum';

describe('KitchenOrderItemController', () => {
  let controller: KitchenOrderItemController;
  let service: KitchenOrderItemService;

  const mockKitchenOrderItemService = {
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

  const mockKitchenOrderItemResponse: OneKitchenOrderItemResponseDto = {
    statusCode: 201,
    message: 'Kitchen order item created successfully',
    data: {
      id: 1,
      kitchenOrderId: 1,
      orderItemId: 1,
      productId: 1,
      variantId: null,
      quantity: 2,
      preparedQuantity: 0,
      status: KitchenOrderItemStatus.ACTIVE,
      startedAt: null,
      completedAt: null,
      notes: null,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      kitchenOrder: {
        id: 1,
      },
      orderItem: {
        id: 1,
      },
      product: {
        id: 1,
        name: 'Pizza Margherita',
      },
      variant: null,
    },
  };

  const mockPaginatedResponse: PaginatedKitchenOrderItemResponseDto = {
    statusCode: 200,
    message: 'Kitchen order items retrieved successfully',
    data: [mockKitchenOrderItemResponse.data],
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
      controllers: [KitchenOrderItemController],
      providers: [
        {
          provide: KitchenOrderItemService,
          useValue: mockKitchenOrderItemService,
        },
      ],
    }).compile();

    controller = module.get<KitchenOrderItemController>(KitchenOrderItemController);
    service = module.get<KitchenOrderItemService>(KitchenOrderItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /kitchen-order-items (create)', () => {
    const createDto: CreateKitchenOrderItemDto = {
      kitchenOrderId: 1,
      orderItemId: 1,
      productId: 1,
      quantity: 2,
    };

    it('should create a new kitchen order item successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockKitchenOrderItemResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockKitchenOrderItemResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Kitchen order item created successfully');
    });
  });

  describe('GET /kitchen-order-items (findAll)', () => {
    const query: GetKitchenOrderItemQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of kitchen order items', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /kitchen-order-items/:id (findOne)', () => {
    it('should return a single kitchen order item by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockKitchenOrderItemResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockKitchenOrderItemResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });
  });

  describe('PUT /kitchen-order-items/:id (update)', () => {
    const updateDto: UpdateKitchenOrderItemDto = {
      preparedQuantity: 1,
      notes: 'Half prepared',
    };

    it('should update a kitchen order item successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneKitchenOrderItemResponseDto = {
        ...mockKitchenOrderItemResponse,
        statusCode: 200,
        message: 'Kitchen order item updated successfully',
        data: {
          ...mockKitchenOrderItemResponse.data,
          preparedQuantity: 1,
          notes: 'Half prepared',
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order item updated successfully');
    });
  });

  describe('DELETE /kitchen-order-items/:id (remove)', () => {
    it('should delete a kitchen order item successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneKitchenOrderItemResponseDto = {
        ...mockKitchenOrderItemResponse,
        statusCode: 200,
        message: 'Kitchen order item deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order item deleted successfully');
    });
  });
});
