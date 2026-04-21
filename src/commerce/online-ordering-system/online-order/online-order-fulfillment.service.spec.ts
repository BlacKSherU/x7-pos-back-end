/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OnlineOrderFulfillmentService } from './online-order-fulfillment.service';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';
import { OrdersService } from '../../../restaurant-operations/pos/orders/orders.service';
import { KitchenOrderService } from '../../../restaurant-operations/kitchen-display-system/kitchen-order/kitchen-order.service';
import { OnlineOrderService } from './online-order.service';
import { OnlineOrderRealtimePublisher } from './online-order-realtime.publisher';
import { OnlineOrderFulfillmentStatus } from './constants/online-order-fulfillment-status.enum';

describe('OnlineOrderFulfillmentService', () => {
  let service: OnlineOrderFulfillmentService;
  let onlineOrderService: OnlineOrderService;

  const mockOnlineOrderRepo = {
    findOne: jest.fn(),
  };

  const mockOnlineOrderItemRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  const mockOrdersService = {
    createOrderForOnlineAcceptanceWithManager: jest.fn(),
    syncOrderAggregates: jest.fn().mockResolvedValue(undefined),
  };

  const mockKitchenOrderService = {
    create: jest.fn().mockResolvedValue({ statusCode: 201 }),
  };

  const mockOnlineOrderService = {
    findOne: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'ok',
      data: { id: 1, fulfillmentStatus: OnlineOrderFulfillmentStatus.ACCEPTED },
    }),
  };

  const mockRealtime = {
    publishUpdated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnlineOrderFulfillmentService,
        {
          provide: getRepositoryToken(OnlineOrder),
          useValue: mockOnlineOrderRepo,
        },
        {
          provide: getRepositoryToken(OnlineOrderItem),
          useValue: mockOnlineOrderItemRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: KitchenOrderService, useValue: mockKitchenOrderService },
        { provide: OnlineOrderService, useValue: mockOnlineOrderService },
        { provide: OnlineOrderRealtimePublisher, useValue: mockRealtime },
      ],
    }).compile();

    service = module.get(OnlineOrderFulfillmentService);
    onlineOrderService = module.get(OnlineOrderService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('acceptOnlineOrder (idempotent)', () => {
    it('should return existing state when POS order already linked', async () => {
      mockOnlineOrderRepo.findOne.mockResolvedValue({
        id: 5,
        merchant_id: 1,
        order_id: 99,
      });

      await service.acceptOnlineOrder(5, 1);

      expect(onlineOrderService.findOne).toHaveBeenCalledWith(5, 1);
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
      expect(
        mockOrdersService.createOrderForOnlineAcceptanceWithManager,
      ).not.toHaveBeenCalled();
    });
  });
});
