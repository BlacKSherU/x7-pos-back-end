import { OnlineOrder } from './entities/online-order.entity';
import { OnlineOrderResponseDto } from './dto/online-order-response.dto';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';
import { OnlineOrderItemNestedInOnlineOrderDto } from '../online-order-item/dto/online-order-item-response.dto';
import { KitchenOrderNestedInOnlineOrderDto } from '../../../restaurant-operations/kitchen-display-system/kitchen-order/dto/kitchen-order-response.dto';
import { KitchenOrder } from '../../../restaurant-operations/kitchen-display-system/kitchen-order/entities/kitchen-order.entity';
import { OnlineOrderItemStatus } from '../online-order-item/constants/online-order-item-status.enum';
import { KitchenOrderStatus } from '../../../restaurant-operations/kitchen-display-system/kitchen-order/constants/kitchen-order-status.enum';
import { resolveUnitPriceForOnlineOrderItem } from './online-order-pricing.util';

/** totalAmount: POS `order.total` si hay enlace; si no, suma catálogo × cantidad (ver online-order-pricing.util). */
export function formatOnlineOrderToDto(
  onlineOrder: OnlineOrder,
  totalAmount: number,
): OnlineOrderResponseDto {
  const dto: OnlineOrderResponseDto = {
    id: onlineOrder.id,
    merchantId: onlineOrder.merchant_id,
    storeId: onlineOrder.store_id,
    orderId: onlineOrder.order_id,
    customerId: onlineOrder.customer_id,
    status: onlineOrder.status,
    type: onlineOrder.type,
    paymentStatus: onlineOrder.payment_status,
    scheduledAt: onlineOrder.scheduled_at,
    placedAt: onlineOrder.placed_at,
    updatedAt: onlineOrder.updated_at,
    totalAmount,
    notes: onlineOrder.notes,
    fulfillmentStatus: onlineOrder.fulfillment_status,
    acceptedAt: onlineOrder.accepted_at,
    readyAt: onlineOrder.ready_at,
    completedAt: onlineOrder.completed_at,
    merchant: {
      id: onlineOrder.merchant.id,
      name: onlineOrder.merchant.name,
    },
    store: {
      id: onlineOrder.store.id,
      subdomain: onlineOrder.store.subdomain,
    },
    order: onlineOrder.order
      ? {
          id: onlineOrder.order.id,
        }
      : null,
    customer: {
      id: onlineOrder.customer.id,
      name: onlineOrder.customer.name,
      email: onlineOrder.customer.email,
    },
  };

  if (onlineOrder.onlineOrderItems?.length) {
    dto.items = onlineOrder.onlineOrderItems
      .filter((i) => i.status !== OnlineOrderItemStatus.DELETED)
      .map((i) => mapOnlineOrderItemNested(i));
  }

  if (onlineOrder.kitchenOrders?.length) {
    dto.kitchenOrders = onlineOrder.kitchenOrders
      .filter((ko) => ko.status !== KitchenOrderStatus.DELETED)
      .map((ko) => mapKitchenOrderNestedInOnline(ko));
  }

  return dto;
}

function mapOnlineOrderItemNested(
  item: OnlineOrderItem,
): OnlineOrderItemNestedInOnlineOrderDto {
  if (!item.product) {
    throw new Error('Product relation is not loaded for online order item');
  }
  return {
    id: item.id,
    onlineOrderId: item.online_order_id,
    productId: item.product_id,
    variantId: item.variant_id,
    quantity: item.quantity,
    unitPrice: resolveUnitPriceForOnlineOrderItem(item),
    modifiers: item.modifiers,
    notes: item.notes,
    status: item.status,
    orderItemId: item.order_item_id,
    kitchenLineStatus: item.kitchen_line_status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    product: {
      id: item.product.id,
      name: item.product.name,
      sku: item.product.sku,
      basePrice: item.product.basePrice
        ? parseFloat(item.product.basePrice.toString())
        : 0,
    },
    variant: item.variant
      ? {
          id: item.variant.id,
          name: item.variant.name,
          price: item.variant.price
            ? parseFloat(item.variant.price.toString())
            : 0,
          sku: item.variant.sku,
        }
      : null,
  };
}

function mapKitchenOrderNestedInOnline(
  ko: KitchenOrder,
): KitchenOrderNestedInOnlineOrderDto {
  if (!ko.merchant) {
    throw new Error('Merchant relation is not loaded for kitchen order');
  }
  return {
    id: ko.id,
    merchantId: ko.merchant_id,
    orderId: ko.order_id,
    onlineOrderId: ko.online_order_id,
    stationId: ko.station_id,
    priority: ko.priority,
    businessStatus: ko.business_status,
    startedAt: ko.started_at,
    completedAt: ko.completed_at,
    notes: ko.notes,
    status: ko.status,
    createdAt: ko.created_at,
    updatedAt: ko.updated_at,
    merchant: {
      id: ko.merchant.id,
      name: ko.merchant.name,
    },
    order: ko.order
      ? {
          id: ko.order.id,
          status: ko.order.status,
        }
      : null,
    station: ko.station
      ? {
          id: ko.station.id,
          name: ko.station.name,
        }
      : null,
  };
}
