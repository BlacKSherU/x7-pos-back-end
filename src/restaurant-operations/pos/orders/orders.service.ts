import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { OrderPayment } from '../order-payments/entities/order-payment.entity';
import { OrderTax } from '../order-taxes/entities/order-tax.entity';
import { OrderItemModifier } from '../order-item-modifiers/entities/order-item-modifier.entity';
import { OrderItemStatus } from '../order-item/constants/order-item-status.enum';
import { OrderSource } from './constants/order-source.enum';
import { DeliveryStatus } from './constants/delivery-status.enum';
import { KitchenStatus } from './constants/kitchen-status.enum';
import {
  applyPaidDerivedFields,
  computeOrderTotal,
  computePaidTotalFromPayments,
  computeSubtotalFromItems,
  computeTaxTotalFromOrderTaxes,
  computeTipTotalFromPayments,
  deriveKitchenStatusFromItems,
  roundMoney,
} from './order-aggregation.util';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetOrdersQueryDto, OrderSortBy } from './dto/get-orders-query.dto';
import { Order } from './entities/order.entity';
import { OrderStatus } from './constants/order-status.enum';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Table } from '../../../restaurant-operations/dining-system/tables/entities/table.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { MerchantSubscription } from '../../../platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import {
  OneOrderResponseDto,
  PaginatedOrdersResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
    @InjectRepository(MerchantSubscription)
    private readonly subscriptionRepo: Repository<MerchantSubscription>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(OrderPayment)
    private readonly orderPaymentRepo: Repository<OrderPayment>,
    @InjectRepository(OrderTax)
    private readonly orderTaxRepo: Repository<OrderTax>,
    @InjectRepository(OrderItemModifier)
    private readonly orderItemModifierRepo: Repository<OrderItemModifier>,
  ) {}

  async create(
    dto: CreateOrderDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    // Validate that the user can only create orders for their own merchant
    if (dto.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only create orders for your own merchant',
      );
    }

    // Validate merchant exists and belongs to user
    const merchant = await this.merchantRepo.findOne({
      where: { id: dto.merchantId },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${dto.merchantId} not found`,
      );
    }

    // Validate table exists and belongs to user merchant
    const table = await this.tableRepo.findOne({ where: { id: dto.tableId } });
    if (!table) {
      throw new NotFoundException(`Table with ID ${dto.tableId} not found`);
    }
    if (table.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Table does not belong to your merchant');
    }

    // Validate collaborator exists and belongs to user merchant
    const collaborator = await this.collaboratorRepo.findOne({
      where: { id: dto.collaboratorId },
    });
    if (!collaborator) {
      throw new NotFoundException(
        `Collaborator with ID ${dto.collaboratorId} not found`,
      );
    }
    if (collaborator.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'Collaborator does not belong to your merchant',
      );
    }

    // Validate subscription exists and belongs to user merchant
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: dto.subscriptionId },
    });
    if (!subscription) {
      throw new NotFoundException(
        `Subscription with ID ${dto.subscriptionId} not found`,
      );
    }
    if (subscription.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'Subscription does not belong to your merchant',
      );
    }

    // Validate customer exists and belongs to user merchant
    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${dto.customerId} not found`,
      );
    }
    if (customer.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Customer does not belong to your merchant');
    }

    // Business rule validations
    // Note: businessStatus and type are validated by class-validator in the DTO

    // Validate closedAt if provided
    let closedAt: Date | null = null;
    if (dto.closedAt) {
      closedAt = new Date(dto.closedAt);
      if (isNaN(closedAt.getTime())) {
        throw new BadRequestException('Invalid closedAt date format');
      }
    }

    const order = new Order();
    order.merchant_id = dto.merchantId;
    order.table_id = dto.tableId;
    order.collaborator_id = dto.collaboratorId;
    order.subscription_id = dto.subscriptionId;
    order.status = dto.businessStatus;
    order.type = dto.type;
    order.customer_id = dto.customerId;
    order.closed_at = closedAt;
    order.logical_status = OrderStatus.ACTIVE;

    order.order_number = await this.nextOrderNumber(dto.merchantId);
    order.source = dto.source ?? OrderSource.POS;
    order.guest_count = dto.guestCount ?? 1;
    order.delivery_address = dto.deliveryAddress ?? null;
    order.delivery_zone_id =
      dto.deliveryZoneId !== undefined ? dto.deliveryZoneId : null;
    order.delivery_fee = roundMoney(dto.deliveryFee ?? 0);
    order.delivery_status = dto.deliveryStatus ?? DeliveryStatus.UNASSIGNED;
    order.tax_total = 0;
    order.discount_total = roundMoney(dto.discountTotal ?? 0);
    order.manual_tip_total = roundMoney(dto.tipTotal ?? 0);
    order.tip_total = order.manual_tip_total;
    order.paid_total = 0;
    order.subtotal = 0;
    order.total = computeOrderTotal(
      0,
      order.discount_total,
      order.tax_total,
      order.tip_total,
      order.delivery_fee,
    );
    applyPaidDerivedFields(order);
    order.kitchen_status = KitchenStatus.PENDING;
    order.ready_at = null;
    order.preparing_at = null;

    const saved = await this.orderRepo.save(order);

    return {
      statusCode: 201,
      message: 'Order created successfully',
      data: this.format(saved),
    };
  }

  async findAll(
    query: GetOrdersQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOrdersResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    // Validate merchant exists
    const merchant = await this.merchantRepo.findOne({
      where: { id: authenticatedUserMerchantId },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${authenticatedUserMerchantId} not found`,
      );
    }

    // Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    if (page < 1) {
      throw new BadRequestException('Page must be >= 1');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Build where clause
    const where: any = {
      merchant_id: authenticatedUserMerchantId,
      logical_status: OrderStatus.ACTIVE,
    };

    if (query.tableId) {
      // Validate table belongs to user merchant
      const table = await this.tableRepo.findOne({
        where: { id: query.tableId },
      });
      if (!table || table.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Table does not belong to your merchant');
      }
      where.table_id = query.tableId;
    }

    if (query.collaboratorId) {
      // Validate collaborator belongs to user merchant
      const collaborator = await this.collaboratorRepo.findOne({
        where: { id: query.collaboratorId },
      });
      if (
        !collaborator ||
        collaborator.merchant_id !== authenticatedUserMerchantId
      ) {
        throw new ForbiddenException(
          'Collaborator does not belong to your merchant',
        );
      }
      where.collaborator_id = query.collaboratorId;
    }

    if (query.subscriptionId) {
      // Validate subscription belongs to user merchant
      const subscription = await this.subscriptionRepo.findOne({
        where: { id: query.subscriptionId },
      });
      if (
        !subscription ||
        subscription.merchant.id !== authenticatedUserMerchantId
      ) {
        throw new ForbiddenException(
          'Subscription does not belong to your merchant',
        );
      }
      where.subscription_id = query.subscriptionId;
    }

    if (query.customerId) {
      // Validate customer belongs to user merchant
      const customer = await this.customerRepo.findOne({
        where: { id: query.customerId },
      });
      if (!customer || customer.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Customer does not belong to your merchant',
        );
      }
      where.customer_id = query.customerId;
    }

    if (query.businessStatus) {
      where.status = query.businessStatus;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.logical_status = query.status;
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(query.createdDate);
      endDate.setHours(23, 59, 59, 999);
      where.created_at = Between(startDate, endDate);
    }

    // Build order clause
    const order: any = {};
    if (query.sortBy) {
      const map: Record<OrderSortBy, string> = {
        [OrderSortBy.CREATED_AT]: 'created_at',
        [OrderSortBy.CLOSED_AT]: 'closed_at',
        [OrderSortBy.BUSINESS_STATUS]: 'status',
        [OrderSortBy.TYPE]: 'type',
        [OrderSortBy.STATUS]: 'logical_status',
      };
      order[map[query.sortBy]] = query.sortOrder || 'DESC';
    } else {
      order.created_at = 'DESC';
    }

    const [rows, total] = await this.orderRepo.findAndCount({
      where,
      order,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      statusCode: 200,
      message: 'Orders retrieved successfully',
      data: rows.map((r) => this.format(r)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid id');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const row = await this.orderRepo.findOne({
      where: { id, logical_status: OrderStatus.ACTIVE },
    });

    if (!row) {
      throw new NotFoundException('Order not found');
    }

    // Ensure ownership
    if (row.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only access orders from your merchant',
      );
    }

    return {
      statusCode: 200,
      message: 'Order retrieved successfully',
      data: this.format(row),
    };
  }

  async update(
    id: number,
    dto: UpdateOrderDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid id');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.orderRepo.findOne({
      where: { id, logical_status: OrderStatus.ACTIVE },
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    // Ensure ownership
    if (existing.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update orders from your merchant',
      );
    }

    const updateData: any = {};

    if (dto.tableId !== undefined) {
      // Validate table exists and belongs to user merchant
      const table = await this.tableRepo.findOne({
        where: { id: dto.tableId },
      });
      if (!table) {
        throw new NotFoundException(`Table with ID ${dto.tableId} not found`);
      }
      if (table.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Table does not belong to your merchant');
      }
      updateData.table_id = dto.tableId;
    }

    if (dto.collaboratorId !== undefined) {
      // Validate collaborator exists and belongs to user merchant
      const collaborator = await this.collaboratorRepo.findOne({
        where: { id: dto.collaboratorId },
      });
      if (!collaborator) {
        throw new NotFoundException(
          `Collaborator with ID ${dto.collaboratorId} not found`,
        );
      }
      if (collaborator.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Collaborator does not belong to your merchant',
        );
      }
      updateData.collaborator_id = dto.collaboratorId;
    }

    if (dto.subscriptionId !== undefined) {
      // Validate subscription exists and belongs to user merchant
      const subscription = await this.subscriptionRepo.findOne({
        where: { id: dto.subscriptionId },
      });
      if (!subscription) {
        throw new NotFoundException(
          `Subscription with ID ${dto.subscriptionId} not found`,
        );
      }
      if (subscription.merchant.id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Subscription does not belong to your merchant',
        );
      }
      updateData.subscription_id = dto.subscriptionId;
    }

    if (dto.businessStatus !== undefined) {
      // Validated by class-validator in DTO
      updateData.status = dto.businessStatus;
    }

    if (dto.type !== undefined) {
      // Validated by class-validator in DTO
      updateData.type = dto.type;
    }

    if (dto.customerId !== undefined) {
      // Validate customer exists and belongs to user merchant
      const customer = await this.customerRepo.findOne({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${dto.customerId} not found`,
        );
      }
      if (customer.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Customer does not belong to your merchant',
        );
      }
      updateData.customer_id = dto.customerId;
    }

    if (dto.closedAt !== undefined) {
      if (dto.closedAt) {
        const closedAt = new Date(dto.closedAt);
        if (isNaN(closedAt.getTime())) {
          throw new BadRequestException('Invalid closedAt date format');
        }
        updateData.closed_at = closedAt;
      } else {
        updateData.closed_at = null;
      }
    }

    await this.orderRepo.update(id, updateData);

    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found after update');
    }

    if (dto.source !== undefined) order.source = dto.source;
    if (dto.guestCount !== undefined) order.guest_count = dto.guestCount;
    if (dto.deliveryAddress !== undefined) {
      order.delivery_address = dto.deliveryAddress ?? null;
    }
    if (dto.deliveryZoneId !== undefined) {
      order.delivery_zone_id = dto.deliveryZoneId ?? null;
    }
    if (dto.deliveryFee !== undefined) {
      order.delivery_fee = roundMoney(dto.deliveryFee);
    }
    if (dto.deliveryStatus !== undefined) {
      order.delivery_status = dto.deliveryStatus;
    }
    if (dto.discountTotal !== undefined) {
      order.discount_total = roundMoney(dto.discountTotal);
    }
    if (dto.tipTotal !== undefined) {
      order.manual_tip_total = roundMoney(dto.tipTotal);
    }

    await this.orderRepo.save(order);
    await this.syncOrderAggregates(id);

    const updated = await this.orderRepo.findOne({ where: { id } });
    if (!updated) {
      throw new NotFoundException('Order not found after update');
    }

    return {
      statusCode: 200,
      message: 'Order updated successfully',
      data: this.format(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid id');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.orderRepo.findOne({
      where: { id, logical_status: OrderStatus.ACTIVE },
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    // Ensure ownership
    if (existing.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete orders from your merchant',
      );
    }

    await this.orderRepo.update(id, { logical_status: OrderStatus.DELETED });

    return {
      statusCode: 200,
      message: 'Order deleted successfully',
      data: this.format(existing),
    };
  }

  /**
   * Recomputes subtotal from line items, tax_total from order_taxes, tip_total
   * (manual_tip_total + sum of payment tip_amount), order total, paid_total from
   * order_payments, kitchen roll-up, balance_due and is_paid.
   * Call after order-item, order-item-modifier, order-tax or order-payment create / update / delete, or after changing order-level discount/tip/delivery.
   */
  async syncOrderAggregates(orderId: number): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) return;

    const items = await this.orderItemRepo.find({
      where: { order_id: orderId },
    });

    const payments = await this.orderPaymentRepo.find({
      where: { order_id: orderId },
    });

    const taxes = await this.orderTaxRepo.find({
      where: { order_id: orderId },
    });

    const modifierAddonByItemId =
      await this.buildModifierAddonByOrderItemId(items);

    order.subtotal = computeSubtotalFromItems(items, modifierAddonByItemId);
    order.tax_total = computeTaxTotalFromOrderTaxes(taxes);

    const tipsFromPayments = computeTipTotalFromPayments(payments);
    const manualTip = roundMoney(Number(order.manual_tip_total ?? 0));
    order.tip_total = roundMoney(manualTip + tipsFromPayments);

    order.total = computeOrderTotal(
      Number(order.subtotal),
      Number(order.discount_total),
      Number(order.tax_total),
      Number(order.tip_total),
      Number(order.delivery_fee),
    );

    order.paid_total = computePaidTotalFromPayments(payments);

    const nextKitchen = deriveKitchenStatusFromItems(items);
    order.kitchen_status = nextKitchen;
    if (nextKitchen === KitchenStatus.PREPARING && !order.preparing_at) {
      order.preparing_at = new Date();
    }
    if (nextKitchen === KitchenStatus.READY && !order.ready_at) {
      order.ready_at = new Date();
    }

    applyPaidDerivedFields(order);
    await this.orderRepo.save(order);
  }

  /** Per active order item: sum(modifier.price × item.quantity). */
  private async buildModifierAddonByOrderItemId(
    items: OrderItem[],
  ): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    const active = items.filter((i) => i.status === OrderItemStatus.ACTIVE);
    const itemIds = active.map((i) => i.id);
    if (itemIds.length === 0) return map;

    const mods = await this.orderItemModifierRepo.find({
      where: {
        order_item_id: itemIds.length === 1 ? itemIds[0] : In(itemIds),
      },
    });

    const itemById = new Map(active.map((i) => [i.id, i]));
    for (const m of mods) {
      const item = itemById.get(m.order_item_id);
      if (!item) continue;
      const piece = roundMoney(Number(m.price) * Number(item.quantity));
      map.set(
        m.order_item_id,
        roundMoney((map.get(m.order_item_id) ?? 0) + piece),
      );
    }
    return map;
  }

  private async nextOrderNumber(merchantId: number): Promise<string> {
    const raw = await this.orderRepo
      .createQueryBuilder('o')
      .select('MAX(CAST(o.order_number AS INTEGER))', 'maxn')
      .where('o.merchant_id = :mid', { mid: merchantId })
      .getRawOne<{ maxn: string | null }>();

    const n = raw?.maxn != null && raw.maxn !== '' ? parseInt(raw.maxn, 10) : 0;
    const next = Number.isFinite(n) ? n + 1 : 1;
    const str = String(next);
    return str.length > 20 ? str.slice(0, 20) : str.padStart(6, '0');
  }

  private format(row: Order): OrderResponseDto {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      tableId: row.table_id,
      collaboratorId: row.collaborator_id,
      subscriptionId: row.subscription_id,
      businessStatus: row.status,
      type: row.type,
      customerId: row.customer_id,
      status: row.logical_status,
      orderNumber: row.order_number,
      source: row.source,
      guestCount: row.guest_count,
      subtotal: Number(row.subtotal),
      taxTotal: Number(row.tax_total),
      discountTotal: Number(row.discount_total),
      tipTotal: Number(row.tip_total),
      total: Number(row.total),
      paidTotal: Number(row.paid_total),
      balanceDue: Number(row.balance_due),
      isPaid: row.is_paid,
      deliveryAddress: row.delivery_address,
      deliveryZoneId: row.delivery_zone_id,
      deliveryFee: Number(row.delivery_fee),
      deliveryStatus: row.delivery_status,
      kitchenStatus: row.kitchen_status,
      readyAt: row.ready_at,
      preparingAt: row.preparing_at,
      createdAt: row.created_at,
      closedAt: row.closed_at,
      updatedAt: row.updated_at,
    };
  }
}
