import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type QueryDeepPartialEntity } from 'typeorm';
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
      (i) => i.preparation_status === KitchenOrderItemPreparationStatus.PENDING,
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
   * Espeja estados KOI → líneas POS, actualiza business_status de cada kitchen order
   * y recalcula agregados de la orden (`Order.kitchen_status`, etc.).
   */
  async syncPosOrderFromKitchenOrders(orderId: number): Promise<void> {
    const kitchenOrders = await this.kitchenOrderRepository.find({
      where: {
        order_id: orderId,
        status: KitchenOrderStatus.ACTIVE,
      },
    });

    const koIds = kitchenOrders.map((k) => k.id);
    if (koIds.length === 0) {
      return;
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
      await this.orderItemRepository.update(koi.order_item_id, {
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
      }
      await this.kitchenOrderRepository.update(ko.id, patch);
    }

    await this.ordersService.syncOrderAggregates(orderId);
  }

  /** Si ya no hay KOI activos para una línea POS, vuelve el estado de cocina de la línea a pending. */
  async resetOrderLineIfNoActiveKoi(orderItemId: number | null): Promise<void> {
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
      await this.orderItemRepository.update(orderItemId, {
        kitchen_status: OrderItemKitchenStatus.PENDING,
      });
    }
  }
}
