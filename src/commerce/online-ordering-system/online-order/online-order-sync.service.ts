import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { OrderItem } from '../../../restaurant-operations/pos/order-item/entities/order-item.entity';
import { OrderBusinessStatus } from '../../../restaurant-operations/pos/orders/constants/order-business-status.enum';
import { KitchenStatus } from '../../../restaurant-operations/pos/orders/constants/kitchen-status.enum';
import { OnlineOrderFulfillmentStatus } from './constants/online-order-fulfillment-status.enum';
import { OnlineOrderType } from './constants/online-order-type.enum';
import { OnlineOrderRealtimePublisher } from './online-order-realtime.publisher';
import { formatOnlineOrderToDto } from './online-order.mapper';
import { computeOnlineOrderTotalAmount } from './online-order-pricing.util';
import { OrderItemKitchenStatus } from '../../../restaurant-operations/pos/order-item/constants/order-item-kitchen-status.enum';

/**
 * Proyecta estados POS → filas online enlazadas por `online_order.order_id`.
 */
@Injectable()
export class OnlineOrderSyncService {
  constructor(
    @InjectRepository(OnlineOrder)
    private readonly onlineOrderRepository: Repository<OnlineOrder>,
    @InjectRepository(OnlineOrderItem)
    private readonly onlineOrderItemRepository: Repository<OnlineOrderItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly realtimePublisher: OnlineOrderRealtimePublisher,
  ) {}

  async syncFromPosOrder(orderId: number): Promise<void> {
    const online = await this.onlineOrderRepository.findOne({
      where: { order_id: orderId },
    });
    if (!online) {
      return;
    }

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      return;
    }

    const items = await this.orderItemRepository.find({
      where: { order_id: orderId },
    });

    const fulfillment = this.mapPosToFulfillment(order, online.type);
    online.fulfillment_status = fulfillment;
    if (
      fulfillment === OnlineOrderFulfillmentStatus.READY_FOR_PICKUP ||
      fulfillment === OnlineOrderFulfillmentStatus.OUT_FOR_DELIVERY
    ) {
      if (!online.ready_at) {
        online.ready_at = new Date();
      }
    }
    if (fulfillment === OnlineOrderFulfillmentStatus.COMPLETED) {
      if (!online.completed_at) {
        online.completed_at = new Date();
      }
    }
    await this.onlineOrderRepository.save(online);

    const onlineItems = await this.onlineOrderItemRepository.find({
      where: { online_order_id: online.id },
    });
    for (const oi of items) {
      const match = onlineItems.find((x) => x.order_item_id === oi.id);
      if (match) {
        match.kitchen_line_status = oi.kitchen_status as OrderItemKitchenStatus;
        await this.onlineOrderItemRepository.save(match);
      }
    }

    const refreshed = await this.onlineOrderRepository
      .createQueryBuilder('onlineOrder')
      .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
      .leftJoinAndSelect('onlineOrder.store', 'store')
      .leftJoinAndSelect('onlineOrder.order', 'order')
      .leftJoinAndSelect('onlineOrder.customer', 'customer')
      .where('onlineOrder.id = :id', { id: online.id })
      .getOne();
    if (!refreshed) {
      return;
    }
    const totalAmount = await computeOnlineOrderTotalAmount(
      refreshed,
      this.onlineOrderItemRepository,
    );
    this.realtimePublisher.publishUpdated({
      onlineOrderId: online.id,
      orderId: orderId,
      data: formatOnlineOrderToDto(refreshed, totalAmount),
    });
  }

  private mapPosToFulfillment(
    order: Order,
    onlineType: OnlineOrderType,
  ): OnlineOrderFulfillmentStatus {
    if (order.status === OrderBusinessStatus.CANCELLED) {
      return OnlineOrderFulfillmentStatus.CANCELLED;
    }
    if (order.status === OrderBusinessStatus.COMPLETED) {
      return OnlineOrderFulfillmentStatus.COMPLETED;
    }

    switch (order.kitchen_status) {
      case KitchenStatus.CANCELLED:
        return OnlineOrderFulfillmentStatus.CANCELLED;
      case KitchenStatus.COMPLETED:
        return OnlineOrderFulfillmentStatus.COMPLETED;
      case KitchenStatus.READY:
        return onlineType === OnlineOrderType.DELIVERY
          ? OnlineOrderFulfillmentStatus.OUT_FOR_DELIVERY
          : OnlineOrderFulfillmentStatus.READY_FOR_PICKUP;
      case KitchenStatus.PREPARING:
      case KitchenStatus.SENT:
        return OnlineOrderFulfillmentStatus.IN_KITCHEN;
      case KitchenStatus.PENDING:
      default:
        return OnlineOrderFulfillmentStatus.ACCEPTED;
    }
  }
}
