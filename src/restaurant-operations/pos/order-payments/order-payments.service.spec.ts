/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, type DeleteResult } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderPaymentsService } from './order-payments.service';
import { OrderPayment } from './entities/order-payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/constants/order-status.enum';
import { OrderBusinessStatus } from '../orders/constants/order-business-status.enum';
import { OrderType } from '../orders/constants/order-type.enum';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';

describe('OrderPaymentsService', () => {
  let service: OrderPaymentsService;
  let orderPaymentRepository: Repository<OrderPayment>;
  let orderRepository: Repository<Order>;

  const mockOrderPaymentRepository = {
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

  const mockPaymentRow = {
    id: 1,
    order_id: 1,
    amount: '50.00',
    method: 'card',
    provider: 'stripe',
    reference: 'ch_1',
    tip_amount: '0',
    is_refund: false,
    created_at: new Date('2024-01-15T08:00:00.000Z'),
    order: mockOrder,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderPaymentsService,
        {
          provide: getRepositoryToken(OrderPayment),
          useValue: mockOrderPaymentRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<OrderPaymentsService>(OrderPaymentsService);
    orderPaymentRepository = module.get(getRepositoryToken(OrderPayment));
    orderRepository = module.get(getRepositoryToken(Order));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateOrderPaymentDto = {
      orderId: 1,
      amount: 50,
      method: 'card',
      provider: 'stripe',
      reference: 'ch_1',
    };

    it('should create and sync order aggregates', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(orderPaymentRepository, 'save')
        .mockResolvedValue({ id: 1 } as unknown as OrderPayment);
      jest
        .spyOn(orderPaymentRepository, 'findOne')
        .mockResolvedValue(mockPaymentRow as unknown as OrderPayment);

      const result = await service.create(dto, 1);

      expect(result.statusCode).toBe(201);
      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(1);
    });

    it('should throw if no merchant', async () => {
      await expect(service.create(dto, 0)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);
      await expect(service.create(dto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete and sync', async () => {
      jest
        .spyOn(orderPaymentRepository, 'findOne')
        .mockResolvedValue(mockPaymentRow as unknown as OrderPayment);
      jest
        .spyOn(orderPaymentRepository, 'delete')
        .mockResolvedValue({ raw: [], affected: 1 } as DeleteResult);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(orderPaymentRepository.delete).toHaveBeenCalledWith(1);
      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(1);
    });
  });
});
