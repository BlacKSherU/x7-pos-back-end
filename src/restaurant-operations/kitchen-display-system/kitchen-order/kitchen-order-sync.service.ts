import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  Repository,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { KitchenOrder } from './entities/kitchen-order.entity';
import { KitchenOrderItem } from '../kitchen-order-item/entities/kitchen-order-item.entity';
import { KitchenOrderStatus } from './constants/kitchen-order-status.enum';
import { KitchenOrderBusinessStatus } from './constants/kitchen-order-business-status.enum';
import { KitchenOrderItemStatus } from '../kitchen-order-item/constants/kitchen-order-item-status.enum';
import { KitchenOrderItemPreparationStatus } from '../kitchen-order-item/constants/kitchen-order-item-preparation-status.enum';
import { OrderItem } from '../../pos/order-item/entities/order-item.entity';
import { OrdersService } from '../../pos/orders/orders.service';
import { OrderItemKitchenStatus } from '../../pos/order-item/constants/order-item-kitchen-status.enum';

function preparationToOrderLineStatus(
  p: KitchenOrderItemPreparationStatus,
): OrderItemKitchenStatus {
  switch (p) {
    case KitchenOrderItemPreparationStatus.IN_PREPARATION:
      return OrderItemKitchenStatus.IN_PREPARATION;
    case KitchenOrderItemPreparationStatus.READY:
      return OrderItemKitchenStatus.READY;
    default:
      return OrderItemKitchenStatus.PENDING;
  }
}

function deriveKitchenOrderBusinessStatus(
  items: KitchenOrderItem[],
): KitchenOrderBusinessStatus {
  const active = items.filter(
    (i) => i.status === KitchenOrderItemStatus.ACTIVE,
  );
  if (active.length === 0) {
    return KitchenOrderBusinessStatus.PENDING;
  }
  if (
    active.every(
      (i) =>
        i.preparation_status === KitchenOrderItemPreparationStatus.PENDING ||
        i.preparation_status === KitchenOrderItemPreparationStatus.HELD,
    )
  ) {
    return KitchenOrderBusinessStatus.PENDING;
  }
  if (
    active.every(
      (i) => i.preparation_status === KitchenOrderItemPreparationStatus.READY,
    )
  ) {
    return KitchenOrderBusinessStatus.COMPLETED;
  }
  return KitchenOrderBusinessStatus.STARTED;
}

@Injectable()
export class KitchenOrderSyncService {
  constructor(
    @InjectRepository(KitchenOrder)
    private readonly kitchenOrderRepository: Repository<KitchenOrder>,
    @InjectRepository(KitchenOrderItem)
    private readonly kitchenOrderItemRepository: Repository<KitchenOrderItem>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Mirrors KOI statuses into POS lines, updates each kitchen order business_status,
   * and recomputes order aggregates (Order.kitchen_status, etc).
   */
  async syncPosOrderFromKitchenOrders(orderId: number): Promise<void> {
    const { becameFullyPaid } =
      await this.syncPosOrderFromKitchenOrdersWithManager(
        this.kitchenOrderRepository.manager,
        orderId,
      );
    if (becameFullyPaid) {
      this.ordersService.emitOrderFullyPaid(orderId);
    }
    await this.ordersService.syncOnlineOrderFromPosOrder(orderId);
  }

  /**
   * Transaction-friendly version of {@link syncPosOrderFromKitchenOrders}.
   * MUST be called with the QueryRunner manager when atomicity is required.
   */
  async syncPosOrderFromKitchenOrdersWithManager(
    manager: EntityManager,
    orderId: number,
  ): Promise<{ becameFullyPaid: boolean }> {
    const kitchenOrders = await this.kitchenOrderRepository.find({
      where: {
        order_id: orderId,
        status: KitchenOrderStatus.ACTIVE,
      },
    });

    const koIds = kitchenOrders.map((k) => k.id);
    if (koIds.length === 0) {
      return { becameFullyPaid: false };
    }

    const allItems = await this.kitchenOrderItemRepository.find({
      where: {
        kitchen_order_id: In(koIds),
        status: KitchenOrderItemStatus.ACTIVE,
      },
    });

    for (const koi of allItems) {
      if (koi.order_item_id == null) {
        continue;
      }
      const lineStatus = preparationToOrderLineStatus(koi.preparation_status);
      await manager.getRepository(OrderItem).update(koi.order_item_id, {
        kitchen_status: lineStatus,
      });
    }

    const now = new Date();
    for (const ko of kitchenOrders) {
      const koItems = allItems.filter((i) => i.kitchen_order_id === ko.id);
      const nextBusiness = deriveKitchenOrderBusinessStatus(koItems);
      const patch: QueryDeepPartialEntity<KitchenOrder> = {
        business_status: nextBusiness,
      };
      if (
        (nextBusiness === KitchenOrderBusinessStatus.STARTED ||
          nextBusiness === KitchenOrderBusinessStatus.COMPLETED) &&
        !ko.started_at
      ) {
        patch.started_at = now;
      }
      if (
        nextBusiness === KitchenOrderBusinessStatus.COMPLETED &&
        !ko.completed_at
      ) {
        patch.completed_at = now;
      } else if (
        nextBusiness !== KitchenOrderBusinessStatus.COMPLETED &&
        ko.completed_at
      ) {
        patch.completed_at = null;
      }
      await manager.getRepository(KitchenOrder).update(ko.id, patch);
    }

    return this.ordersService.syncOrderAggregatesWithManager(manager, orderId);
  }

  /**
   * If there are no active KOIs for a POS line, resets its kitchen status to pending.
   */
  async resetOrderLineIfNoActiveKoi(orderItemId: number | null): Promise<void> {
    await this.resetOrderLineIfNoActiveKoiWithManager(
      this.kitchenOrderItemRepository.manager,
      orderItemId,
    );
  }

  /** Transaction-friendly version of {@link resetOrderLineIfNoActiveKoi}. */
  async resetOrderLineIfNoActiveKoiWithManager(
    manager: EntityManager,
    orderItemId: number | null,
  ): Promise<void> {
    if (orderItemId == null) {
      return;
    }
    const count = await this.kitchenOrderItemRepository.count({
      where: {
        order_item_id: orderItemId,
        status: KitchenOrderItemStatus.ACTIVE,
      },
    });
    if (count === 0) {
      await manager.getRepository(OrderItem).update(orderItemId, {
        kitchen_status: OrderItemKitchenStatus.PENDING,
      });
    }
  }
}
