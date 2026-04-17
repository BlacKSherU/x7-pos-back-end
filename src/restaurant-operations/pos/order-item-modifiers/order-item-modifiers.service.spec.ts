/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderItemModifiersService } from './order-item-modifiers.service';
import { OrderItemModifier } from './entities/order-item-modifier.entity';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { Modifier } from '../../../inventory/products-inventory/modifiers/entities/modifier.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderItemStatus } from '../order-item/constants/order-item-status.enum';
import { CreateOrderItemModifierDto } from './dto/create-order-item-modifier.dto';

describe('OrderItemModifiersService', () => {
  let service: OrderItemModifiersService;

  const mockRepo = {
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockOrderItemRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockModifierRepository = {
    findOne: jest.fn(),
  };

  const mockOrderRepository = {
    find: jest.fn(),
  };

  const mockOrdersService = {
    syncOrderAggregates: jest.fn().mockResolvedValue(undefined),
  };

  const mockOrder = { id: 1, merchant_id: 1 };
  const mockOrderItem = {
    id: 1,
    order_id: 1,
    product_id: 1,
    status: OrderItemStatus.ACTIVE,
    order: mockOrder,
  };
  const mockModifier = { id: 1, productId: 1 };
  const mockRow = {
    id: 1,
    order_item_id: 1,
    modifier_id: 1,
    price: '2.50',
    orderItem: mockOrderItem,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderItemModifiersService,
        { provide: getRepositoryToken(OrderItemModifier), useValue: mockRepo },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepository },
        { provide: getRepositoryToken(Modifier), useValue: mockModifierRepository },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<OrderItemModifiersService>(OrderItemModifiersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateOrderItemModifierDto = {
      orderItemId: 1,
      modifierId: 1,
      price: 2.5,
    };

    it('should create and sync order', async () => {
      jest
        .spyOn(mockOrderItemRepository, 'findOne')
        .mockResolvedValue(mockOrderItem as any);
      jest.spyOn(mockModifierRepository, 'findOne').mockResolvedValue(mockModifier as any);
      jest.spyOn(mockRepo, 'save').mockResolvedValue({ id: 1 } as any);
      jest.spyOn(mockRepo, 'findOne').mockResolvedValue(mockRow as any);

      const result = await service.create(dto, 1);

      expect(result.statusCode).toBe(201);
      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(1);
    });

    it('should throw without merchant', async () => {
      await expect(service.create(dto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw if order item missing', async () => {
      jest.spyOn(mockOrderItemRepository, 'findOne').mockResolvedValue(null);
      await expect(service.create(dto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete and sync', async () => {
      jest.spyOn(mockRepo, 'findOne').mockResolvedValue(mockRow as any);
      jest.spyOn(mockRepo, 'delete').mockResolvedValue(undefined as any);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(1);
    });
  });
});
