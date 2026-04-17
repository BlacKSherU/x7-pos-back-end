/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Test, TestingModule } from '@nestjs/testing';
import { OrderItemController } from './order-item.controller';
import { OrderItemService } from './order-item.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { GetOrderItemQueryDto } from './dto/get-order-item-query.dto';
import { OrderItemStatus } from './constants/order-item-status.enum';

describe('OrderItemController', () => {
  let controller: OrderItemController;
  let service: OrderItemService;

  const mockOrderItemService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRequest = {
    user: {
      merchant: {
        id: 1,
      },
    },
  };

  const mockOrderItemResponse = {
    statusCode: 200,
    message: 'Order item retrieved successfully',
    data: {
      id: 1,
      orderId: 1,
      productId: 1,
      quantity: 2,
      price: 125.50,
      discount: 10.00,
      status: OrderItemStatus.ACTIVE,
      createdAt: new Date('2024-01-15T08:00:00.000Z'),
      updatedAt: new Date('2024-01-15T08:00:00.000Z'),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderItemController],
      providers: [
        {
          provide: OrderItemService,
          useValue: mockOrderItemService,
        },
      ],
    }).compile();

    controller = module.get<OrderItemController>(OrderItemController);
    service = module.get<OrderItemService>(OrderItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createOrderItemDto: CreateOrderItemDto = {
      orderId: 1,
      productId: 1,
      quantity: 2,
      price: 125.50,
      discount: 10.00,
    };

    it('should create an order item', async () => {
      const createdResponse = {
        ...mockOrderItemResponse,
        statusCode: 201,
        message: 'Order item created successfully',
      };
      jest.spyOn(service, 'create').mockResolvedValue(createdResponse as any);

      const result = await controller.create(createOrderItemDto, mockRequest as any);

      expect(service.create).toHaveBeenCalledWith(createOrderItemDto, 1);
      expect(result).toEqual(createdResponse);
    });
  });

  describe('findAll', () => {
    const query: GetOrderItemQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated order items', async () => {
      const paginatedResponse = {
        statusCode: 200,
        message: 'Order items retrieved successfully',
        data: [mockOrderItemResponse.data],
        paginationMeta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      jest.spyOn(service, 'findAll').mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll(query, mockRequest as any);

      expect(service.findAll).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should return an order item by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockOrderItemResponse as any);

      const result = await controller.findOne(1, mockRequest as any);

      expect(service.findOne).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockOrderItemResponse);
    });
  });

  describe('update', () => {
    const updateOrderItemDto: UpdateOrderItemDto = {
      quantity: 3,
      price: 150.00,
    };

    it('should update an order item', async () => {
      const updatedResponse = {
        ...mockOrderItemResponse,
        message: 'Order item updated successfully',
        data: {
          ...mockOrderItemResponse.data,
          quantity: 3,
          price: 150.00,
        },
      };
      jest.spyOn(service, 'update').mockResolvedValue(updatedResponse as any);

      const result = await controller.update(1, updateOrderItemDto, mockRequest as any);

      expect(service.update).toHaveBeenCalledWith(1, updateOrderItemDto, 1);
      expect(result).toEqual(updatedResponse);
    });
  });

  describe('remove', () => {
    it('should delete an order item', async () => {
      const deletedResponse = {
        ...mockOrderItemResponse,
        message: 'Order item deleted successfully',
      };
      jest.spyOn(service, 'remove').mockResolvedValue(deletedResponse as any);

      const result = await controller.remove(1, mockRequest as any);

      expect(service.remove).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(deletedResponse);
    });
  });
});
