import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  Repository,
  Between,
  In,
  DataSource,
  type FindOptionsOrder,
  type FindOptionsWhere,
} from 'typeorm';
// It is imported from the root of the package: typeorm's `exports` does not publish the deep path `typeorm/query-builder/QueryPartialEntity`, so tsc resolved it but jest did not.
import type { QueryDeepPartialEntity } from 'typeorm';
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
import { dayBoundsInTimeZone } from 'src/common/utils/time-zone.util';
import { CashFlowService } from '../../cashdrawer/cash-shifts/cash-flow.service';
import { CashShift } from '../../cashdrawer/cash-shifts/entities/cash-shift.entity';
import { CashShiftStatus } from '../../cashdrawer/cash-shifts/constants/cash-shift-status.enum';
import { CashShiftMovementType } from '../../cashdrawer/cash-shifts/constants/cash-shift-movement-type.enum';
import {
  lockMerchantScope,
  MerchantLockScope,
} from 'src/common/utils/merchant-lock.util';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import {
  OneOrderResponseDto,
  PaginatedOrdersResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';
import { OrderItemResponseDto } from '../order-item/dto/order-item-response.dto';
import { KitchenOrder } from '../../kitchen-display-system/kitchen-order/entities/kitchen-order.entity';
import { KitchenOrderStatus } from '../../kitchen-display-system/kitchen-order/constants/kitchen-order-status.enum';
import { KitchenOrderNestedInOrderDto } from '../../kitchen-display-system/kitchen-order/dto/kitchen-order-response.dto';
import { OnlineOrderStatus } from '../../../commerce/online-ordering-system/online-order/constants/online-order-status.enum';
import { formatOnlineOrderToDto } from '../../../commerce/online-ordering-system/online-order/online-order.mapper';
import { OrderType } from './constants/order-type.enum';
import { OrderBusinessStatus } from './constants/order-business-status.enum';
import { OnlineOrderSyncService } from '../../../commerce/online-ordering-system/online-order/online-order-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ORDER_FULLY_PAID_EVENT,
  ORDER_LOYALTY_REVERSAL_EVENT,
} from '../../../inventory/sale-inventory/order-paid.events';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { ShiftsService } from 'src/restaurant-operations/shift/shifts/shifts.service';
import { TipSettlement } from 'src/restaurant-operations/tips/tip-settlements/entities/tip-settlement.entity';
import { ProcessPaymentDto } from '../order-payments/dto/process-payment.dto';
import { SettlementMethod } from 'src/restaurant-operations/tips/tip-settlements/constants/settlement-method.enum';
import { ShiftRole } from 'src/restaurant-operations/shift/shifts/constants/shift-role.enum';
import { MerchantTipRule } from 'src/core/configuration/merchant-tip-rule/entity/merchant-tip-rule-entity';
import { MerchantTaxRule } from 'src/core/configuration/merchant-tax-rule/entity/merchant-tax-rule.entity';
import { TaxType } from 'src/core/configuration/constants/tax-type.enum';
import { TipDistributionMethod } from 'src/core/configuration/constants/tip-distribution-method.enum';
import { CompletePurchaseDto } from './dto/complete-purchase.dto';
import { Receipt } from 'src/core/billing-transactions/receipts/entities/receipt.entity';
import { ReceiptsService } from 'src/core/billing-transactions/receipts/receipts.service';
import { ReceiptType } from 'src/core/billing-transactions/receipts/constants/receipt-type.enum';
import { SettlementStatus } from 'src/restaurant-operations/tips/tip-settlements/constants/settlement-status.enum';
import { RefundOrderDto } from './dto/refund-order.dto';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { ShiftStatus } from 'src/restaurant-operations/shift/shifts/constants/shift-status.enum';
import { LoyaltyCustomer } from 'src/growth/loyalty/loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyPointTransaction } from 'src/growth/loyalty/loyalty-points-transaction/entities/loyalty-points-transaction.entity';
import { LoyaltyPointsSource } from 'src/growth/loyalty/loyalty-points-transaction/constants/loyalty-points-source.enum';
import { MoreThan } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

/**
 * Business status once the payments are re-summed (every payment path goes through it).
 * - fully paid (with something actually paid) → PAID;
 * - a refund that leaves a balance due on a PAID order → PARTIALLY_REFUNDED;
 * - something paid but a balance due (a split bill under way, or items added to a paid
 *   order) → PARTIALLY_PAID; nothing paid any more → back to PENDING;
 * - cancelled and refunded orders keep their status.
 */
function nextBusinessStatusAfterPayments(
  status: OrderBusinessStatus,
  payment: { isPaid: boolean; paidTotal: number; hasRefund: boolean },
): OrderBusinessStatus {
  if (
    status === OrderBusinessStatus.CANCELLED ||
    status === OrderBusinessStatus.PARTIALLY_REFUNDED
  ) {
    return status;
  }
  // is_paid is also true for an order whose total is 0 (no items yet, or all removed):
  // that is not a payment
  if (payment.isPaid && payment.paidTotal > 0) {
    return OrderBusinessStatus.PAID;
  }
  if (payment.hasRefund && status === OrderBusinessStatus.PAID) {
    return OrderBusinessStatus.PARTIALLY_REFUNDED;
  }
  if (payment.paidTotal > 0) {
    return OrderBusinessStatus.PARTIALLY_PAID;
  }
  return status === OrderBusinessStatus.PARTIALLY_PAID
    ? OrderBusinessStatus.PENDING
    : status;
}

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
    private readonly onlineOrderSyncService: OnlineOrderSyncService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    private readonly shiftService: ShiftsService,
    @InjectRepository(TipSettlement)
    private readonly tipSettlementRepo: Repository<TipSettlement>,
    private readonly dataSource: DataSource,
    @InjectRepository(MerchantTipRule)
    private readonly merchantTipRuleRepo: Repository<MerchantTipRule>,
    @InjectRepository(MerchantTaxRule)
    private readonly merchantTaxRuleRepo: Repository<MerchantTaxRule>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    private readonly receiptService: ReceiptsService,
    @InjectRepository(LoyaltyCustomer)
    private readonly loyaltyCustomerRepo: Repository<LoyaltyCustomer>,
    @InjectRepository(LoyaltyPointTransaction)
    private readonly loyaltyPointTransactionRepo: Repository<LoyaltyPointTransaction>,
    private readonly cashFlowService: CashFlowService,
  ) {}

  /**
   * Open cash shift that takes in (or pays out) the cash of a processPayment / refundOrder,
   * locked like order-payments locks it: the one given, else the one the user opened, else
   * the merchant's only open shift. With several open and none chosen it refuses rather
   * than guess the drawer.
   */
  private async resolveCashShiftForCash(
    manager: EntityManager,
    merchantId: number,
    userId: number,
    cashShiftId?: number,
  ): Promise<{ shift: CashShift; collaboratorId: number }> {
    const lock = { mode: 'pessimistic_write' as const };
    const collaborator = await manager.findOne(Collaborator, {
      where: { user_id: userId, merchant_id: merchantId },
    });

    let shift: CashShift | null = null;
    if (cashShiftId != null) {
      shift = await manager.findOne(CashShift, {
        where: { id: cashShiftId, merchantId, status: CashShiftStatus.OPEN },
        lock,
      });
      if (!shift) {
        throw new BadRequestException(
          `Cash shift ${cashShiftId} is not an open cash shift of your merchant`,
        );
      }
    } else {
      if (collaborator) {
        shift = await manager.findOne(CashShift, {
          where: {
            merchantId,
            openedBy: collaborator.id,
            status: CashShiftStatus.OPEN,
          },
          lock,
        });
      }
      if (!shift) {
        const open = await manager.find(CashShift, {
          where: { merchantId, status: CashShiftStatus.OPEN },
          lock,
        });
        if (open.length === 1) {
          shift = open[0];
        } else {
          throw new BadRequestException(
            open.length === 0
              ? 'Cash moves through a cash drawer: open a cash shift first.'
              : 'Several cash shifts are open: send cashShiftId to say which drawer takes the cash.',
          );
        }
      }
    }
    return { shift, collaboratorId: collaborator?.id ?? shift.openedBy };
  }

  async create(
    dto: CreateOrderDto,
    authenticatedUserMerchantId: number,
    activeShiftId?: number,
  ): Promise<OneOrderResponseDto> {
    let subtotal = 0;
    const orderItems: OrderItem[] = [];
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

    // Take-out and delivery orders have no table; dine-in orders must have one
    if (dto.type === OrderType.DINE_IN && dto.tableId == null) {
      throw new BadRequestException('tableId is required for dine_in orders');
    }
    if (dto.tableId != null) {
      const table = await this.tableRepo.findOne({
        where: { id: dto.tableId },
      });
      if (!table) {
        throw new NotFoundException(`Table with ID ${dto.tableId} not found`);
      }
      if (table.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Table does not belong to your merchant');
      }
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

    // merchant_subscription is deprecated: access comes from the company subscription,
    // which FeatureAccessGuard already checks. The link stays optional for older clients.
    if (dto.subscriptionId != null) {
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

    // Validate closedAt if provided
    let closedAt: Date | null = null;
    if (dto.closedAt) {
      closedAt = new Date(dto.closedAt);
      if (isNaN(closedAt.getTime())) {
        throw new BadRequestException('Invalid closedAt date format');
      }
    }
    // Optional line items; POS can add more later via order-item endpoints
    for (const item of dto.items ?? []) {
      const product = await this.productsRepo.findOne({
        where: { id: item.productId, merchantId: merchant.id },
      });

      if (!product) {
        throw new BadRequestException(
          `The Product ${item.productId} does not belong to your merchant`,
        );
      }

      // Price, Quantity, Discount and Total Price for each item
      const price = product.basePrice;
      const quantity = item.quantity;
      const discount = item.discount || 0;
      const totalPrice = roundMoney(price * quantity - discount);
      subtotal = roundMoney(subtotal + totalPrice);

      // Create OrderItem instances for each item in the order
      const orderItem = new OrderItem();
      orderItem.product_id = product.id;
      orderItem.variant_id = item.variantId ?? null;
      orderItem.quantity = quantity;
      orderItem.price = price;
      orderItem.discount = discount;
      orderItem.total_price = totalPrice;
      orderItem.notes = item.notes ?? null;

      orderItems.push(orderItem);
    }
    // Find active shift for merchant
    const activeShift = await this.shiftService.findActiveShiftByMerchant(
      merchant.id,
    );

    if (!activeShift) {
      throw new BadRequestException('No active shift found for this merchant');
    }

    const order = new Order();
    order.merchant_id = dto.merchantId;
    order.table_id = dto.tableId ?? null;
    order.collaborator_id = dto.collaboratorId;
    order.subscription_id = dto.subscriptionId ?? null;
    order.type = dto.type;
    order.customer_id = dto.customerId;
    order.closed_at = closedAt;
    order.logical_status = OrderStatus.ACTIVE;
    order.shift = activeShift;
    order.shift_id = activeShift.id;
    order.status = dto.businessStatus ?? OrderBusinessStatus.PENDING;
    order.subtotal = subtotal;

    order.source = dto.source ?? OrderSource.POS;
    order.guest_count = dto.guestCount ?? 1;
    order.delivery_address = dto.deliveryAddress ?? null;
    if (dto.deliveryZoneId != null) {
      await this.assertDeliveryZoneOpen(
        dto.deliveryZoneId,
        authenticatedUserMerchantId,
      );
    }
    order.delivery_zone_id =
      dto.deliveryZoneId !== undefined ? dto.deliveryZoneId : null;
    order.delivery_fee = roundMoney(dto.deliveryFee ?? 0);
    order.delivery_status = dto.deliveryStatus ?? DeliveryStatus.UNASSIGNED;
    order.tax_total = 0;
    order.discount_total = roundMoney(dto.discountTotal ?? 0);
    order.paid_total = 0;

    // For new orders, tip_total is just the manual tip since there are no payments yet
    order.total = computeOrderTotal(
      subtotal,
      order.discount_total,
      order.tax_total,
      0,
      order.delivery_fee,
    );

    // Initially, balance_due is the same as total since no payments have been made
    order.balance_due = order.total;
    // New orders are not paid yet
    order.is_paid = false;
    // Kitchen status starts as pending until items are prepared
    order.orderItems = orderItems;

    applyPaidDerivedFields(order);
    order.kitchen_status = KitchenStatus.PENDING;
    order.ready_at = null;
    order.preparing_at = null;
    order.cash_shift_id = activeShiftId ?? null;

    // Save order to get an ID for the order items (numbers are handed out while saving)
    const saved = await this.orderRepo.manager.transaction((manager) =>
      this.insertWithOrderNumbers(manager, order, { dailyTicket: true }),
    );

    // Now that we have the order ID, we can save the order items with the correct order_id
    const orderWithRelations = await this.orderRepo.findOne({
      where: { id: saved.id },
      relations: ['orderItems', 'orderItems.product', 'orderItems.variant'],
    });

    if (!orderWithRelations) {
      throw new NotFoundException('Order not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Order created successfully',
      data: this.format(orderWithRelations),
    };
  }

  // Generates a daily ticket ID in the format "Ticket n.º XX" where XX is a zero-padded number that resets each day for each merchant
  /**
   * Una zona de reparto sólo acepta pedidos mientras está `active`: pasarla a inactive o
   * maintenance (lluvia, tráfico…) bloquea al instante los pedidos nuevos que apunten a ella.
   * SQL directo para no arrastrar el módulo de reparto (y sus repos) al de pedidos.
   */
  private async assertDeliveryZoneOpen(
    zoneId: number,
    merchantId: number,
  ): Promise<void> {
    const rows: Array<{ name: string; status: string }> =
      await this.dataSource.query(
        'SELECT name, status FROM delivery_zones WHERE id = $1 AND merchant_id = $2',
        [zoneId, merchantId],
      );
    const zone = rows[0];
    if (!zone || zone.status === 'deleted') {
      throw new NotFoundException(`Delivery zone ${zoneId} not found`);
    }
    if (zone.status !== 'active') {
      throw new BadRequestException(
        `Delivery zone "${zone.name}" is ${zone.status} and is not accepting orders`,
      );
    }
  }

  /**
   * Pedido mínimo de la tarifa activa de la zona: por debajo no se cierra el reparto, y el
   * mensaje dice cuánto falta. Sin tarifa activa o sin mínimo no hay nada que comprobar.
   */
  private async assertDeliveryMinOrder(
    zoneId: number,
    merchantId: number,
    subtotal: number,
  ): Promise<void> {
    const rows: Array<{ min_order_amount: string | null }> =
      await this.dataSource.query(
        `SELECT f.min_order_amount
           FROM delivery_fees f
           JOIN delivery_zones z ON z.id = f.delivery_zone_id
          WHERE f.delivery_zone_id = $1
            AND z.merchant_id = $2
            AND f.status = 'active'
          LIMIT 1`,
        [zoneId, merchantId],
      );
    const min = rows[0]?.min_order_amount;
    if (min == null) return;
    const shortfall = roundMoney(Number(min) - subtotal);
    if (shortfall > 0) {
      throw new BadRequestException(
        `Add $${shortfall.toFixed(2)} more to reach the $${Number(min).toFixed(2)} minimum order for delivery`,
      );
    }
  }

  /**
   * Daily ticket number: today's orders of the merchant + 1, where "today" is the calendar
   * day in the merchant's time zone (it used to reset at the server's midnight, UTC on
   * Railway — 19:00 or 20:00 for a restaurant in New York).
   */
  private async generateDailyTicketId(
    manager: EntityManager,
    merchantId: number,
  ): Promise<string> {
    const merchant = await manager.findOne(Merchant, {
      where: { id: merchantId },
      select: ['id', 'timezone'],
    });
    const { start, end } = dayBoundsInTimeZone(
      new Date(),
      merchant?.timezone || 'UTC',
    );

    // counted under the merchant's order-numbering lock (see insertWithOrderNumbers)
    const count = await manager.getRepository(Order).count({
      where: {
        merchant_id: merchantId,
        created_at: Between(start, new Date(end.getTime() - 1)),
      },
    });

    const nextNumber = (count + 1).toString().padStart(2, '0');
    return `Ticket n.º ${nextNumber}`;
  }

  // Completes the purchase of an order by validating its status, enforcing discount limits based on user role, recalculating totals for data integrity, updating the order status to COMPLETED, and saving the changes to the database. Returns the updated order details in a structured response format.
  async completePurchase(
    orderId: number,
    dto: CompletePurchaseDto,
    user: AuthenticatedUser,
  ): Promise<OneOrderResponseDto> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['orderItems'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // a pending order can be completed even after a first partial payment
    if (
      order.status !== OrderBusinessStatus.PENDING &&
      order.status !== OrderBusinessStatus.PARTIALLY_PAID
    ) {
      throw new BadRequestException(
        'Order must be in pending or partially_paid state',
      );
    }

    // Enforce discount limits based on user role
    const maxDiscount = user.role === UserRole.MERCHANT_ADMIN ? 0.5 : 0.1;

    // Ensure discount does not exceed allowed percentage of subtotal
    if (order.discount_total > order.subtotal * maxDiscount) {
      throw new ForbiddenException('Discount exceeds allowed limit');
    }

    // Recalculate subtotal, taxes, and total to ensure data integrity
    let subtotal = 0;
    for (const item of order.orderItems) {
      subtotal = roundMoney(subtotal + Number(item.total_price));
    }

    if (order.type === OrderType.DELIVERY && order.delivery_zone_id != null) {
      await this.assertDeliveryMinOrder(
        order.delivery_zone_id,
        order.merchant_id,
        subtotal,
      );
    }

    const merchantTaxes = dto.merchantTaxRuleIds?.length
      ? await this.merchantTaxRuleRepo.find({
          where: {
            id: In(dto.merchantTaxRuleIds),
            merchant_id: order.merchant_id,
            status: 'active',
          },
        })
      : await this.merchantTaxRuleRepo.find({
          where: {
            merchant_id: order.merchant_id,
            status: 'active',
          },
        });

    let taxTotal = 0;
    const orderTaxes: OrderTax[] = [];

    for (const tax of merchantTaxes) {
      let taxAmount = 0;

      switch (tax.taxType) {
        case TaxType.PERCENTAGE:
        case TaxType.COMPOUND:
          for (const item of order.orderItems) {
            const itemTax = roundMoney(
              Number(item.total_price) * Number(tax.rate),
            );
            taxAmount = roundMoney(taxAmount + itemTax);
          }
          break;

        case TaxType.FIXED:
          // Applied once per order, not per item.
          taxAmount = roundMoney(Number(tax.rate));
          break;

        default:
          taxAmount = 0;
      }

      taxTotal = roundMoney(taxTotal + taxAmount);

      const orderTax = new OrderTax();
      orderTax.name = tax.name;
      orderTax.rate = Number(tax.rate);
      orderTax.amount = taxAmount;

      orderTaxes.push(orderTax);
    }

    // Compute final total including subtotal, taxes, discounts, and delivery fee
    const total = computeOrderTotal(
      Number(subtotal),
      Number(order.discount_total),
      Number(taxTotal),
      0,
      Number(order.delivery_fee),
    );

    order.subtotal = subtotal;
    order.tax_total = taxTotal;
    order.total = total;
    order.balance_due = total;
    order.status = OrderBusinessStatus.COMPLETED;

    order.merchant_tax_rule_ids = dto.merchantTaxRuleIds;

    applyPaidDerivedFields(order);

    const savedOrder = await this.orderRepo.save(order);

    // Save order taxes with the correct order_id
    for (const tax of orderTaxes) {
      tax.order = savedOrder;
    }

    await this.orderTaxRepo.save(orderTaxes);

    const result = await this.orderRepo.findOne({
      where: { id: savedOrder.id },
      relations: [
        'orderItems',
        'orderItems.product',
        'orderItems.variant',
        'orderTaxes',
      ],
    });

    if (!result) {
      throw new NotFoundException('Order not found after completion');
    }

    return {
      statusCode: 200,
      message: 'Order completed successfully',
      data: this.format(result),
    };
  }

  // Process Payment for an order, creating OrderPayment records, updating order status to PAID, and handling tip settlements based on the provided tip type and configuration
  async processPayment(
    dto: ProcessPaymentDto,
    merchantId: number,
    user: AuthenticatedUser,
  ) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId },
      relations: ['merchant', 'orderItems', 'orderItems.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (Number(order.merchant.id) !== Number(merchantId)) {
      throw new ForbiddenException('Access denied');
    }

    if (order.status !== OrderBusinessStatus.COMPLETED) {
      throw new BadRequestException('Only completed orders can be paid');
    }

    if (!dto.payments || dto.payments.length === 0) {
      throw new BadRequestException('At least one payment is required');
    }

    if (!dto.source) {
      throw new BadRequestException('Source is required');
    }

    dto.payments.forEach((p) => {
      if (p.amount <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0');
      }

      if (p.tipAmount && p.tipAmount < 0) {
        throw new BadRequestException('Tip amount cannot be negative');
      }
    });

    // Calculate total payments and compare to order total for validation
    const totalPayments = roundMoney(
      dto.payments.reduce((sum, p) => sum + p.amount, 0),
    );

    const orderTotal = roundMoney(order.total);

    const difference = roundMoney(totalPayments - orderTotal);

    if (Math.abs(difference) > 0.01) {
      throw new BadRequestException('Payment total does not match order total');
    }

    // Find active shift for merchant to associate payments and tips
    const shift = await this.shiftService.findActiveShiftByMerchant(merchantId);

    if (!shift) {
      throw new BadRequestException('No active shift found');
    }

    const existingReceipt = await this.receiptRepo.findOne({
      where: { order_id: order.id },
    });

    if (existingReceipt) {
      throw new BadRequestException('Receipt already exists for this order');
    }

    // Use a transaction to ensure all payment and tip records are created atomically
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const payment of dto.payments) {
        await queryRunner.manager.save(OrderPayment, {
          order_id: order.id,
          amount: payment.amount,
          method: payment.method,
          tip_amount: payment.tipAmount || 0,
          is_refund: false,
          shift_id: shift.id,
          source: dto.source,
        });
      }

      // Cash goes into a drawer, as with order-payments: before, it was recorded on the
      // order but never reached the drawer, so closing showed it as missing.
      const cashPayments = dto.payments.filter(
        (p) => p.method.toLowerCase() === 'cash',
      );
      if (cashPayments.length > 0) {
        const cash = await this.resolveCashShiftForCash(
          queryRunner.manager,
          merchantId,
          user.id,
          dto.cashShiftId,
        );
        for (const payment of cashPayments) {
          await this.cashFlowService.addMovement(
            cash.shift.id,
            roundMoney(payment.amount + (payment.tipAmount || 0)),
            CashShiftMovementType.IN,
            order.id,
            cash.collaboratorId,
            cash.shift.cashDrawerId,
            queryRunner.manager,
          );
        }
      }

      const merchantTipRule = dto.merchantTipRuleId
        ? await this.merchantTipRuleRepo.findOne({
            where: {
              id: dto.merchantTipRuleId,
              merchant_id: merchantId,
              status: 'active',
            },
          })
        : await this.merchantTipRuleRepo.findOne({
            where: {
              merchant_id: merchantId,
              status: 'active',
            },
          });

      if (!merchantTipRule) {
        throw new BadRequestException('No active merchant tip rule found');
      }

      const totalTip = roundMoney(
        dto.payments.reduce((sum, p) => sum + (p.tipAmount || 0), 0),
      );

      order.tip_total = totalTip;
      order.paid_total = totalPayments;

      applyPaidDerivedFields(order);

      order.status = OrderBusinessStatus.PAID;

      order.merchant_tip_rule_id = merchantTipRule.id;

      await queryRunner.manager.save(order);

      const invoiceNumber =
        await this.receiptService.generateInvoiceNumber(merchantId);

      const receipt = queryRunner.manager.create(Receipt, {
        order_id: order.id,
        merchant_id: merchantId,

        invoice_number: invoiceNumber,

        type: ReceiptType.INVOICE,

        subtotal: order.subtotal,
        total_tax: order.tax_total,
        total_discount: order.discount_total,
        grand_total: order.total,

        fiscal_data: JSON.stringify({
          taxId: order.merchant_tax_rule_ids,
          businessName: order.merchant.name,
          address: order.merchant.address,
        }),

        currency: dto.currency,

        processed_by_user_id: user.id,
        processed_by_role: user.role,

        is_locked: true,

        order_snapshot: {
          orderId: order.id,
          orderNumber: order.order_number,

          subtotal: order.subtotal,
          taxTotal: order.tax_total,
          discountTotal: order.discount_total,
          total: order.total,

          paidTotal: totalPayments,
          tipTotal: totalTip,

          items: order.orderItems?.map((item) => ({
            product_id: item.product_id,
            productName: item.product?.name,

            quantity: item.quantity,
            price: item.price,

            totalPrice: item.total_price,
            notes: item.notes,
          })),

          payments: dto.payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            tipAmount: p.tipAmount || 0,
          })),
        },
      });

      await queryRunner.manager.save(receipt);

      // Handle tip settlements based on the provided tip type and configuration
      for (const payment of dto.payments) {
        const tipAmount = roundMoney(payment.tipAmount || 0);

        if (tipAmount <= 0) {
          continue;
        }

        const settlementMethod =
          payment.method === 'cash'
            ? SettlementMethod.CASH
            : SettlementMethod.BANK_TRANSFER;

        switch (merchantTipRule.tipDistributionMethod) {
          case TipDistributionMethod.INDIVIDUAL: {
            const collaboratorId = order.collaborator_id;

            if (!collaboratorId) {
              throw new BadRequestException(
                'Order has no assigned collaborator',
              );
            }

            await queryRunner.manager.save(TipSettlement, {
              shift_id: shift.id,
              collaborator_id: collaboratorId,
              company_id: order.merchant.companyId,
              total_amount: tipAmount,
              settlement_method: settlementMethod,
              type: 'Direct',
              merchant_id: merchantId,
              settled_by: null,
              settled_at: null,

              status: SettlementStatus.PENDING,

              order_id: order.id,
            });

            break;
          }

          case TipDistributionMethod.POOL: {
            const collaborators = await this.shiftService.getShiftCollaborators(
              shift.id,
            );

            if (!collaborators || collaborators.length === 0) {
              throw new BadRequestException('No collaborators found for shift');
            }

            const baseAmount = tipAmount / collaborators.length;

            const amounts = collaborators.map(() => roundMoney(baseAmount));

            const sum = amounts.reduce((a, b) => a + b, 0);
            const diff = roundMoney(tipAmount - sum);

            amounts[amounts.length - 1] += diff;

            for (let i = 0; i < collaborators.length; i++) {
              await queryRunner.manager.save(TipSettlement, {
                collaborator_id: collaborators[i].id,
                shift_id: shift.id,
                total_amount: amounts[i],
                settlement_method: settlementMethod,
                type: 'Shared',
                merchant_id: merchantId,
                company_id: order.merchant.companyId,
                settled_by: null,
                settled_at: null,

                status: SettlementStatus.PENDING,

                order_id: order.id,
              });
            }

            break;
          }

          case TipDistributionMethod.ROLE_BASED: {
            const allCollaborators =
              await this.shiftService.getShiftCollaborators(shift.id);

            const STAFF_ROLES = [ShiftRole.WAITER, ShiftRole.BARTENDER];

            const KITCHEN_ROLES = [ShiftRole.COOK];

            const MANAGER_ROLES = [ShiftRole.MANAGER];

            const staff = allCollaborators.filter((c) =>
              STAFF_ROLES.includes(c.role),
            );

            const kitchen = allCollaborators.filter((c) =>
              KITCHEN_ROLES.includes(c.role),
            );

            const managers = allCollaborators.filter((c) =>
              MANAGER_ROLES.includes(c.role),
            );

            const groups = [
              {
                collaborators: staff,
                percentage: Number(merchantTipRule.staffPercentage ?? 0),
                type: 'Divided-Staff',
              },
              {
                collaborators: kitchen,
                percentage: Number(merchantTipRule.kitchenPercentage ?? 0),
                type: 'Divided-Kitchen',
              },
              {
                collaborators: managers,
                percentage: Number(merchantTipRule.managerPercentage ?? 0),
                type: 'Divided-Manager',
              },
            ];

            // Only groups with collaborators and percentage > 0
            const activeGroups = groups.filter(
              (g) => g.collaborators.length > 0 && g.percentage > 0,
            );

            if (activeGroups.length === 0) {
              throw new BadRequestException(
                'No collaborators available for tip distribution',
              );
            }

            // Total percentage of active groups
            const totalPct = activeGroups.reduce(
              (sum, g) => sum + g.percentage,
              0,
            );

            if (totalPct <= 0) {
              throw new BadRequestException(
                'Invalid tip distribution percentages',
              );
            }

            let distributedTotal = 0;

            for (
              let groupIndex = 0;
              groupIndex < activeGroups.length;
              groupIndex++
            ) {
              const group = activeGroups[groupIndex];

              // Normalize percentage
              const normalizedPct = group.percentage / totalPct;

              let groupAmount = roundMoney(tipAmount * normalizedPct);

              // Adjust last group to avoid rounding issues
              if (groupIndex === activeGroups.length - 1) {
                groupAmount = roundMoney(tipAmount - distributedTotal);
              }

              distributedTotal += groupAmount;

              const baseAmount = groupAmount / group.collaborators.length;

              const amounts = group.collaborators.map(() =>
                roundMoney(baseAmount),
              );

              // Adjust collaborator rounding
              const amountsSum = amounts.reduce((a, b) => a + b, 0);

              const diff = roundMoney(groupAmount - amountsSum);

              amounts[amounts.length - 1] += diff;

              for (let i = 0; i < group.collaborators.length; i++) {
                await queryRunner.manager.save(TipSettlement, {
                  collaborator_id: group.collaborators[i].id,
                  shift_id: shift.id,
                  total_amount: amounts[i],
                  settlement_method: settlementMethod,
                  type: group.type,
                  merchant_id: merchantId,
                  company_id: order.merchant.companyId,
                  settled_at: null,
                  settled_by: null,

                  status: SettlementStatus.PENDING,

                  order_id: order.id,
                });
              }
            }

            break;
          }
          default:
            throw new BadRequestException('Invalid tip type');
        }
      }
      await queryRunner.commitTransaction();

      // Same after-commit event as a payment through order-payments: it deducts the
      // inventory, awards loyalty points and releases the table group (each listener
      // claims the order, so it runs once). Orders paid here used to skip all three.
      if (order.is_paid) {
        this.emitOrderFullyPaid(order.id);
      }

      return {
        success: true,
        message: 'Payment processed successfully',
        data: {
          orderId: order.id,
          invoiceNumber: receipt.invoice_number,
          orderNumber: order.order_number,
          status: OrderBusinessStatus.PAID,

          total: order.total,
          paid: totalPayments,
          tip: totalTip,

          paymentMethods: dto.payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            tipAmount: p.tipAmount || 0,
          })),

          merchantId,
          shiftId: shift.id,

          paidAt: new Date(),
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
    const where: FindOptionsWhere<Order> = {
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
    const sortDir = query.sortOrder || 'DESC';
    let order: FindOptionsOrder<Order>;
    if (query.sortBy) {
      switch (query.sortBy) {
        case OrderSortBy.CREATED_AT:
          order = { created_at: sortDir };
          break;
        case OrderSortBy.CLOSED_AT:
          order = { closed_at: sortDir };
          break;
        case OrderSortBy.BUSINESS_STATUS:
          order = { status: sortDir };
          break;
        case OrderSortBy.TYPE:
          order = { type: sortDir };
          break;
        case OrderSortBy.STATUS:
          order = { logical_status: sortDir };
          break;
        default:
          order = { created_at: 'DESC' };
      }
    } else {
      order = { created_at: 'DESC' };
    }

    const [rows, total] = await this.orderRepo.findAndCount({
      where,
      order,
      skip: (page - 1) * limit,
      take: limit,
      relations: {
        orderItems: { product: true, variant: true },
        kitchenOrders: { merchant: true, onlineOrder: true, station: true },
        onlineOrders: {
          merchant: true,
          store: true,
          customer: true,
          order: true,
        },
      },
      relationLoadStrategy: 'query',
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
      relations: {
        orderItems: { product: true, variant: true },
        kitchenOrders: { merchant: true, onlineOrder: true, station: true },
        onlineOrders: {
          merchant: true,
          store: true,
          customer: true,
          order: true,
        },
      },
      relationLoadStrategy: 'query',
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

    // Antes de escribir nada: re-apuntar un pedido a una zona cerrada no debe dejar el
    // resto del cambio a medio guardar.
    if (
      dto.deliveryZoneId != null &&
      dto.deliveryZoneId !== existing.delivery_zone_id
    ) {
      await this.assertDeliveryZoneOpen(
        dto.deliveryZoneId,
        authenticatedUserMerchantId,
      );
    }

    const updateData: QueryDeepPartialEntity<Order> = {};

    const nextType = dto.type ?? existing.type;
    const nextTableId =
      dto.tableId !== undefined ? dto.tableId : existing.table_id;
    if (nextType === OrderType.DINE_IN && nextTableId == null) {
      throw new BadRequestException('tableId is required for dine_in orders');
    }

    if (dto.tableId === null) {
      updateData.table_id = null;
    } else if (dto.tableId !== undefined) {
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

    if (
      dto.businessStatus === OrderBusinessStatus.CANCELLED &&
      existing.status !== OrderBusinessStatus.CANCELLED
    ) {
      this.emitOrderLoyaltyReversal(id);
    }

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

  /** Emits after DB commit when the order first becomes fully paid. */
  emitOrderFullyPaid(orderId: number): void {
    this.eventEmitter.emit(ORDER_FULLY_PAID_EVENT, { orderId });
  }

  /** Emits after DB commit when loyalty points must be reversed (cancel/refund). */
  emitOrderLoyaltyReversal(orderId: number): void {
    this.eventEmitter.emit(ORDER_LOYALTY_REVERSAL_EVENT, { orderId });
  }

  /**
   * Recomputes subtotal from line items, tax_total from order_taxes, tip_total
   * (manual_tip_total + sum of payment tip_amount), order total, paid_total from
   * order_payments, kitchen roll-up, balance_due and is_paid.
   * Call after order-item, order-item-modifier, order-tax or order-payment create / update / delete, or after changing order-level discount/tip/delivery.
   */
  async syncOrderAggregates(orderId: number): Promise<void> {
    const { becameFullyPaid, becameUnpaid } =
      await this.syncOrderAggregatesWithManager(
        this.orderRepo.manager,
        orderId,
      );
    if (becameFullyPaid) {
      this.emitOrderFullyPaid(orderId);
    }
    if (becameUnpaid) {
      this.emitOrderLoyaltyReversal(orderId);
    }
    await this.syncOnlineOrderFromPosOrder(orderId);
  }

  /** Post-commit sync to propagate POS order changes to online orders. */
  async syncOnlineOrderFromPosOrder(orderId: number): Promise<void> {
    await this.onlineOrderSyncService.syncFromPosOrder(orderId);
  }

  /**
   * Transaction-friendly version of {@link syncOrderAggregates}.
   * It only touches POS tables and MUST be called with the transaction manager when atomicity is required.
   */
  async syncOrderAggregatesWithManager(
    manager: EntityManager,
    orderId: number,
  ): Promise<{ becameFullyPaid: boolean; becameUnpaid: boolean }> {
    const order = await manager.getRepository(Order).findOne({
      where: { id: orderId },
    });
    if (!order) {
      return { becameFullyPaid: false, becameUnpaid: false };
    }

    const wasPaid = order.is_paid;

    const items = await manager.getRepository(OrderItem).find({
      where: { order_id: orderId },
    });

    const payments = await manager.getRepository(OrderPayment).find({
      where: { order_id: orderId },
    });

    const taxes = await manager.getRepository(OrderTax).find({
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
    } else if (nextKitchen !== KitchenStatus.READY && order.ready_at) {
      order.ready_at = null;
    }
    if (nextKitchen === KitchenStatus.PENDING && order.preparing_at) {
      order.preparing_at = null;
    }

    applyPaidDerivedFields(order);
    const becameFullyPaid = !wasPaid && order.is_paid;
    const becameUnpaid = wasPaid && !order.is_paid;
    order.status = nextBusinessStatusAfterPayments(order.status, {
      isPaid: order.is_paid,
      paidTotal: Number(order.paid_total),
      hasRefund: payments.some((p) => p.is_refund),
    });
    await manager.getRepository(Order).save(order);
    return { becameFullyPaid, becameUnpaid };
  }

  /**
   *POS order created upon accepting an online order (merchant minimum table/collaborator).
   */
  async createOrderForOnlineAcceptance(params: {
    merchantId: number;
    customerId: number;
    orderType: OrderType;
    deliveryAddress: string | null;
    deliveryFee: number;
  }): Promise<Order> {
    const table = await this.tableRepo.findOne({
      where: { merchant_id: params.merchantId },
      order: { id: 'ASC' },
    });
    if (!table) {
      throw new BadRequestException(
        'No table found for merchant; create at least one table to accept online orders',
      );
    }
    const collaborator = await this.collaboratorRepo.findOne({
      where: { merchant_id: params.merchantId },
      order: { id: 'ASC' },
    });
    if (!collaborator) {
      throw new BadRequestException(
        'No collaborator found for merchant; create at least one collaborator to accept online orders',
      );
    }
    const order = new Order();
    order.merchant_id = params.merchantId;
    order.table_id = table.id;
    order.collaborator_id = collaborator.id;
    order.status = OrderBusinessStatus.PENDING;
    order.type = params.orderType;
    order.customer_id = params.customerId;
    order.closed_at = null;
    order.logical_status = OrderStatus.ACTIVE;
    order.source = OrderSource.ONLINE;
    order.guest_count = 1;
    order.delivery_address = params.deliveryAddress;
    order.delivery_zone_id = null;
    order.delivery_fee = roundMoney(params.deliveryFee);
    order.delivery_status = DeliveryStatus.UNASSIGNED;
    order.tax_total = 0;
    order.discount_total = 0;
    order.manual_tip_total = 0;
    order.tip_total = 0;
    order.paid_total = 0;
    order.subtotal = 0;
    order.total = computeOrderTotal(0, 0, 0, 0, order.delivery_fee);
    applyPaidDerivedFields(order);
    order.kitchen_status = KitchenStatus.PENDING;
    order.ready_at = null;
    order.preparing_at = null;

    return this.orderRepo.manager.transaction((manager) =>
      this.insertWithOrderNumbers(manager, order, { dailyTicket: false }),
    );
  }

  /**
   * Same logic as {@link createOrderForOnlineAcceptance} but within a transaction (e.g., online order acceptance with POS lines and FKs in a single unit).
   */
  async createOrderForOnlineAcceptanceWithManager(
    manager: EntityManager,
    params: {
      merchantId: number;
      customerId: number;
      orderType: OrderType;
      deliveryAddress: string | null;
      deliveryFee: number;
    },
  ): Promise<Order> {
    const table = await manager.getRepository(Table).findOne({
      where: { merchant_id: params.merchantId },
      order: { id: 'ASC' },
    });
    if (!table) {
      throw new BadRequestException(
        'No table found for merchant; create at least one table to accept online orders',
      );
    }
    const collaborator = await manager.getRepository(Collaborator).findOne({
      where: { merchant_id: params.merchantId },
      order: { id: 'ASC' },
    });
    if (!collaborator) {
      throw new BadRequestException(
        'No collaborator found for merchant; create at least one collaborator to accept online orders',
      );
    }
    const order = new Order();
    order.merchant_id = params.merchantId;
    order.table_id = table.id;
    order.collaborator_id = collaborator.id;
    order.status = OrderBusinessStatus.PENDING;
    order.type = params.orderType;
    order.customer_id = params.customerId;
    order.closed_at = null;
    order.logical_status = OrderStatus.ACTIVE;
    order.source = OrderSource.ONLINE;
    order.guest_count = 1;
    order.delivery_address = params.deliveryAddress;
    order.delivery_zone_id = null;
    order.delivery_fee = roundMoney(params.deliveryFee);
    order.delivery_status = DeliveryStatus.UNASSIGNED;
    order.tax_total = 0;
    order.discount_total = 0;
    order.manual_tip_total = 0;
    order.tip_total = 0;
    order.paid_total = 0;
    order.subtotal = 0;
    order.total = computeOrderTotal(0, 0, 0, 0, order.delivery_fee);
    applyPaidDerivedFields(order);
    order.kitchen_status = KitchenStatus.PENDING;
    order.ready_at = null;
    order.preparing_at = null;

    return this.insertWithOrderNumbers(manager, order, { dailyTicket: false });
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

  /**
   * Inserts a new order with its order number (and daily ticket number), computed under the
   * merchant's order-numbering lock: two orders created at once used to read the same
   * MAX/COUNT, so one failed on the unique (merchant_id, order_number) index and tickets
   * were repeated. Must run inside a transaction.
   */
  private async insertWithOrderNumbers(
    manager: EntityManager,
    order: Order,
    options: { dailyTicket: boolean },
  ): Promise<Order> {
    await lockMerchantScope(
      manager,
      MerchantLockScope.ORDER_NUMBERS,
      order.merchant_id,
    );
    if (options.dailyTicket) {
      order.displayId = await this.generateDailyTicketId(
        manager,
        order.merchant_id,
      );
    }
    order.order_number = await this.nextOrderNumberWithManager(
      manager,
      order.merchant_id,
    );
    return manager.getRepository(Order).save(order);
  }

  private async nextOrderNumberWithManager(
    manager: EntityManager,
    merchantId: number,
  ): Promise<string> {
    const raw = await manager
      .getRepository(Order)
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
    const base: OrderResponseDto = {
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
      inventoryConsumedAt: row.inventory_consumed_at,
      loyaltyPointsAwardedAt: row.loyalty_points_awarded_at,
    };

    if (row.orderItems?.length) {
      base.orderItems = row.orderItems
        .filter((i) => i.status === OrderItemStatus.ACTIVE)
        .map((i) => this.formatNestedOrderItem(row, i));
    }

    if (row.kitchenOrders?.length) {
      base.kitchenOrders = row.kitchenOrders
        .filter((ko) => ko.status !== KitchenOrderStatus.DELETED)
        .map((ko) => this.formatKitchenOrderNestedInOrder(ko));
    }

    if (row.onlineOrders?.length) {
      base.onlineOrders = row.onlineOrders
        .filter((oo) => oo.status !== OnlineOrderStatus.DELETED)
        .map((oo) => formatOnlineOrderToDto(oo, Number(row.total)));
    }

    return base;
  }

  private formatNestedOrderItem(
    parent: Order,
    orderItem: OrderItem,
  ): OrderItemResponseDto {
    if (!orderItem.product) {
      throw new Error('Product relation is not loaded for order item');
    }
    return {
      id: orderItem.id,
      orderId: orderItem.order_id,
      order: {
        id: parent.id,
        businessStatus: parent.status,
        type: parent.type,
      },
      productId: orderItem.product_id,
      product: {
        id: orderItem.product.id,
        name: orderItem.product.name,
        sku: orderItem.product.sku,
        basePrice: Number(orderItem.product.basePrice),
      },
      variantId: orderItem.variant_id,
      variant: orderItem.variant
        ? {
            id: orderItem.variant.id,
            name: orderItem.variant.name,
            price: Number(orderItem.variant.price),
            sku: orderItem.variant.sku,
          }
        : null,
      quantity: orderItem.quantity,
      price: Number(orderItem.price),
      discount: Number(orderItem.discount),
      totalPrice: Number(orderItem.total_price),
      notes: orderItem.notes,
      status: orderItem.status,
      kitchenStatus: orderItem.kitchen_status,
      createdAt: orderItem.created_at,
      updatedAt: orderItem.updated_at,
    };
  }

  private formatKitchenOrderNestedInOrder(
    kitchenOrder: KitchenOrder,
  ): KitchenOrderNestedInOrderDto {
    if (!kitchenOrder.merchant) {
      throw new Error('Merchant relation is not loaded for kitchen order');
    }
    return {
      id: kitchenOrder.id,
      merchantId: kitchenOrder.merchant_id,
      orderId: kitchenOrder.order_id,
      onlineOrderId: kitchenOrder.online_order_id,
      stationId: kitchenOrder.station_id,
      priority: kitchenOrder.priority,
      businessStatus: kitchenOrder.business_status,
      startedAt: kitchenOrder.started_at,
      completedAt: kitchenOrder.completed_at,
      cancelledAt: kitchenOrder.cancelled_at,
      cancellationReason: kitchenOrder.cancellation_reason,
      cancelledByUserId: kitchenOrder.cancelled_by_user_id,
      notes: kitchenOrder.notes,
      status: kitchenOrder.status,
      createdAt: kitchenOrder.created_at,
      updatedAt: kitchenOrder.updated_at,
      merchant: {
        id: kitchenOrder.merchant.id,
        name: kitchenOrder.merchant.name,
      },
      onlineOrder: kitchenOrder.onlineOrder
        ? {
            id: kitchenOrder.onlineOrder.id,
            status: kitchenOrder.onlineOrder.status,
          }
        : null,
      station: kitchenOrder.station
        ? {
            id: kitchenOrder.station.id,
            name: kitchenOrder.station.name,
          }
        : null,
    };
  }

  async refundOrder(
    dto: RefundOrderDto,
    merchantId: number,
    user: AuthenticatedUser,
  ) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId },
      relations: ['merchant', 'orderItems'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (Number(order.merchant.id) !== Number(merchantId)) {
      throw new ForbiddenException('Access denied');
    }

    if (order.status !== OrderBusinessStatus.PAID) {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    if (user.role !== UserRole.MERCHANT_ADMIN) {
      throw new ForbiddenException('Only admin can process refunds');
    }

    const shift = await this.shiftService.findActiveShiftByMerchant(merchantId);

    if (!shift) {
      throw new BadRequestException('No active shift found');
    }

    if (shift.status === ShiftStatus.CLOSED) {
      throw new BadRequestException('Cannot refund on closed shift');
    }

    let refundAmount = 0;
    let isFullRefundByItems = false;

    if (dto.fullRefund) {
      refundAmount = Number(order.total);
    } else {
      if (!dto.itemIds || dto.itemIds.length === 0) {
        throw new BadRequestException('Item IDs are required');
      }

      const itemIds = dto.itemIds ?? [];

      const itemsToRefund = order.orderItems.filter((item) =>
        itemIds.includes(item.id),
      );

      if (itemsToRefund.length === 0) {
        throw new BadRequestException('No valid items to refund');
      }

      isFullRefundByItems = itemsToRefund.length === order.orderItems.length;

      const subtotalToRefund = itemsToRefund.reduce(
        (sum, item) => sum + Number(item.total_price),
        0,
      );

      const proportion = subtotalToRefund / Number(order.subtotal);

      refundAmount = roundMoney(proportion * Number(order.total));
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the order and check its status again: two refunds sent at once both passed
      // the check above and refunded the order twice.
      const lockedOrder = await queryRunner.manager.findOne(Order, {
        where: { id: order.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (lockedOrder?.status !== OrderBusinessStatus.PAID) {
        throw new BadRequestException('Only paid orders can be refunded');
      }

      // 1. Payments refund
      const payments = await queryRunner.manager.find(OrderPayment, {
        where: { order_id: order.id, is_refund: false },
      });

      let cash: { shift: CashShift; collaboratorId: number } | null = null;
      for (const payment of payments) {
        const proportion = Number(payment.amount) / Number(order.total);
        const refundPart = roundMoney(refundAmount * proportion);

        // The cash part goes out of a drawer (before, only the work shift's balance moved
        // and the drawer closed with that cash as a surplus).
        if (payment.method.toLowerCase() === 'cash' && refundPart > 0) {
          cash ??= await this.resolveCashShiftForCash(
            queryRunner.manager,
            merchantId,
            user.id,
            dto.cashShiftId,
          );
          await this.cashFlowService.addMovement(
            cash.shift.id,
            refundPart,
            CashShiftMovementType.OUT,
            order.id,
            cash.collaboratorId,
            cash.shift.cashDrawerId,
            queryRunner.manager,
            dto.reason ?? null,
          );
        }

        // Positive amount: is_refund is what makes it subtract from paid_total (a
        // negative amount here was subtracted twice, i.e. added to what was paid).
        await queryRunner.manager.save(OrderPayment, {
          order_id: order.id,
          amount: refundPart,
          method: payment.method,
          tip_amount: 0,
          is_refund: true,
          shift_id: shift.id,
          source: 'REFUND',
        });
      }

      // 2. Shift update
      shift.current_balance = roundMoney(
        Number(shift.current_balance) - refundAmount,
      );

      await queryRunner.manager.save(shift);

      // 3. Tip settlements validation + cancel
      const settlements = await queryRunner.manager.find(TipSettlement, {
        where: { order_id: order.id },
      });

      const hasLiquidated = settlements.some(
        (s) => s.status === SettlementStatus.LIQUIDATED,
      );

      if (hasLiquidated) {
        throw new BadRequestException(
          'Cannot refund tips that are already liquidated. Manual adjustment required.',
        );
      }

      for (const settlement of settlements) {
        settlement.status = SettlementStatus.CANCELLED;
        await queryRunner.manager.save(settlement);
      }

      // 4. Loyalty reversal (IDEMPOTENT FIX)
      const loyaltyTransactions = await queryRunner.manager.find(
        LoyaltyPointTransaction,
        {
          where: {
            orderId: order.id,
            source: LoyaltyPointsSource.ORDER,
            points: MoreThan(0),
          },
        },
      );

      for (const transaction of loyaltyTransactions) {
        const loyaltyCustomer = await queryRunner.manager.findOne(
          LoyaltyCustomer,
          {
            where: { id: transaction.loyaltyCustomerId },
          },
        );

        if (!loyaltyCustomer) continue;

        // 🔒 REAL idempotence: if a reverse already exists, skip
        const existsReversal = await queryRunner.manager.findOne(
          LoyaltyPointTransaction,
          {
            where: {
              orderId: order.id,
              loyaltyCustomerId: transaction.loyaltyCustomerId,
              source: LoyaltyPointsSource.ORDER_REVERSAL,
            },
          },
        );

        if (existsReversal) {
          continue;
        }

        // update balance
        loyaltyCustomer.currentPoints = Math.max(
          0,
          loyaltyCustomer.currentPoints - transaction.points,
        );

        await queryRunner.manager.save(loyaltyCustomer);

        // create reversal (if it fails due to constraint → it has already been processed)
        await queryRunner.manager.save(LoyaltyPointTransaction, {
          loyaltyCustomerId: loyaltyCustomer.id,
          orderId: order.id,
          source: LoyaltyPointsSource.ORDER_REVERSAL,
          points: -transaction.points,
          description: `Refund reversal for order ${order.order_number}`,
        });
      }

      // 5. Order update (last status), on the locked row: saving the copy read before the
      // transaction would write back its stale totals.
      lockedOrder.refund_reason = dto.reason;
      lockedOrder.refunded_by_user_id = user.id;

      lockedOrder.status =
        dto.fullRefund || isFullRefundByItems
          ? OrderBusinessStatus.CANCELLED
          : OrderBusinessStatus.PARTIALLY_REFUNDED;

      await queryRunner.manager.save(lockedOrder);
      order.status = lockedOrder.status;

      // paid_total / balance_due now include the refund payments
      await this.syncOrderAggregatesWithManager(queryRunner.manager, order.id);

      await queryRunner.commitTransaction();

      const hasCardPayment = payments.some((p) => p.method !== 'cash');

      return {
        success: true,
        message: hasCardPayment
          ? 'Refund processed. Card refund must be handled manually.'
          : 'Refund processed successfully',
        data: {
          orderId: order.id,
          refundedAmount: refundAmount,
          status: order.status,
          refundedBy: user.id,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
