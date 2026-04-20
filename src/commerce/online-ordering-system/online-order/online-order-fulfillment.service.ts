import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';
import { OnlineDeliveryInfo } from '../online-delivery-info/entities/online-delivery-info.entity';
import { OnlineDeliveryInfoStatus } from '../online-delivery-info/constants/online-delivery-info-status.enum';
import { OnlineOrderStatus } from './constants/online-order-status.enum';
import { OnlineOrderType } from './constants/online-order-type.enum';
import { OnlineOrderFulfillmentStatus } from './constants/online-order-fulfillment-status.enum';
import { OnlineOrderItemStatus } from '../online-order-item/constants/online-order-item-status.enum';
import { OrdersService } from '../../../restaurant-operations/pos/orders/orders.service';
import { OrderType } from '../../../restaurant-operations/pos/orders/constants/order-type.enum';
import { OrderItem } from '../../../restaurant-operations/pos/order-item/entities/order-item.entity';
import { OrderItemStatus } from '../../../restaurant-operations/pos/order-item/constants/order-item-status.enum';
import { OrderItemKitchenStatus } from '../../../restaurant-operations/pos/order-item/constants/order-item-kitchen-status.enum';
import { lineSubtotal } from '../../../restaurant-operations/pos/orders/order-aggregation.util';
import { KitchenOrderService } from '../../../restaurant-operations/kitchen-display-system/kitchen-order/kitchen-order.service';
import { OnlineOrderService } from './online-order.service';
import { OneOnlineOrderResponseDto } from './dto/online-order-response.dto';
import { OnlineOrderRealtimePublisher } from './online-order-realtime.publisher';
import { formatOnlineOrderToDto } from './online-order.mapper';
import {
  computeOnlineOrderTotalAmount,
  resolveCatalogUnitPrice,
} from './online-order-pricing.util';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';

function mapOnlineTypeToOrderType(t: OnlineOrderType): OrderType {
  switch (t) {
    case OnlineOrderType.DELIVERY:
      return OrderType.DELIVERY;
    case OnlineOrderType.PICKUP:
      return OrderType.TAKE_OUT;
    case OnlineOrderType.DINE_IN:
    default:
      return OrderType.DINE_IN;
  }
}

@Injectable()
export class OnlineOrderFulfillmentService {
  constructor(
    @InjectRepository(OnlineOrder)
    private readonly onlineOrderRepository: Repository<OnlineOrder>,
    @InjectRepository(OnlineOrderItem)
    private readonly onlineOrderItemRepository: Repository<OnlineOrderItem>,
    private readonly dataSource: DataSource,
    private readonly ordersService: OrdersService,
    private readonly kitchenOrderService: KitchenOrderService,
    private readonly onlineOrderService: OnlineOrderService,
    private readonly realtimePublisher: OnlineOrderRealtimePublisher,
  ) {}

  async acceptOnlineOrder(
    onlineOrderId: number,
    merchantId: number,
  ): Promise<OneOnlineOrderResponseDto> {
    if (!merchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to accept online orders',
      );
    }

    const precheck = await this.onlineOrderRepository.findOne({
      where: { id: onlineOrderId, merchant_id: merchantId },
    });
    if (!precheck) {
      throw new NotFoundException('Online order not found');
    }
    if (precheck.order_id) {
      return this.onlineOrderService.findOne(onlineOrderId, merchantId);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let posOrderId: number;

    try {
      const oo = await queryRunner.manager.findOne(OnlineOrder, {
        where: { id: onlineOrderId, merchant_id: merchantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!oo) {
        throw new NotFoundException('Online order not found');
      }
      if (oo.order_id) {
        await queryRunner.commitTransaction();
        return this.onlineOrderService.findOne(onlineOrderId, merchantId);
      }
      if (oo.status === OnlineOrderStatus.DELETED) {
        throw new BadRequestException('Cannot accept a deleted online order');
      }
      if (oo.fulfillment_status !== OnlineOrderFulfillmentStatus.RECEIVED) {
        throw new BadRequestException(
          'Only orders in received state can be accepted',
        );
      }

      const lines = await queryRunner.manager.find(OnlineOrderItem, {
        where: {
          online_order_id: oo.id,
          status: OnlineOrderItemStatus.ACTIVE,
        },
      });
      if (lines.length === 0) {
        throw new BadRequestException(
          'Online order has no active items to accept',
        );
      }

      let deliveryAddress: string | null = null;
      if (oo.type === OnlineOrderType.DELIVERY) {
        const info = await queryRunner.manager.findOne(OnlineDeliveryInfo, {
          where: {
            online_order_id: oo.id,
            status: OnlineDeliveryInfoStatus.ACTIVE,
          },
        });
        if (info) {
          deliveryAddress = `${info.address}, ${info.city}`.slice(0, 500);
        }
      }

      const order = await this.ordersService.createOrderForOnlineAcceptanceWithManager(
        queryRunner.manager,
        {
          merchantId: oo.merchant_id,
          customerId: oo.customer_id,
          orderType: mapOnlineTypeToOrderType(oo.type),
          deliveryAddress,
          deliveryFee: 0,
        },
      );
      posOrderId = order.id;

      for (const ooi of lines) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: ooi.product_id },
        });
        if (!product) {
          throw new BadRequestException(
            `Product ${ooi.product_id} not found for online order line`,
          );
        }
        const variant = ooi.variant_id
          ? await queryRunner.manager.findOne(Variant, {
              where: { id: ooi.variant_id },
            })
          : null;
        if (ooi.variant_id && !variant) {
          throw new BadRequestException(
            `Variant ${ooi.variant_id} not found for online order line`,
          );
        }
        const unitPrice = resolveCatalogUnitPrice(product, variant);
        const oi = new OrderItem();
        oi.order_id = order.id;
        oi.product_id = ooi.product_id;
        oi.variant_id = ooi.variant_id;
        oi.quantity = ooi.quantity;
        oi.price = unitPrice;
        oi.discount = 0;
        oi.notes = ooi.notes;
        oi.status = OrderItemStatus.ACTIVE;
        oi.kitchen_status = OrderItemKitchenStatus.PENDING;
        oi.total_price = lineSubtotal({
          quantity: oi.quantity,
          price: oi.price,
          discount: oi.discount,
        });
        const saved = await queryRunner.manager.save(OrderItem, oi);
        ooi.order_item_id = saved.id;
        ooi.kitchen_line_status = OrderItemKitchenStatus.PENDING;
        await queryRunner.manager.save(OnlineOrderItem, ooi);
      }

      oo.order_id = order.id;
      oo.fulfillment_status = OnlineOrderFulfillmentStatus.ACCEPTED;
      oo.accepted_at = new Date();
      await queryRunner.manager.save(OnlineOrder, oo);

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    await this.ordersService.syncOrderAggregates(posOrderId);

    try {
      await this.kitchenOrderService.create({ orderId: posOrderId }, merchantId);
    } catch (e) {
      if (!(e instanceof ConflictException)) {
        throw e;
      }
    }

    return this.onlineOrderService.findOne(onlineOrderId, merchantId);
  }

  async cancelOnlineOrder(
    onlineOrderId: number,
    merchantId: number,
  ): Promise<OneOnlineOrderResponseDto> {
    if (!merchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to cancel online orders',
      );
    }

    const oo = await this.onlineOrderRepository.findOne({
      where: { id: onlineOrderId, merchant_id: merchantId },
    });
    if (!oo) {
      throw new NotFoundException('Online order not found');
    }
    if (oo.status === OnlineOrderStatus.DELETED) {
      throw new BadRequestException('Online order is already deleted');
    }
    if (oo.order_id) {
      throw new BadRequestException(
        'Cannot cancel after the order was accepted; cancel or complete it in the POS',
      );
    }
    if (oo.fulfillment_status === OnlineOrderFulfillmentStatus.CANCELLED) {
      return this.onlineOrderService.findOne(onlineOrderId, merchantId);
    }
    if (oo.fulfillment_status !== OnlineOrderFulfillmentStatus.RECEIVED) {
      throw new BadRequestException(
        'Only received orders that were not accepted can be cancelled here',
      );
    }

    oo.fulfillment_status = OnlineOrderFulfillmentStatus.CANCELLED;
    await this.onlineOrderRepository.save(oo);

    const refreshed = await this.onlineOrderRepository
      .createQueryBuilder('onlineOrder')
      .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
      .leftJoinAndSelect('onlineOrder.store', 'store')
      .leftJoinAndSelect('onlineOrder.order', 'order')
      .leftJoinAndSelect('onlineOrder.customer', 'customer')
      .where('onlineOrder.id = :id', { id: onlineOrderId })
      .getOne();

    if (!refreshed) {
      throw new NotFoundException('Online order not found after cancel');
    }

    const totalAmount = await computeOnlineOrderTotalAmount(
      refreshed,
      this.onlineOrderItemRepository,
    );

    this.realtimePublisher.publishUpdated({
      onlineOrderId: refreshed.id,
      orderId: refreshed.order_id,
      data: formatOnlineOrderToDto(refreshed, totalAmount),
    });

    return {
      statusCode: 200,
      message: 'Online order cancelled successfully',
      data: formatOnlineOrderToDto(refreshed, totalAmount),
    };
  }
}
