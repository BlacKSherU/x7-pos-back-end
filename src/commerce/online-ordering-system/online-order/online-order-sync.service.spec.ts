/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OnlineOrderSyncService } from './online-order-sync.service';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { OrderItem } from '../../../restaurant-operations/pos/order-item/entities/order-item.entity';
import { OnlineOrderRealtimePublisher } from './online-order-realtime.publisher';
import { OnlineOrderFulfillmentStatus } from './constants/online-order-fulfillment-status.enum';
import { OnlineOrderType } from './constants/online-order-type.enum';
import { KitchenStatus } from '../../../restaurant-operations/pos/orders/constants/kitchen-status.enum';
import { OrderBusinessStatus } from '../../../restaurant-operations/pos/orders/constants/order-business-status.enum';
import { OrderItemKitchenStatus } from '../../../restaurant-operations/pos/order-item/constants/order-item-kitchen-status.enum';

describe('OnlineOrderSyncService', () => {
  let service: OnlineOrderSyncService;
  const mockOnlineOrderRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockOnlineOrderItemRepo = {
    find: jest.fn(),
    save: jest.fn(),
  };
  const mockOrderRepo = {
    findOne: jest.fn(),
  };
  const mockOrderItemRepo = {
    find: jest.fn(),
  };
  const mockRealtime = {
    publishUpdated: jest.fn(),
  };

  const mockMerchant = { id: 1, name: 'M' };
  const mockStore = { id: 1, subdomain: 's' };
  const mockCustomer = { id: 2, name: 'C', email: 'c@test.com' };

  beforeEach(async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    mockOnlineOrderRepo.createQueryBuilder.mockReturnValue(qb);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnlineOrderSyncService,
        { provide: getRepositoryToken(OnlineOrder), useValue: mockOnlineOrderRepo },
        {
          provide: getRepositoryToken(OnlineOrderItem),
          useValue: mockOnlineOrderItemRepo,
        },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepo },
        {
          provide: OnlineOrderRealtimePublisher,
          useValue: mockRealtime,
        },
      ],
    }).compile();

    service = module.get(OnlineOrderSyncService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('syncFromPosOrder should no-op when no online order links to POS order', async () => {
    mockOnlineOrderRepo.findOne.mockResolvedValue(null);

    await service.syncFromPosOrder(999);

    expect(mockOrderRepo.findOne).not.toHaveBeenCalled();
    expect(mockRealtime.publishUpdated).not.toHaveBeenCalled();
  });

  it('syncFromPosOrder should project POS kitchen state and emit realtime', async () => {
    const onlineRow = {
      id: 10,
      merchant_id: 1,
      store_id: 1,
      order_id: 100,
      customer_id: 2,
      type: OnlineOrderType.PICKUP,
      fulfillment_status: OnlineOrderFulfillmentStatus.RECEIVED,
      merchant: mockMerchant,
      store: mockStore,
      customer: mockCustomer,
      order: { id: 100, total: 42.5 },
    };
    mockOnlineOrderRepo.findOne.mockResolvedValue(onlineRow);
    mockOrderRepo.findOne.mockResolvedValue({
      id: 100,
      kitchen_status: KitchenStatus.READY,
      status: OrderBusinessStatus.PENDING,
    });
    mockOrderItemRepo.find.mockResolvedValue([
      {
        id: 50,
        order_id: 100,
        kitchen_status: OrderItemKitchenStatus.READY,
      },
    ]);
    mockOnlineOrderItemRepo.find.mockResolvedValue([
      {
        id: 1,
        online_order_id: 10,
        order_item_id: 50,
        kitchen_line_status: null,
      },
    ]);

    const refreshed = {
      ...onlineRow,
      fulfillment_status: OnlineOrderFulfillmentStatus.READY_FOR_PICKUP,
      order: { id: 100, total: 42.5 },
    };
    mockOnlineOrderRepo.createQueryBuilder().getOne.mockResolvedValue(refreshed);

    await service.syncFromPosOrder(100);

    expect(mockOnlineOrderRepo.save).toHaveBeenCalled();
    expect(mockOnlineOrderItemRepo.save).toHaveBeenCalled();
    expect(mockRealtime.publishUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        onlineOrderId: 10,
        orderId: 100,
        data: expect.objectContaining({ fulfillmentStatus: OnlineOrderFulfillmentStatus.READY_FOR_PICKUP }),
      }),
    );
  });
});
