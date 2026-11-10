// src/core/payments/payment-transactions/payment-transactions.service.ts
//
// Cobros, devoluciones y anulaciones por el gateway de la empresa, con un registro de
// auditoría en payment_transactions por cada operación. Una venta aprobada se asienta como
// order_payment (y la orden pasa a PAID por syncOrderAggregates); una devolución agrega
// una fila is_refund y una anulación marca el pago como voided.
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { ShiftRole } from 'src/restaurant-operations/shift/shifts/constants/shift-role.enum';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { OrderStatus } from 'src/restaurant-operations/pos/orders/constants/order-status.enum';
import { OrdersService } from 'src/restaurant-operations/pos/orders/orders.service';
import { roundMoney } from 'src/restaurant-operations/pos/orders/order-aggregation.util';
import { OrderPayment } from 'src/restaurant-operations/pos/order-payments/entities/order-payment.entity';
import { OrderPaymentStatus } from 'src/restaurant-operations/pos/order-payments/constants/order-payment-status.enum';
import { CashShift } from 'src/restaurant-operations/cashdrawer/cash-shifts/entities/cash-shift.entity';
import { CashShiftStatus } from 'src/restaurant-operations/cashdrawer/cash-shifts/constants/cash-shift-status.enum';
import { MerchantPaymentConfigsService } from '../merchant-payment-configs/merchant-payment-configs.service';
import { PaymentTerminalsService } from '../payment-terminals/payment-terminals.service';
import { PaymentProcessingService } from '../gateway/payment-processing.service';
import {
  buildPaymentResult,
  PaymentOperation,
  PaymentResultDto,
  PaymentResultStatus,
} from '../gateway/dto/payment-result.dto';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { MerchantPaymentConfig } from '../merchant-payment-configs/entities/merchant-payment-config.entity';
import { PaymentTerminal } from '../payment-terminals/entities/payment-terminal.entity';
import { PaymentProvider } from '../constants/payment-provider.enum';
import { gatewayEndpoints } from '../gateway/gateway-endpoints';
import {
  CheckoutConfigDto,
  CheckoutOptionsResponseDto,
  CheckoutTokenizationDto,
  ListPaymentTransactionsQueryDto,
  PaymentTransactionsPageDto,
} from './dto/list-payment-transactions.dto';
import {
  LOCKED_SALE_STATUSES,
  PaymentTransactionChannel,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from './constants/payment-transaction.enums';
import {
  ChargeDto,
  RefundTransactionDto,
  TerminalSaleDto,
  VoidTransactionDto,
} from './dto/charge.dto';
import {
  OnePaymentTransactionResponseDto,
  PaymentTransactionDto,
  RefundVoidResponseDto,
} from './dto/payment-transaction-response.dto';

const DEFAULT_CURRENCY = 'USD';
const PAYMENT_METHOD_CARD = 'card';
/** Un terminal con una venta pendiente más reciente que esto está ocupado. */
const TERMINAL_BUSY_MS = 5 * 60_000;
/**
 * Una venta en terminal sin id del proveedor pasado este tiempo no va a responder (Bolt
 * espera la tarjeta 180 s; el proceso que la despachó pudo reiniciarse).
 */
const TERMINAL_ABANDONED_MS = 10 * 60_000;
const MONEY_EPSILON = 0.005;

interface MerchantContext {
  companyId: number;
  merchantId: number;
  userId: number;
}

/** Efectos de una orden que se disparan solo después del commit. */
interface OrderEffects {
  orderId: number | null;
  becameFullyPaid: boolean;
  becameUnpaid: boolean;
}

const NO_ORDER_EFFECTS: OrderEffects = {
  orderId: null,
  becameFullyPaid: false,
  becameUnpaid: false,
};

@Injectable()
export class PaymentTransactionsService {
  private readonly logger = new Logger(PaymentTransactionsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(MerchantPaymentConfig)
    private readonly configRepository: Repository<MerchantPaymentConfig>,
    @InjectRepository(PaymentTerminal)
    private readonly terminalRepository: Repository<PaymentTerminal>,
    private readonly processing: PaymentProcessingService,
    private readonly configsService: MerchantPaymentConfigsService,
    private readonly terminalsService: PaymentTerminalsService,
    private readonly ordersService: OrdersService,
  ) {}

  // ---------------------------------------------------------------- ventas

  /** Cobro con un token del cliente; responde con el resultado final del proveedor. */
  async charge(
    dto: ChargeDto,
    user: AuthenticatedUser,
  ): Promise<OnePaymentTransactionResponseDto> {
    const ctx = this.merchantContext(user);
    const currency = this.currency(dto.currency);
    await this.assertPayableOrder(ctx.merchantId, dto.orderId, dto.amount);

    const config = await this.configsService.resolveChargeConfig(
      ctx.companyId,
      ctx.merchantId,
      dto.paymentProvider,
    );
    const sale = await this.transactionRepository.save(
      this.newSale(ctx, dto, currency, {
        channel: PaymentTransactionChannel.TOKEN,
        paymentConfigId: config.id,
        provider: config.provider,
        terminalId: null,
      }),
    );

    const result = await this.gatewayCall(PaymentOperation.CHARGE, () =>
      this.processing.charge(
        ctx.companyId,
        {
          amount: Number(sale.amount),
          currency,
          paymentToken: dto.paymentMethodToken,
          cardExpiry: dto.cardExpiry,
          capture: true,
          orderReference: `order-${dto.orderId}`,
          idempotencyKey: sale.idempotency_key,
        },
        config.id,
      ),
    );
    const updated = await this.applySaleResult(sale.id, result);

    return {
      statusCode: 201,
      message: this.saleMessage(updated),
      data: this.format(updated),
    };
  }

  /**
   * Envía el cobro al terminal y responde enseguida con la venta `pending`; el resultado
   * se registra cuando el proveedor contesta. GET /:transactionId sigue el estado.
   */
  async terminalSale(
    dto: TerminalSaleDto,
    user: AuthenticatedUser,
  ): Promise<OnePaymentTransactionResponseDto> {
    const ctx = this.merchantContext(user);
    const currency = this.currency(dto.currency);

    const route = await this.terminalsService.resolveRoute(
      ctx.companyId,
      dto.terminalId,
    );
    if (route.merchantId !== ctx.merchantId) {
      ErrorHandler.forbidden('The payment terminal belongs to another branch');
    }
    await this.assertPayableOrder(ctx.merchantId, dto.orderId, dto.amount);
    await this.assertTerminalFree(dto.terminalId);

    const config = await this.configsService.resolveGatewayConfig(
      ctx.companyId,
      route.paymentConfigId,
    );
    const sale = await this.transactionRepository.save(
      this.newSale(ctx, dto, currency, {
        channel: PaymentTransactionChannel.TERMINAL,
        paymentConfigId: config.id,
        provider: config.provider,
        terminalId: dto.terminalId,
      }),
    );

    // Sin await: Bolt mantiene la llamada abierta hasta que el cliente pasa la tarjeta
    void this.dispatchTerminalSale(sale, ctx.companyId, dto.terminalId);

    return {
      statusCode: 202,
      message:
        'Payment prompt sent to the terminal; waiting for the customer card',
      data: this.format(sale),
    };
  }

  /** Estado de una operación; una venta pendiente se consulta antes al proveedor. */
  async findOne(
    transactionId: number,
    user: AuthenticatedUser,
  ): Promise<OnePaymentTransactionResponseDto> {
    const ctx = this.merchantContext(user);
    let transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, merchant_id: ctx.merchantId },
    });
    if (!transaction) ErrorHandler.notFound('Payment transaction not found');

    if (
      transaction.type === PaymentTransactionType.SALE &&
      transaction.status === PaymentTransactionStatus.PENDING
    ) {
      transaction = await this.refreshPendingSale(transaction, ctx.companyId);
    }

    return {
      statusCode: 200,
      message: this.saleMessage(transaction),
      data: this.format(transaction),
    };
  }

  /** Historial de la sucursal, lo más reciente primero. */
  async findAll(
    query: ListPaymentTransactionsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaymentTransactionsPageDto> {
    const ctx = this.merchantContext(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [rows, total] = await this.transactionRepository.findAndCount({
      where: {
        merchant_id: ctx.merchantId,
        ...(query.orderId ? { order_id: query.orderId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      order: { created_at: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      statusCode: 200,
      message: 'Payment transactions retrieved successfully',
      data: rows.map((row) => this.format(row)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Lo que necesita la caja para cobrar: configuraciones activas de la sucursal (con los
   * parámetros públicos para tokenizar en el navegador) y sus terminales activos.
   */
  async checkoutOptions(
    user: AuthenticatedUser,
  ): Promise<CheckoutOptionsResponseDto> {
    const ctx = this.merchantContext(user);
    const configs = await this.configRepository
      .createQueryBuilder('config')
      .where('config.company_id = :companyId', { companyId: ctx.companyId })
      .andWhere('config.is_active = true')
      .andWhere(
        '(config.merchant_id IS NULL OR config.merchant_id = :merchantId)',
        { merchantId: ctx.merchantId },
      )
      .orderBy('config.is_default', 'DESC')
      .addOrderBy('config.id', 'ASC')
      .getMany();
    const terminals = await this.terminalRepository.find({
      where: { merchant_id: ctx.merchantId, is_active: true },
      relations: ['paymentConfig'],
      order: { name: 'ASC' },
    });

    return {
      statusCode: 200,
      message: 'Checkout options retrieved successfully',
      data: {
        configs: configs.map((config) => this.checkoutConfig(config)),
        terminals: terminals
          .filter((t) => t.paymentConfig?.is_active)
          .map((t) => ({
            id: t.id,
            name: t.name,
            model: t.model,
            provider: t.paymentConfig.provider,
            paymentConfigId: t.payment_config_id,
            cashDrawerId: t.cash_drawer_id,
          })),
        defaultCurrency: DEFAULT_CURRENCY,
      },
    };
  }

  private checkoutConfig(config: MerchantPaymentConfig): CheckoutConfigDto {
    // credentials_preview solo trae los campos no secretos en claro
    const preview = config.credentials_preview ?? {};
    const endpoints = gatewayEndpoints();
    let tokenization: CheckoutTokenizationDto;
    if (config.provider === PaymentProvider.STRIPE) {
      tokenization = preview.publishableKey
        ? {
            method: 'stripe_js',
            scriptUrl: endpoints.stripeJs,
            publishableKey: preview.publishableKey,
          }
        : {
            method: 'unavailable',
            reason:
              'Add the publishable key (pk_...) to this Stripe config to take card payments',
          };
    } else if (config.provider === PaymentProvider.CARDPOINTE && preview.site) {
      tokenization = {
        method: 'cardsecure_iframe',
        iframeUrl: endpoints.cardSecureTokenizer(preview.site),
      };
    } else {
      tokenization = {
        method: 'unavailable',
        reason: `Card payments through ${config.provider} are not supported yet`,
      };
    }
    return {
      id: config.id,
      displayName: config.display_name,
      provider: config.provider,
      environment: config.environment,
      isDefault: config.is_default,
      tokenization,
    };
  }

  // ------------------------------------------------- devoluciones y anulaciones

  /** Devolución total o parcial de una venta pagada; acumula lo devuelto en la venta. */
  async refund(
    transactionId: number,
    dto: RefundTransactionDto,
    user: AuthenticatedUser,
  ): Promise<RefundVoidResponseDto> {
    this.assertCanReverse(user);
    const ctx = this.merchantContext(user);

    // 1. Reserva el importe con la venta bloqueada: dos devoluciones simultáneas no pueden
    //    pasar ambas la validación del saldo.
    const { sale, refund } = await this.dataSource.transaction(
      async (manager) => {
        const locked = await this.lockSale(manager, transactionId, ctx);
        await this.assertNoPendingVoid(manager, locked.id);
        if (
          locked.status !== PaymentTransactionStatus.PAID &&
          locked.status !== PaymentTransactionStatus.PARTIALLY_REFUNDED
        ) {
          ErrorHandler.conflict(
            `Only paid transactions can be refunded (this one is ${locked.status})`,
          );
        }

        const refundable = this.refundable(locked);
        const amount = roundMoney(dto.amount ?? refundable);
        if (amount <= 0) {
          ErrorHandler.conflict('The transaction has nothing left to refund');
        }
        if (amount > refundable + MONEY_EPSILON) {
          ErrorHandler.badRequest(
            `Cannot refund ${amount}: only ${refundable} ${locked.currency} is refundable`,
          );
        }

        locked.refunded_amount = roundMoney(
          Number(locked.refunded_amount) + amount,
        );
        await manager.save(PaymentTransaction, locked);
        const child = await manager.save(
          PaymentTransaction,
          this.newChild(
            locked,
            ctx,
            PaymentTransactionType.REFUND,
            amount,
            dto.reason,
          ),
        );
        return { sale: locked, refund: child };
      },
    );

    // 2. Proveedor, fuera de la transacción (no se retiene el candado durante la llamada)
    const result = await this.gatewayCall(PaymentOperation.REFUND, () =>
      this.processing.refund(ctx.companyId, sale.payment_config_id, {
        transactionId: sale.provider_transaction_id!,
        amount: Number(refund.amount),
        currency: sale.currency,
        idempotencyKey: refund.idempotency_key,
      }),
    );

    // 3. Asienta el resultado
    const accepted =
      result.status === PaymentResultStatus.APPROVED ||
      result.status === PaymentResultStatus.PENDING;
    const outcome = await this.dataSource.transaction(async (manager) => {
      const lockedSale = await this.lockById(manager, sale.id);
      const child = await this.lockById(manager, refund.id);
      this.copyResult(child, result, accepted);
      let effects = NO_ORDER_EFFECTS;

      if (accepted) {
        lockedSale.status =
          this.refundable(lockedSale) <= MONEY_EPSILON
            ? PaymentTransactionStatus.REFUNDED
            : PaymentTransactionStatus.PARTIALLY_REFUNDED;
        effects = await this.recordRefundOnOrder(manager, lockedSale, child);
      } else {
        // Se libera la reserva
        lockedSale.refunded_amount = roundMoney(
          Math.max(
            0,
            Number(lockedSale.refunded_amount) - Number(child.amount),
          ),
        );
      }
      await manager.save(PaymentTransaction, [lockedSale, child]);
      return { sale: lockedSale, child, effects };
    });
    await this.afterCommit(outcome.effects);

    return {
      statusCode: 200,
      message: accepted
        ? `Refunded ${Number(outcome.child.amount)} ${outcome.child.currency}`
        : `The gateway did not refund: ${outcome.child.message}`,
      data: this.format(outcome.child),
      sale: this.format(outcome.sale),
    };
  }

  /** Anula una venta pagada y sin devoluciones (antes del cierre de lote). */
  async void(
    transactionId: number,
    dto: VoidTransactionDto,
    user: AuthenticatedUser,
  ): Promise<RefundVoidResponseDto> {
    this.assertCanReverse(user);
    const ctx = this.merchantContext(user);

    const { sale, voidRow } = await this.dataSource.transaction(
      async (manager) => {
        const locked = await this.lockSale(manager, transactionId, ctx);
        await this.assertNoPendingVoid(manager, locked.id);
        if (
          locked.status === PaymentTransactionStatus.PARTIALLY_REFUNDED ||
          Number(locked.refunded_amount) > 0
        ) {
          ErrorHandler.conflict(
            'The transaction already has refunds; refund the rest instead of voiding it',
          );
        }
        if (locked.status !== PaymentTransactionStatus.PAID) {
          ErrorHandler.conflict(
            `Only paid transactions can be voided (this one is ${locked.status})`,
          );
        }
        const child = await manager.save(
          PaymentTransaction,
          this.newChild(
            locked,
            ctx,
            PaymentTransactionType.VOID,
            Number(locked.amount),
            dto.reason,
          ),
        );
        return { sale: locked, voidRow: child };
      },
    );

    const result = await this.gatewayCall(PaymentOperation.VOID, () =>
      this.processing.void(ctx.companyId, sale.payment_config_id, {
        transactionId: sale.provider_transaction_id!,
        idempotencyKey: voidRow.idempotency_key,
      }),
    );

    const approved = result.status === PaymentResultStatus.APPROVED;
    const outcome = await this.dataSource.transaction(async (manager) => {
      const lockedSale = await this.lockById(manager, sale.id);
      const child = await this.lockById(manager, voidRow.id);
      this.copyResult(child, result, approved);
      let effects = NO_ORDER_EFFECTS;
      if (approved) {
        lockedSale.status = PaymentTransactionStatus.VOIDED;
        effects = await this.markOrderPayment(
          manager,
          lockedSale,
          OrderPaymentStatus.VOIDED,
        );
      }
      await manager.save(PaymentTransaction, [lockedSale, child]);
      return { sale: lockedSale, child, effects };
    });
    await this.afterCommit(outcome.effects);

    return {
      statusCode: 200,
      message: approved
        ? 'Transaction voided'
        : `The gateway did not void the transaction: ${outcome.child.message}`,
      data: this.format(outcome.child),
      sale: this.format(outcome.sale),
    };
  }

  // ------------------------------------------------------- resultado de ventas

  private async dispatchTerminalSale(
    sale: PaymentTransaction,
    companyId: number,
    terminalId: number,
  ): Promise<void> {
    try {
      const result = await this.gatewayCall(
        PaymentOperation.TERMINAL_PAYMENT,
        () =>
          this.processing.processTerminalPayment(companyId, terminalId, {
            amount: Number(sale.amount),
            currency: sale.currency,
            orderReference: sale.order_id
              ? `order-${sale.order_id}`
              : undefined,
            idempotencyKey: sale.idempotency_key,
          }),
      );
      await this.applySaleResult(sale.id, result);
    } catch (error) {
      this.logger.error(
        `Terminal sale ${sale.id} could not be recorded: ${(error as Error).message}`,
      );
    }
  }

  private async refreshPendingSale(
    sale: PaymentTransaction,
    companyId: number,
  ): Promise<PaymentTransaction> {
    if (!sale.provider_transaction_id) {
      const age = Date.now() - new Date(sale.created_at).getTime();
      if (
        sale.channel === PaymentTransactionChannel.TERMINAL &&
        age > TERMINAL_ABANDONED_MS
      ) {
        return this.applySaleResult(
          sale.id,
          this.localFailure(
            PaymentOperation.TERMINAL_PAYMENT,
            'The terminal never answered; check the reader before charging again',
          ),
        );
      }
      return sale;
    }

    const result = await this.gatewayCall(PaymentOperation.INQUIRE, () =>
      this.processing.inquire(
        companyId,
        sale.payment_config_id,
        sale.provider_transaction_id!,
      ),
    );
    // Si la consulta misma falló, la venta sigue pendiente: el cobro pudo haber salido
    if (result.status === PaymentResultStatus.ERROR) return sale;
    return this.applySaleResult(sale.id, result);
  }

  /**
   * pending → paid | failed. Con la venta bloqueada, para que el despacho en segundo plano
   * y una consulta simultánea no asienten el pago dos veces.
   */
  private async applySaleResult(
    saleId: number,
    result: PaymentResultDto,
  ): Promise<PaymentTransaction> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const sale = await this.lockById(manager, saleId);
      if (sale.status !== PaymentTransactionStatus.PENDING) {
        return { sale, effects: NO_ORDER_EFFECTS };
      }

      if (result.transactionId)
        sale.provider_transaction_id = result.transactionId;
      sale.authorization_code =
        result.authorizationCode ?? sale.authorization_code;
      sale.provider_code = result.providerCode;
      sale.message = this.truncate(result.message, 255);
      if (result.card) {
        sale.card_brand = this.truncate(result.card.brand, 30);
        sale.card_last4 = result.card.last4?.slice(-4) ?? null;
      }

      let effects = NO_ORDER_EFFECTS;
      if (result.status === PaymentResultStatus.APPROVED) {
        sale.status = PaymentTransactionStatus.PAID;
        sale.completed_at = new Date();
        effects = await this.recordSaleOnOrder(manager, sale);
      } else if (
        result.status === PaymentResultStatus.DECLINED ||
        result.status === PaymentResultStatus.ERROR
      ) {
        sale.status = PaymentTransactionStatus.FAILED;
        sale.completed_at = new Date();
      }
      await manager.save(PaymentTransaction, sale);
      return { sale, effects };
    });
    await this.afterCommit(outcome.effects);
    return outcome.sale;
  }

  // ----------------------------------------------------------------- órdenes

  private async recordSaleOnOrder(
    manager: EntityManager,
    sale: PaymentTransaction,
  ): Promise<OrderEffects> {
    if (!sale.order_id) return NO_ORDER_EFFECTS;
    const order = await manager.findOne(Order, {
      where: { id: sale.order_id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) return NO_ORDER_EFFECTS;
    if (order.is_paid) {
      // El dinero ya se cobró en el gateway: se asienta igual y queda saldo a favor
      this.logger.warn(
        `Order ${order.id} was already paid when sale ${sale.id} was approved`,
      );
    }

    const tip = Number(sale.tip_amount);
    const payment = await manager.save(OrderPayment, {
      order_id: order.id,
      amount: roundMoney(Number(sale.amount) - tip),
      tip_amount: tip,
      method: PAYMENT_METHOD_CARD,
      provider: sale.provider,
      reference: sale.provider_transaction_id,
      is_refund: false,
      status: OrderPaymentStatus.COMPLETED,
      payment_transaction_id: sale.id,
      source:
        sale.channel === PaymentTransactionChannel.TERMINAL
          ? 'payment_terminal'
          : 'payment_gateway',
      shift_id: await this.openCashShiftId(manager, sale.merchant_id),
    });
    sale.order_payment_id = payment.id;
    return this.syncOrder(manager, order.id);
  }

  private async recordRefundOnOrder(
    manager: EntityManager,
    sale: PaymentTransaction,
    refund: PaymentTransaction,
  ): Promise<OrderEffects> {
    if (!sale.order_id) return NO_ORDER_EFFECTS;
    // La devolución sale primero del importe y, pasado este, de la propina
    const base = roundMoney(Number(sale.amount) - Number(sale.tip_amount));
    const before = roundMoney(
      Number(sale.refunded_amount) - Number(refund.amount),
    );
    const amountPart = roundMoney(
      Math.min(Number(refund.amount), Math.max(0, base - before)),
    );
    const refundRow = await manager.save(OrderPayment, {
      order_id: sale.order_id,
      amount: amountPart,
      tip_amount: roundMoney(Number(refund.amount) - amountPart),
      method: PAYMENT_METHOD_CARD,
      provider: sale.provider,
      reference: refund.provider_transaction_id,
      is_refund: true,
      status: OrderPaymentStatus.COMPLETED,
      payment_transaction_id: refund.id,
      source: 'REFUND',
      shift_id: await this.openCashShiftId(manager, sale.merchant_id),
    });
    refund.order_payment_id = refundRow.id;
    return this.markOrderPayment(
      manager,
      sale,
      sale.status === PaymentTransactionStatus.REFUNDED
        ? OrderPaymentStatus.REFUNDED
        : OrderPaymentStatus.PARTIALLY_REFUNDED,
    );
  }

  /** Cambia el estado del pago de la venta y recalcula la orden. */
  private async markOrderPayment(
    manager: EntityManager,
    sale: PaymentTransaction,
    status: OrderPaymentStatus,
  ): Promise<OrderEffects> {
    if (!sale.order_id) return NO_ORDER_EFFECTS;
    await manager.findOne(Order, {
      where: { id: sale.order_id },
      lock: { mode: 'pessimistic_write' },
    });
    if (sale.order_payment_id) {
      await manager.update(
        OrderPayment,
        { id: sale.order_payment_id },
        { status },
      );
    }
    return this.syncOrder(manager, sale.order_id);
  }

  private async syncOrder(
    manager: EntityManager,
    orderId: number,
  ): Promise<OrderEffects> {
    const result = await this.ordersService.syncOrderAggregatesWithManager(
      manager,
      orderId,
    );
    return { orderId, ...result };
  }

  /** Eventos de la orden (inventario, lealtad, pedido online) tras el commit. */
  private async afterCommit(effects: OrderEffects): Promise<void> {
    if (!effects.orderId) return;
    if (effects.becameFullyPaid) {
      this.ordersService.emitOrderFullyPaid(effects.orderId);
    }
    if (effects.becameUnpaid) {
      this.ordersService.emitOrderLoyaltyReversal(effects.orderId);
    }
    try {
      await this.ordersService.syncOnlineOrderFromPosOrder(effects.orderId);
    } catch (error) {
      this.logger.warn(
        `Online order sync failed for order ${effects.orderId}: ${(error as Error).message}`,
      );
    }
  }

  private async openCashShiftId(
    manager: EntityManager,
    merchantId: number,
  ): Promise<number | null> {
    const shift = await manager.findOne(CashShift, {
      where: { merchantId, status: CashShiftStatus.OPEN },
      order: { id: 'DESC' },
      select: ['id'],
    });
    return shift?.id ?? null;
  }

  // ------------------------------------------------------------ validaciones

  private merchantContext(user: AuthenticatedUser): MerchantContext {
    const merchantId = user.merchant?.id;
    const companyId = user.merchant?.companyId;
    if (!merchantId || !companyId) {
      ErrorHandler.forbidden(
        'Payments are processed in the context of a branch; sign in with a merchant user',
      );
    }
    return { merchantId, companyId, userId: user.id };
  }

  /** Store Manager / Finance: administradores del merchant o el gerente del turno. */
  private assertCanReverse(user: AuthenticatedUser): void {
    const allowed =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PORTAL_ADMIN ||
      user.role === UserRole.MERCHANT_ADMIN ||
      (user.role === UserRole.MERCHANT_USER &&
        user.shiftRole === ShiftRole.MANAGER);
    if (!allowed) {
      ErrorHandler.forbidden(
        'Only a store manager can refund or void payments',
      );
    }
  }

  private async assertPayableOrder(
    merchantId: number,
    orderId: number,
    amount: number,
  ): Promise<void> {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id: orderId, merchant_id: merchantId },
      select: ['id', 'logical_status', 'is_paid', 'balance_due'],
    });
    if (!order) ErrorHandler.notFound('Order not found');
    if (order.logical_status !== OrderStatus.ACTIVE) {
      ErrorHandler.badRequest('Cannot charge a deleted order');
    }
    if (order.is_paid) ErrorHandler.conflict('The order is already paid');
    const balanceDue = roundMoney(Number(order.balance_due));
    if (amount > balanceDue + MONEY_EPSILON) {
      ErrorHandler.badRequest(
        `amount ${amount} exceeds the order balance due (${balanceDue}); send the tip in tipAmount`,
      );
    }
  }

  private async assertTerminalFree(terminalId: number): Promise<void> {
    const pending = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.terminal_id = :terminalId', { terminalId })
      .andWhere('t.status = :status', {
        status: PaymentTransactionStatus.PENDING,
      })
      .andWhere('t.created_at > :since', {
        since: new Date(Date.now() - TERMINAL_BUSY_MS),
      })
      .getOne();
    if (pending) {
      ErrorHandler.conflict(
        `The terminal is busy with transaction ${pending.id}; wait for it to finish`,
      );
    }
  }

  private async lockSale(
    manager: EntityManager,
    transactionId: number,
    ctx: MerchantContext,
  ): Promise<PaymentTransaction> {
    const sale = await manager.findOne(PaymentTransaction, {
      where: { id: transactionId, merchant_id: ctx.merchantId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!sale) ErrorHandler.notFound('Payment transaction not found');
    if (sale.type !== PaymentTransactionType.SALE) {
      ErrorHandler.badRequest('Only sales can be refunded or voided');
    }
    if (LOCKED_SALE_STATUSES.includes(sale.status)) {
      ErrorHandler.conflict(
        sale.status === PaymentTransactionStatus.VOIDED
          ? 'The transaction is already voided'
          : 'The transaction is already fully refunded',
      );
    }
    if (!sale.provider_transaction_id) {
      ErrorHandler.conflict('The gateway gave no transaction id for this sale');
    }
    return sale;
  }

  private async assertNoPendingVoid(
    manager: EntityManager,
    saleId: number,
  ): Promise<void> {
    const pendingVoid = await manager.exists(PaymentTransaction, {
      where: {
        parent_transaction_id: saleId,
        type: PaymentTransactionType.VOID,
        status: PaymentTransactionStatus.PENDING,
      },
    });
    if (pendingVoid) {
      ErrorHandler.conflict(
        'A void of this transaction is already in progress',
      );
    }
  }

  private async lockById(
    manager: EntityManager,
    id: number,
  ): Promise<PaymentTransaction> {
    const row = await manager.findOne(PaymentTransaction, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!row) ErrorHandler.notFound(`Payment transaction ${id} not found`);
    return row;
  }

  // ----------------------------------------------------------------- helpers

  /** Lo que una excepción del motor (config inválida, proveedor sin soporte) deja como error. */
  private async gatewayCall(
    operation: PaymentOperation,
    call: () => Promise<PaymentResultDto>,
  ): Promise<PaymentResultDto> {
    try {
      return await call();
    } catch (error) {
      return this.localFailure(operation, (error as Error).message);
    }
  }

  private localFailure(
    operation: PaymentOperation,
    message: string,
  ): PaymentResultDto {
    // Sin proveedor: la operación no llegó a salir del motor de pagos
    return buildPaymentResult({
      provider: null as unknown as PaymentResultDto['provider'],
      operation,
      status: PaymentResultStatus.ERROR,
      transactionId: null,
      authorizationCode: null,
      amount: null,
      currency: null,
      message,
      providerCode: null,
    });
  }

  private newSale(
    ctx: MerchantContext,
    dto: { orderId: number; amount: number; tipAmount?: number },
    currency: string,
    route: Pick<PaymentTransaction, 'channel' | 'provider'> & {
      paymentConfigId: number;
      terminalId: number | null;
    },
  ): PaymentTransaction {
    const tip = roundMoney(dto.tipAmount ?? 0);
    return this.transactionRepository.create({
      company_id: ctx.companyId,
      merchant_id: ctx.merchantId,
      order_id: dto.orderId,
      payment_config_id: route.paymentConfigId,
      terminal_id: route.terminalId,
      provider: route.provider,
      type: PaymentTransactionType.SALE,
      channel: route.channel,
      status: PaymentTransactionStatus.PENDING,
      amount: roundMoney(dto.amount + tip),
      tip_amount: tip,
      refunded_amount: 0,
      currency,
      idempotency_key: randomUUID(),
      created_by_user_id: ctx.userId,
    });
  }

  private newChild(
    sale: PaymentTransaction,
    ctx: MerchantContext,
    type: PaymentTransactionType.REFUND | PaymentTransactionType.VOID,
    amount: number,
    reason?: string,
  ): PaymentTransaction {
    return this.transactionRepository.create({
      company_id: sale.company_id,
      merchant_id: sale.merchant_id,
      order_id: sale.order_id,
      parent_transaction_id: sale.id,
      payment_config_id: sale.payment_config_id,
      terminal_id: sale.terminal_id,
      provider: sale.provider,
      type,
      channel: sale.channel,
      status: PaymentTransactionStatus.PENDING,
      amount: roundMoney(amount),
      tip_amount: 0,
      refunded_amount: 0,
      currency: sale.currency,
      idempotency_key: randomUUID(),
      reason: reason ?? null,
      created_by_user_id: ctx.userId,
    });
  }

  private copyResult(
    row: PaymentTransaction,
    result: PaymentResultDto,
    succeeded: boolean,
  ): void {
    row.status = succeeded
      ? PaymentTransactionStatus.SUCCEEDED
      : PaymentTransactionStatus.FAILED;
    row.provider_transaction_id =
      result.transactionId ?? row.provider_transaction_id;
    row.authorization_code = result.authorizationCode;
    row.provider_code = result.providerCode;
    row.message = this.truncate(result.message, 255);
    row.completed_at = new Date();
  }

  private refundable(sale: PaymentTransaction): number {
    return roundMoney(Number(sale.amount) - Number(sale.refunded_amount));
  }

  private currency(value?: string): string {
    return (value ?? DEFAULT_CURRENCY).toUpperCase();
  }

  private truncate(
    value: string | null | undefined,
    max: number,
  ): string | null {
    if (value === null || value === undefined) return null;
    return value.length > max ? value.slice(0, max) : value;
  }

  private saleMessage(transaction: PaymentTransaction): string {
    switch (transaction.status) {
      case PaymentTransactionStatus.PAID:
        return 'Payment approved';
      case PaymentTransactionStatus.PENDING:
        return 'Payment pending';
      case PaymentTransactionStatus.FAILED:
        return `Payment failed: ${transaction.message ?? 'no reason given'}`;
      default:
        return `Transaction ${transaction.status}`;
    }
  }

  format(row: PaymentTransaction): PaymentTransactionDto {
    const isSale = row.type === PaymentTransactionType.SALE;
    return {
      id: row.id,
      type: row.type,
      channel: row.channel,
      status: row.status,
      provider: row.provider,
      amount: Number(row.amount),
      tipAmount: Number(row.tip_amount),
      refundedAmount: Number(row.refunded_amount),
      refundableAmount:
        isSale &&
        (row.status === PaymentTransactionStatus.PAID ||
          row.status === PaymentTransactionStatus.PARTIALLY_REFUNDED)
          ? this.refundable(row)
          : 0,
      currency: row.currency,
      orderId: row.order_id,
      orderPaymentId: row.order_payment_id ?? null,
      parentTransactionId: row.parent_transaction_id ?? null,
      paymentConfigId: row.payment_config_id,
      terminalId: row.terminal_id,
      providerTransactionId: row.provider_transaction_id ?? null,
      authorizationCode: row.authorization_code ?? null,
      providerCode: row.provider_code ?? null,
      message: row.message ?? null,
      cardBrand: row.card_brand ?? null,
      cardLast4: row.card_last4 ?? null,
      reason: row.reason ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at ?? null,
    };
  }
}
