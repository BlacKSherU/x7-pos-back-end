/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderTaxesService } from './order-taxes.service';
import { OrderTax } from './entities/order-tax.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/constants/order-status.enum';
import { OrderBusinessStatus } from '../orders/constants/order-business-status.enum';
import { OrderType } from '../orders/constants/order-type.enum';
import { CreateOrderTaxDto } from './dto/create-order-tax.dto';

describe('OrderTaxesService', () => {
  let service: OrderTaxesService;

  const mockOrderTaxRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockOrdersService = {
    syncOrderAggregates: jest.fn().mockResolvedValue(undefined),
  };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    logical_status: OrderStatus.ACTIVE,
    status: OrderBusinessStatus.PENDING,
    type: OrderType.DINE_IN,
    merchant: { id: 1 },
  };

  const mockTaxRow = {
    id: 1,
    order_id: 1,
    name: 'IVA',
    rate: '19.00',
    amount: '3.80',
    created_at: new Date('2024-01-15T08:00:00.000Z'),
    order: mockOrder,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderTaxesService,
        {
          provide: getRepositoryToken(OrderTax),
          useValue: mockOrderTaxRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<OrderTaxesService>(OrderTaxesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateOrderTaxDto = {
      orderId: 1,
      name: 'IVA',
      rate: 19,
      amount: 3.8,
    };

    it('should create and sync order aggregates', async () => {
      jest.spyOn(mockOrderRepository, 'findOne').mockResolvedValue(mockOrder as any);
      jest.spyOn(mockOrderTaxRepository, 'save').mockResolvedValue({ id: 1 } as any);
      jest
        .spyOn(mockOrderTaxRepository, 'findOne')
        .mockResolvedValue(mockTaxRow as any);

      const result = await service.create(dto, 1);

      expect(result.statusCode).toBe(201);
      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(1);
    });

    it('should throw if no merchant', async () => {
      await expect(service.create(dto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw if order not found', async () => {
      jest.spyOn(mockOrderRepository, 'findOne').mockResolvedValue(null);
      await expect(service.create(dto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete and sync', async () => {
      jest
        .spyOn(mockOrderTaxRepository, 'findOne')
        .mockResolvedValue(mockTaxRow as any);
      jest.spyOn(mockOrderTaxRepository, 'delete').mockResolvedValue(undefined as any);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(mockOrderTaxRepository.delete).toHaveBeenCalledWith(1);
      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(1);
    });
  });
});
