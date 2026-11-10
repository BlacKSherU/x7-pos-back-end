import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
  Between,
  In,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { OrderPayment } from './entities/order-payment.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { UpdateOrderPaymentDto } from './dto/update-order-payment.dto';
import {
  GetOrderPaymentQueryDto,
  OrderPaymentSortBy,
} from './dto/get-order-payment-query.dto';
import {
  OneOrderPaymentResponseDto,
  OrderPaymentResponseDto,
} from './dto/order-payment-response.dto';
import { PaginatedOrderPaymentResponseDto } from './dto/paginated-order-payment-response.dto';
import { OrderStatus } from '../orders/constants/order-status.enum';
import { OrdersService } from '../orders/orders.service';
import {
  computePaidTotalFromPayments,
  roundMoney,
} from '../orders/order-aggregation.util';
import {
  LoyaltyPointsRedemptionService,
  PAYMENT_METHOD_LOYALTY,
} from 'src/growth/loyalty/loyalty-points-redemption/loyalty-points-redemption.service';
import { CashFlowService } from '../../cashdrawer/cash-shifts/cash-flow.service';
import { CashShift } from '../../cashdrawer/cash-shifts/entities/cash-shift.entity';
import { CashShiftStatus } from '../../cashdrawer/cash-shifts/constants/cash-shift-status.enum';
import { CashShiftMovementType } from '../../cashdrawer/cash-shifts/constants/cash-shift-movement-type.enum';

const ORDER_PAYMENT_RELATIONS = ['order', 'order.merchant'] as const;

@Injectable()
export class OrderPaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrderPayment)
    private readonly orderPaymentRepository: Repository<OrderPayment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly ordersService: OrdersService,
    private readonly loyaltyPointsRedemptionService: LoyaltyPointsRedemptionService,
    private readonly cashFlowService: CashFlowService,
  ) {}

  async create(
    dto: CreateOrderPaymentDto,
    authenticatedUserMerchantId: number,
    cashierUserId?: number,
    activeShiftId?: number,
  ): Promise<OneOrderPaymentResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create order payments',
      );
    }

    // CAT 1 requires the shift to be open prior to payment. The interceptor enforces it,
    // but we still validate presence and lock the shift row for correctness under concurrency.
    if (!activeShiftId) {
      throw new BadRequestException(
        'Cash shift opening required. There is no active shift.',
      );
    }

    const precheck = await this.orderRepository.findOne({
      where: { id: dto.orderId },
      select: ['id', 'merchant_id', 'logical_status'],
    });
    if (!precheck) throw new NotFoundException('Order not found');
    if (precheck.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only record payments for orders belonging to your merchant',
      );
    }
    if (precheck.logical_status !== OrderStatus.ACTIVE) {
      throw new BadRequestException('Cannot add payments to a deleted order');
    }

    if (dto.amount < 0) {
      throw new BadRequestException('Amount must be non-negative');
    }
    const tip = dto.tipAmount ?? 0;
    if (tip < 0) {
      throw new BadRequestException('Tip amount must be non-negative');
    }
    if (!dto.isRefund && dto.amount === 0 && tip === 0) {
      throw new BadRequestException(
        'Payment amount or tip must be greater than 0 unless it is a refund',
      );
    }

    const isLoyalty = dto.method === PAYMENT_METHOD_LOYALTY;
    if (isLoyalty && !cashierUserId) {
      throw new ForbiddenException('Missing cashier identity');
    }

    if (isLoyalty && !dto.loyaltyPointsLockId) {
      throw new BadRequestException(
        'loyaltyPointsLockId is required when method is loyalty',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: OrderPayment;
    let becameFullyPaid = false;
    let becameUnpaid = false;

    try {
      // Step A: Validate that the shift is still open (row lock)
      const shift = await queryRunner.manager.findOne(CashShift, {
        where: {
          id: activeShiftId,
          merchantId: authenticatedUserMerchantId,
          status: CashShiftStatus.OPEN,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!shift) {
        throw new BadRequestException(
          'The active cash shift has been closed. Operation cancelled.',
        );
      }

      // Lock the order too: two terminals charging the same order (split bill) on
      // different cash shifts would otherwise each recompute paid_total without the
      // other's payment, and the last write would drop one of them.
      const lockedOrder = await queryRunner.manager.findOne(Order, {
        where: { id: dto.orderId, merchant_id: authenticatedUserMerchantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedOrder || lockedOrder.logical_status !== OrderStatus.ACTIVE) {
        throw new BadRequestException('Cannot add payments to a deleted order');
      }

      if (dto.isRefund) {
        const payments = await queryRunner.manager.find(OrderPayment, {
          where: { order_id: dto.orderId },
        });
        const paidSoFar = computePaidTotalFromPayments(payments);
        const refund = roundMoney(dto.amount + tip);
        if (refund > paidSoFar) {
          throw new BadRequestException(
            `Cannot refund ${refund}: the order has ${paidSoFar} paid.`,
          );
        }
      }

      // Step B: Register the payment
      const row = new OrderPayment();
      row.order_id = dto.orderId;
      row.amount = roundMoney(dto.amount);
      row.method = isLoyalty ? PAYMENT_METHOD_LOYALTY : dto.method;
      row.provider = dto.provider ?? null;
      row.reference = dto.reference ?? null;
      row.tip_amount = roundMoney(tip);
      row.is_refund = dto.isRefund ?? false;
      if (dto.source !== undefined) {
        row.source = dto.source;
      }
      if (dto.shiftId != null && dto.shiftId !== shift.id) {
        const ownsCashShift = await queryRunner.manager.exists(CashShift, {
          where: { id: dto.shiftId, merchantId: authenticatedUserMerchantId },
        });
        if (!ownsCashShift) {
          throw new BadRequestException(
            'shiftId must be a cash shift of your merchant',
          );
        }
      }
      row.shift_id = dto.shiftId ?? activeShiftId;

      saved = await queryRunner.manager.save(OrderPayment, row);

      // Step C: Loyalty lock consumption (inside the same transaction)
      if (isLoyalty) {
        await this.loyaltyPointsRedemptionService.consumeLockWithManager({
          manager: queryRunner.manager,
          lockId: dto.loyaltyPointsLockId!,
          authenticatedUserMerchantId,
          cashierUserId: cashierUserId!,
          orderId: dto.orderId,
          paymentId: saved.id,
        });
      }

      // Step D: Register the financial transaction linked to the shiftId (cash only)
      if (dto.method.toLowerCase() === 'cash') {
        const movementType = dto.isRefund
          ? CashShiftMovementType.OUT
          : CashShiftMovementType.IN;
        const totalAmount = Number(saved.amount) + Number(saved.tip_amount);

        await this.cashFlowService.addMovement(
          shift.id,
          totalAmount,
          movementType,
          dto.orderId,
          dto.collaboratorId,
          shift.cashDrawerId,
          queryRunner.manager,
        );
      }

      // Step E: Sync order aggregates inside the same transaction
      const syncResult =
        await this.ordersService.syncOrderAggregatesWithManager(
          queryRunner.manager,
          dto.orderId,
        );
      becameFullyPaid = syncResult.becameFullyPaid;
      becameUnpaid = syncResult.becameUnpaid;

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    // Events must run after commit (avoid side-effects inside the transaction)
    if (becameFullyPaid) {
      this.ordersService.emitOrderFullyPaid(dto.orderId);
    }
    if (becameUnpaid) {
      this.ordersService.emitOrderLoyaltyReversal(dto.orderId);
    }

    const complete = await this.orderPaymentRepository.findOne({
      where: { id: saved.id },
      relations: [...ORDER_PAYMENT_RELATIONS],
    });

    if (!complete) {
      throw new NotFoundException('Order payment not found after creation');
    }

    // External sync after commit (keeps transaction purely POS-scoped).
    await this.ordersService.syncOnlineOrderFromPosOrder(dto.orderId);

    return {
      statusCode: 201,
      message: 'Order payment created successfully',
      data: this.format(complete),
    };
  }

  async findAll(
    query: GetOrderPaymentQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOrderPaymentResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access order payments',
      );
    }

    if (query.page && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        throw new BadRequestException(
          'Created date must be in YYYY-MM-DD format',
        );
      }
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.orderId) {
      const order = await this.orderRepository.findOne({
        where: { id: query.orderId },
        relations: ['merchant'],
      });
      if (!order) {
        throw new NotFoundException(`Order with ID ${query.orderId} not found`);
      }
      if (order.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Order does not belong to your merchant');
      }
      where.order_id = query.orderId;
    } else {
      const merchantOrders = await this.orderRepository.find({
        where: { merchant_id: authenticatedUserMerchantId },
        select: ['id'],
      });
      const ids = merchantOrders.map((o) => o.id);
      if (ids.length === 0) {
        return {
          statusCode: 200,
          message: 'Order payments retrieved successfully',
          data: [],
          paginationMeta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
      where.order_id = ids.length === 1 ? ids[0] : In(ids);
    }

    if (query.method) {
      where.method = query.method;
    }
    if (query.isRefund !== undefined) {
      where.is_refund = query.isRefund;
    }
    if (query.createdDate) {
      const start = new Date(query.createdDate);
      const end = new Date(query.createdDate);
      end.setDate(end.getDate() + 1);
      where.created_at = Between(start, end);
    }

    const orderField =
      query.sortBy === OrderPaymentSortBy.AMOUNT
        ? 'amount'
        : query.sortBy === OrderPaymentSortBy.METHOD
          ? 'method'
          : 'created_at';
    const orderDir = query.sortOrder || 'DESC';
    const orderClause: Record<string, 'ASC' | 'DESC'> = {
      [orderField]: orderDir,
    };

    const [rows, total] = await this.orderPaymentRepository.findAndCount({
      where,
      relations: [...ORDER_PAYMENT_RELATIONS],
      order: orderClause,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Order payments retrieved successfully',
      data: rows.map((r) => this.format(r)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderPaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Order payment ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access order payments',
      );
    }

    const row = await this.orderPaymentRepository.findOne({
      where: { id },
      relations: [...ORDER_PAYMENT_RELATIONS],
    });
    if (!row) {
      throw new NotFoundException('Order payment not found');
    }
    if (row.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only access order payments from your merchant',
      );
    }

    return {
      statusCode: 200,
      message: 'Order payment retrieved successfully',
      data: this.format(row),
    };
  }

  async update(
    id: number,
    dto: UpdateOrderPaymentDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderPaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Order payment ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update order payments',
      );
    }

    const existing = await this.orderPaymentRepository.findOne({
      where: { id },
      relations: [...ORDER_PAYMENT_RELATIONS],
    });
    if (!existing) {
      throw new NotFoundException('Order payment not found');
    }
    if (existing.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update order payments from your merchant',
      );
    }

    // A payment is a fact of the till: amount, method, tip, refund flag and order are fixed
    // (the DTO rejects them). Editing them changed paid totals without touching the cash
    // drawer; a wrong payment is corrected with a refund.
    const patch: QueryDeepPartialEntity<OrderPayment> = {};
    if (dto.provider !== undefined) patch.provider = dto.provider ?? null;
    if (dto.reference !== undefined) patch.reference = dto.reference ?? null;

    if (Object.keys(patch).length > 0) {
      await this.orderPaymentRepository.update(id, patch);
    }

    const updated = await this.orderPaymentRepository.findOne({
      where: { id },
      relations: [...ORDER_PAYMENT_RELATIONS],
    });
    if (!updated) {
      throw new NotFoundException('Order payment not found after update');
    }

    return {
      statusCode: 200,
      message: 'Order payment updated successfully',
      data: this.format(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderPaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Order payment ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete order payments',
      );
    }

    const existing = await this.orderPaymentRepository.findOne({
      where: { id },
      relations: [...ORDER_PAYMENT_RELATIONS],
    });
    if (!existing) {
      throw new NotFoundException('Order payment not found');
    }
    if (existing.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete order payments from your merchant',
      );
    }

    // Deleting a payment removed money from the order without touching the cash drawer
    throw new BadRequestException(
      'Order payments cannot be deleted: register a refund for the amount instead.',
    );
  }

  private format(row: OrderPayment): OrderPaymentResponseDto {
    return {
      id: row.id,
      orderId: row.order_id,
      amount: Number(row.amount),
      method: row.method,
      provider: row.provider,
      reference: row.reference,
      tipAmount: Number(row.tip_amount),
      isRefund: row.is_refund,
      status: row.status,
      paymentTransactionId: row.payment_transaction_id ?? null,
      createdAt: row.created_at,
      source: row.source,
      shift_id: row.shift_id,
    };
  }
}
