/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KitchenOrderSyncService } from './kitchen-order-sync.service';
import { KitchenOrder } from './entities/kitchen-order.entity';
import { KitchenOrderItem } from '../kitchen-order-item/entities/kitchen-order-item.entity';
import { OrderItem } from '../../pos/order-item/entities/order-item.entity';
import { OrdersService } from '../../pos/orders/orders.service';
import { KitchenOrderStatus } from './constants/kitchen-order-status.enum';
import { KitchenOrderItemStatus } from '../kitchen-order-item/constants/kitchen-order-item-status.enum';
import { KitchenOrderItemPreparationStatus } from '../kitchen-order-item/constants/kitchen-order-item-preparation-status.enum';
import { OrderItemKitchenStatus } from '../../pos/order-item/constants/order-item-kitchen-status.enum';

describe('KitchenOrderSyncService', () => {
  let service: KitchenOrderSyncService;
  const mockKitchenOrderRepo = {
    find: jest.fn(),
    update: jest.fn(),
  };
  const mockKitchenOrderItemRepo = {
    find: jest.fn(),
    count: jest.fn(),
  };
  const mockOrderItemRepo = {
    update: jest.fn(),
  };
  const mockOrdersService = {
    syncOrderAggregates: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenOrderSyncService,
        {
          provide: getRepositoryToken(KitchenOrder),
          useValue: mockKitchenOrderRepo,
        },
        {
          provide: getRepositoryToken(KitchenOrderItem),
          useValue: mockKitchenOrderItemRepo,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepo,
        },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get(KitchenOrderSyncService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncPosOrderFromKitchenOrders', () => {
    it('should mirror preparation to POS lines and call syncOrderAggregates', async () => {
      mockKitchenOrderRepo.find.mockResolvedValue([
        {
          id: 1,
          order_id: 100,
          started_at: null,
          completed_at: null,
          status: KitchenOrderStatus.ACTIVE,
        },
      ]);
      mockKitchenOrderItemRepo.find.mockResolvedValue([
        {
          kitchen_order_id: 1,
          order_item_id: 50,
          preparation_status: KitchenOrderItemPreparationStatus.READY,
          status: KitchenOrderItemStatus.ACTIVE,
        },
      ]);

      await service.syncPosOrderFromKitchenOrders(100);

      expect(mockOrderItemRepo.update).toHaveBeenCalledWith(50, {
        kitchen_status: OrderItemKitchenStatus.READY,
      });
      expect(mockKitchenOrderRepo.update).toHaveBeenCalled();
      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(100);
    });

    it('should no-op when no kitchen orders for POS order', async () => {
      mockKitchenOrderRepo.find.mockResolvedValue([]);

      await service.syncPosOrderFromKitchenOrders(100);

      expect(mockOrderItemRepo.update).not.toHaveBeenCalled();
      expect(mockOrdersService.syncOrderAggregates).not.toHaveBeenCalled();
    });
  });

  describe('resetOrderLineIfNoActiveKoi', () => {
    it('should set line to pending when no active KOI remain', async () => {
      mockKitchenOrderItemRepo.count.mockResolvedValue(0);

      await service.resetOrderLineIfNoActiveKoi(50);

      expect(mockOrderItemRepo.update).toHaveBeenCalledWith(50, {
        kitchen_status: OrderItemKitchenStatus.PENDING,
      });
    });

    it('should not update when active KOI still exist', async () => {
      mockKitchenOrderItemRepo.count.mockResolvedValue(1);

      await service.resetOrderLineIfNoActiveKoi(50);

      expect(mockOrderItemRepo.update).not.toHaveBeenCalled();
    });
  });
});
