/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ShiftRole } from 'src/restaurant-operations/shift/shifts/constants/shift-role.enum';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { OrderStatus } from 'src/restaurant-operations/pos/orders/constants/order-status.enum';
import { OrdersService } from 'src/restaurant-operations/pos/orders/orders.service';
import { OrderPayment } from 'src/restaurant-operations/pos/order-payments/entities/order-payment.entity';
import { OrderPaymentStatus } from 'src/restaurant-operations/pos/order-payments/constants/order-payment-status.enum';
import { CashShift } from 'src/restaurant-operations/cashdrawer/cash-shifts/entities/cash-shift.entity';
import { PaymentProvider } from '../constants/payment-provider.enum';
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
import { PaymentEnvironment } from '../constants/payment-provider.enum';
import {
  PaymentTransactionChannel,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from './constants/payment-transaction.enums';
import { PaymentTransactionsService } from './payment-transactions.service';
import { ChargeDto } from './dto/charge.dto';
import { looksLikeRawCardData } from './dto/card-data.validators';

// ------------------------------------------------------------------ fakes

type Row = Record<string, unknown> & { id: number };

/** Base en memoria con lo que usa el servicio de un EntityManager / Repository. */
function memoryDb() {
  const tables = new Map<unknown, Row[]>([
    [PaymentTransaction, []],
    [OrderPayment, []],
    [Order, []],
    [CashShift, []],
  ]);
  const ids = new Map<unknown, number>();
  const table = (entity: unknown) => tables.get(entity)!;
  const matches = (row: Row, where: Record<string, unknown> = {}) =>
    Object.entries(where).every(([key, value]) => row[key] === value);

  const save = (entity: unknown, input: Row | Row[]) => {
    const many = Array.isArray(input) ? input : [input];
    const saved = many.map((value) => {
      const rows = table(entity);
      if (value.id === undefined) {
        const next = (ids.get(entity) ?? 0) + 1;
        ids.set(entity, next);
        const row = { created_at: new Date(), ...value, id: next } as Row;
        rows.push(row);
        Object.assign(value, row);
        return { ...row };
      }
      const existing = rows.find((r) => r.id === value.id);
      if (existing) Object.assign(existing, value);
      else rows.push({ ...value });
      return { ...value };
    });
    return Promise.resolve(Array.isArray(input) ? saved : saved[0]);
  };

  const manager = {
    findOne: jest.fn(
      (entity: unknown, options: { where?: Record<string, unknown> }) => {
        const row = table(entity).find((r) => matches(r, options.where));
        return Promise.resolve(row ? { ...row } : null);
      },
    ),
    exists: jest.fn(
      (entity: unknown, options: { where?: Record<string, unknown> }) =>
        Promise.resolve(table(entity).some((r) => matches(r, options.where))),
    ),
    save: jest.fn(save),
    update: jest.fn(
      (entity: unknown, where: Record<string, unknown>, patch: object) => {
        table(entity)
          .filter((r) => matches(r, where))
          .forEach((r) => Object.assign(r, patch));
        return Promise.resolve();
      },
    ),
  };

  const transactionRepository = {
    create: jest.fn((value: object) => ({ ...value })),
    save: jest.fn((value: Row) => save(PaymentTransaction, value)),
    findOne: jest.fn((options: { where?: Record<string, unknown> }) =>
      manager.findOne(PaymentTransaction, options),
    ),
    createQueryBuilder: jest.fn(() => {
      const qb = {
        where: () => qb,
        andWhere: () => qb,
        getOne: () =>
          Promise.resolve(
            table(PaymentTransaction).find(
              (r) =>
                r.status === PaymentTransactionStatus.PENDING && r.terminal_id,
            ) ?? null,
          ),
      };
      return qb;
    }),
  };

  const dataSource = {
    transaction: jest.fn((work: (m: typeof manager) => Promise<unknown>) =>
      work(manager),
    ),
    getRepository: jest.fn((entity: unknown) => ({
      findOne: (options: { where?: Record<string, unknown> }) =>
        manager.findOne(entity, options),
    })),
  };

  return { tables, table, manager, transactionRepository, dataSource };
}

const MERCHANT_ID = 10;
const COMPANY_ID = 1;

function user(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 99,
    email: 'manager@x7.test',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: MERCHANT_ID, companyId: COMPANY_ID },
    ...overrides,
  };
}

function result(
  status: PaymentResultStatus,
  overrides: Partial<PaymentResultDto> = {},
): PaymentResultDto {
  return {
    ...buildPaymentResult({
      provider: PaymentProvider.STRIPE,
      operation: PaymentOperation.CHARGE,
      status,
      transactionId: 'pi_1',
      authorizationCode: '046221',
      amount: null,
      currency: 'USD',
      message:
        status === PaymentResultStatus.APPROVED ? 'Approved' : 'Card declined',
      providerCode: null,
      card: { brand: 'visa', last4: '4242' },
    }),
    ...overrides,
  };
}

function setup() {
  const db = memoryDb();
  db.table(Order).push({
    id: 42,
    merchant_id: MERCHANT_ID,
    logical_status: OrderStatus.ACTIVE,
    is_paid: false,
    balance_due: 50,
  });

  const processing = {
    charge: jest.fn().mockResolvedValue(result(PaymentResultStatus.APPROVED)),
    processTerminalPayment: jest.fn(),
    refund: jest.fn(),
    void: jest.fn(),
    inquire: jest.fn(),
  } as unknown as jest.Mocked<PaymentProcessingService>;
  const configs = {
    resolveChargeConfig: jest.fn().mockResolvedValue({
      id: 7,
      provider: PaymentProvider.STRIPE,
    }),
    resolveGatewayConfig: jest.fn().mockResolvedValue({
      id: 8,
      provider: PaymentProvider.CARDPOINTE,
    }),
  } as unknown as jest.Mocked<MerchantPaymentConfigsService>;
  const terminals = {
    resolveRoute: jest.fn().mockResolvedValue({
      terminalId: 3,
      merchantId: MERCHANT_ID,
      paymentConfigId: 8,
      deviceIdentifier: 'HSN-1',
    }),
  } as unknown as jest.Mocked<PaymentTerminalsService>;
  const orders = {
    syncOrderAggregatesWithManager: jest
      .fn()
      .mockResolvedValue({ becameFullyPaid: true, becameUnpaid: false }),
    emitOrderFullyPaid: jest.fn(),
    emitOrderLoyaltyReversal: jest.fn(),
    syncOnlineOrderFromPosOrder: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<OrdersService>;

  const configRows: Partial<MerchantPaymentConfig>[] = [];
  const terminalRows: Partial<PaymentTerminal>[] = [];
  const configRepository = {
    createQueryBuilder: jest.fn(() => {
      const qb = {
        where: () => qb,
        andWhere: () => qb,
        orderBy: () => qb,
        addOrderBy: () => qb,
        getMany: () => Promise.resolve(configRows),
      };
      return qb;
    }),
  };
  const terminalRepository = {
    find: jest.fn(() => Promise.resolve(terminalRows)),
  };

  const service = new PaymentTransactionsService(
    db.dataSource as unknown as DataSource,
    db.transactionRepository as unknown as Repository<PaymentTransaction>,
    configRepository as unknown as Repository<MerchantPaymentConfig>,
    terminalRepository as unknown as Repository<PaymentTerminal>,
    processing,
    configs,
    terminals,
    orders,
  );
  return {
    service,
    db,
    processing,
    configs,
    terminals,
    orders,
    configRows,
    terminalRows,
  };
}

const CHARGE: ChargeDto = {
  orderId: 42,
  amount: 50,
  tipAmount: 5,
  paymentMethodToken: 'pm_card_visa',
};

/** Venta pagada de 55 (50 + 5 de propina) asentada en la orden. */
async function paidSale(ctx: ReturnType<typeof setup>) {
  const { data } = await ctx.service.charge(CHARGE, user());
  return data;
}

// ------------------------------------------------------------------ tests

describe('card data validation (PCI-DSS scope)', () => {
  it.each([
    ['4242424242424242', true],
    ['4242 4242 4242 4242', true],
    ['5555-5555-5555-4444', true],
    ['123', true],
    ['1234', true],
    ['9418594164541111', false], // CardSecure token: always starts with 9
    ['pm_card_visa', false],
    ['tok_visa', false],
    ['4242424242424241', false], // fails Luhn: not a card number
  ])('looksLikeRawCardData(%s) = %s', (value, expected) => {
    expect(looksLikeRawCardData(value)).toBe(expected);
  });

  it('rejects a PAN sent as the token', async () => {
    const dto = plainToInstance(ChargeDto, {
      ...CHARGE,
      paymentMethodToken: '4111111111111111',
    });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('paymentMethodToken');
  });

  it('rejects raw card fields even alongside a valid token', async () => {
    const dto = plainToInstance(ChargeDto, {
      ...CHARGE,
      cardNumber: '4111111111111111',
      cvv: '123',
    });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['cardNumber', 'cvv']),
    );
  });

  it('accepts a tokenized payload', async () => {
    const dto = plainToInstance(ChargeDto, {
      ...CHARGE,
      paymentProvider: PaymentProvider.STRIPE,
    });
    expect(await validate(dto)).toHaveLength(0);
  });
});

describe('PaymentTransactionsService.charge', () => {
  it('uses the default provider when none is given and records the audit row', async () => {
    const ctx = setup();
    const { data, statusCode } = await ctx.service.charge(CHARGE, user());

    expect(ctx.configs.resolveChargeConfig).toHaveBeenCalledWith(
      COMPANY_ID,
      MERCHANT_ID,
      undefined,
    );
    expect(statusCode).toBe(201);
    expect(data).toMatchObject({
      type: PaymentTransactionType.SALE,
      channel: PaymentTransactionChannel.TOKEN,
      status: PaymentTransactionStatus.PAID,
      provider: PaymentProvider.STRIPE,
      amount: 55,
      tipAmount: 5,
      providerTransactionId: 'pi_1',
      authorizationCode: '046221',
      cardBrand: 'visa',
      cardLast4: '4242',
      paymentConfigId: 7,
    });
    const charged = ctx.processing.charge.mock.calls[0];
    expect(charged[1]).toMatchObject({
      amount: 55,
      paymentToken: 'pm_card_visa',
    });
    expect(charged[1].idempotencyKey).toEqual(expect.any(String));
  });

  it('passes the requested provider to the config resolution', async () => {
    const ctx = setup();
    await ctx.service.charge(
      { ...CHARGE, paymentProvider: PaymentProvider.CARDPOINTE },
      user(),
    );
    expect(ctx.configs.resolveChargeConfig).toHaveBeenCalledWith(
      COMPANY_ID,
      MERCHANT_ID,
      PaymentProvider.CARDPOINTE,
    );
  });

  it('records the order payment and syncs the order (→ PAID) on approval', async () => {
    const ctx = setup();
    const sale = await paidSale(ctx);

    const [payment] = ctx.db.table(OrderPayment);
    expect(payment).toMatchObject({
      order_id: 42,
      amount: 50,
      tip_amount: 5,
      method: 'card',
      is_refund: false,
      status: OrderPaymentStatus.COMPLETED,
      payment_transaction_id: sale.id,
      reference: 'pi_1',
    });
    expect(sale.orderPaymentId).toBe(payment.id);
    expect(ctx.orders.syncOrderAggregatesWithManager).toHaveBeenCalled();
    expect(ctx.orders.emitOrderFullyPaid).toHaveBeenCalledWith(42);
  });

  it('keeps a failed audit row and does not touch the order when declined', async () => {
    const ctx = setup();
    ctx.processing.charge.mockResolvedValue(
      result(PaymentResultStatus.DECLINED),
    );
    const { data } = await ctx.service.charge(CHARGE, user());

    expect(data.status).toBe(PaymentTransactionStatus.FAILED);
    expect(data.message).toBe('Card declined');
    expect(ctx.db.table(OrderPayment)).toHaveLength(0);
    expect(ctx.db.table(PaymentTransaction)).toHaveLength(1);
  });

  it('records the attempt as failed when the engine throws', async () => {
    const ctx = setup();
    ctx.processing.charge.mockRejectedValue(new Error('not supported yet'));
    const { data } = await ctx.service.charge(CHARGE, user());
    expect(data.status).toBe(PaymentTransactionStatus.FAILED);
    expect(data.message).toBe('not supported yet');
  });

  it('rejects an amount above the balance due', async () => {
    const ctx = setup();
    await expect(
      ctx.service.charge({ ...CHARGE, amount: 80 }, user()),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.processing.charge).not.toHaveBeenCalled();
  });

  it('rejects an already paid order', async () => {
    const ctx = setup();
    ctx.db.table(Order)[0].is_paid = true;
    await expect(ctx.service.charge(CHARGE, user())).rejects.toThrow(
      ConflictException,
    );
  });

  it('needs a branch context', async () => {
    const ctx = setup();
    await expect(
      ctx.service.charge(CHARGE, user({ merchant: undefined as never })),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('PaymentTransactionsService.terminalSale', () => {
  const TERMINAL = { orderId: 42, amount: 50, terminalId: 3 };

  it('answers pending at once and records PAID when the terminal approves', async () => {
    const ctx = setup();
    let approve!: (r: PaymentResultDto) => void;
    ctx.processing.processTerminalPayment.mockReturnValue(
      new Promise((resolve) => (approve = resolve)),
    );

    const response = await ctx.service.terminalSale(TERMINAL, user());
    expect(response.statusCode).toBe(202);
    expect(response.data).toMatchObject({
      status: PaymentTransactionStatus.PENDING,
      channel: PaymentTransactionChannel.TERMINAL,
      terminalId: 3,
      provider: PaymentProvider.CARDPOINTE,
    });
    expect(ctx.processing.processTerminalPayment).toHaveBeenCalledWith(
      COMPANY_ID,
      3,
      expect.objectContaining({ amount: 50, currency: 'USD' }),
    );

    approve(result(PaymentResultStatus.APPROVED, { transactionId: '1234' }));
    await new Promise((r) => setImmediate(r));

    const { data } = await ctx.service.findOne(response.data.id, user());
    expect(data.status).toBe(PaymentTransactionStatus.PAID);
    expect(data.providerTransactionId).toBe('1234');
    expect(ctx.db.table(OrderPayment)).toHaveLength(1);
  });

  it('moves a pending Stripe reader sale to PAID when polled', async () => {
    const ctx = setup();
    ctx.processing.processTerminalPayment.mockResolvedValue(
      result(PaymentResultStatus.PENDING, { transactionId: 'pi_reader' }),
    );
    const { data: pending } = await ctx.service.terminalSale(TERMINAL, user());
    await new Promise((r) => setImmediate(r));

    ctx.processing.inquire.mockResolvedValueOnce(
      result(PaymentResultStatus.PENDING, { transactionId: 'pi_reader' }),
    );
    expect((await ctx.service.findOne(pending.id, user())).data.status).toBe(
      PaymentTransactionStatus.PENDING,
    );

    ctx.processing.inquire.mockResolvedValueOnce(
      result(PaymentResultStatus.APPROVED, { transactionId: 'pi_reader' }),
    );
    const { data } = await ctx.service.findOne(pending.id, user());
    expect(ctx.processing.inquire).toHaveBeenCalledWith(
      COMPANY_ID,
      8,
      'pi_reader',
    );
    expect(data.status).toBe(PaymentTransactionStatus.PAID);
  });

  it('marks the sale FAILED when the terminal declines', async () => {
    const ctx = setup();
    ctx.processing.processTerminalPayment.mockResolvedValue(
      result(PaymentResultStatus.DECLINED),
    );
    const { data: pending } = await ctx.service.terminalSale(TERMINAL, user());
    await new Promise((r) => setImmediate(r));
    const { data } = await ctx.service.findOne(pending.id, user());
    expect(data.status).toBe(PaymentTransactionStatus.FAILED);
    expect(ctx.db.table(OrderPayment)).toHaveLength(0);
  });

  it('rejects a terminal of another branch', async () => {
    const ctx = setup();
    ctx.terminals.resolveRoute.mockResolvedValue({
      terminalId: 3,
      merchantId: 777,
      paymentConfigId: 8,
      deviceIdentifier: 'HSN-1',
    });
    await expect(ctx.service.terminalSale(TERMINAL, user())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a second sale while the terminal is busy', async () => {
    const ctx = setup();
    ctx.processing.processTerminalPayment.mockReturnValue(
      new Promise(() => {}),
    );
    await ctx.service.terminalSale(TERMINAL, user());
    await expect(ctx.service.terminalSale(TERMINAL, user())).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('PaymentTransactionsService.refund', () => {
  it('supports partial refunds and accumulates the refunded balance', async () => {
    const ctx = setup();
    const sale = await paidSale(ctx);
    ctx.processing.refund.mockResolvedValue(
      result(PaymentResultStatus.APPROVED, { transactionId: 're_1' }),
    );

    const first = await ctx.service.refund(sale.id, { amount: 20 }, user());
    expect(first.data).toMatchObject({
      type: PaymentTransactionType.REFUND,
      status: PaymentTransactionStatus.SUCCEEDED,
      amount: 20,
      parentTransactionId: sale.id,
    });
    expect(first.sale).toMatchObject({
      status: PaymentTransactionStatus.PARTIALLY_REFUNDED,
      refundedAmount: 20,
      refundableAmount: 35,
    });
    expect(ctx.processing.refund).toHaveBeenCalledWith(COMPANY_ID, 7, {
      transactionId: 'pi_1',
      amount: 20,
      currency: 'USD',
      idempotencyKey: expect.any(String),
    });
    const original = ctx.db.table(OrderPayment).find((p) => !p.is_refund)!;
    expect(original.status).toBe(OrderPaymentStatus.PARTIALLY_REFUNDED);
    expect(ctx.db.table(OrderPayment).find((p) => p.is_refund)).toMatchObject({
      amount: 20,
      tip_amount: 0,
    });

    // Sin importe: devuelve el resto (35) y la venta queda REFUNDED
    const second = await ctx.service.refund(sale.id, {}, user());
    expect(second.data.amount).toBe(35);
    expect(second.sale).toMatchObject({
      status: PaymentTransactionStatus.REFUNDED,
      refundedAmount: 55,
      refundableAmount: 0,
    });
    expect(original.status).toBe(OrderPaymentStatus.REFUNDED);
    // 30 del importe y 5 de la propina
    expect(
      ctx.db.table(OrderPayment).filter((p) => p.is_refund)[1],
    ).toMatchObject({
      amount: 30,
      tip_amount: 5,
    });
  });

  it('locks a fully refunded transaction', async () => {
    const ctx = setup();
    const sale = await paidSale(ctx);
    ctx.processing.refund.mockResolvedValue(
      result(PaymentResultStatus.APPROVED),
    );
    await ctx.service.refund(sale.id, {}, user());

    await expect(ctx.service.refund(sale.id, {}, user())).rejects.toThrow(
      'already fully refunded',
    );
    await expect(ctx.service.void(sale.id, {}, user())).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects a refund above what is still refundable', async () => {
    const ctx = setup();
    const sale = await paidSale(ctx);
    await expect(
      ctx.service.refund(sale.id, { amount: 60 }, user()),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.processing.refund).not.toHaveBeenCalled();
  });

  it('releases the reserved amount when the gateway declines', async () => {
    const ctx = setup();
    const sale = await paidSale(ctx);
    ctx.processing.refund.mockResolvedValue(
      result(PaymentResultStatus.DECLINED),
    );

    const response = await ctx.service.refund(sale.id, { amount: 20 }, user());
    expect(response.data.status).toBe(PaymentTransactionStatus.FAILED);
    expect(response.sale).toMatchObject({
      status: PaymentTransactionStatus.PAID,
      refundedAmount: 0,
    });
    expect(ctx.db.table(OrderPayment).filter((p) => p.is_refund)).toHaveLength(
      0,
    );
  });

  it('allows a manager on shift but not a regular cashier', async () => {
    const ctx = setup();
    const sale = await paidSale(ctx);
    ctx.processing.refund.mockResolvedValue(
      result(PaymentResultStatus.APPROVED),
    );

    await expect(
      ctx.service.refund(
        sale.id,
        { amount: 1 },
        user({ role: UserRole.MERCHANT_USER, shiftRole: ShiftRole.CASHIER }),
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      ctx.service.refund(
        sale.id,
        { amount: 1 },
        user({ role: UserRole.MERCHANT_USER, shiftRole: ShiftRole.MANAGER }),
      ),
    ).resolves.toBeDefined();
  });

  it('only refunds sales that are paid', async () => {
    const ctx = setup();
    ctx.processing.charge.mockResolvedValue(
      result(PaymentResultStatus.DECLINED),
    );
    const { data } = await ctx.service.charge(CHARGE, user());
    await expect(ctx.service.refund(data.id, {}, user())).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('PaymentTransactionsService.void', () => {
  it('voids a paid sale and marks the order payment VOIDED', async () => {
    const ctx = setup();
    const sale = await paidSale(ctx);
    ctx.processing.void.mockResolvedValue(result(PaymentResultStatus.APPROVED));
    ctx.orders.syncOrderAggregatesWithManager.mockResolvedValue({
      becameFullyPaid: false,
      becameUnpaid: true,
    });

    const response = await ctx.service.void(
      sale.id,
      { reason: 'twice' },
      user(),
    );
    expect(response.data).toMatchObject({
      type: PaymentTransactionType.VOID,
      status: PaymentTransactionStatus.SUCCEEDED,
      reason: 'twice',
    });
    expect(response.sale.status).toBe(PaymentTransactionStatus.VOIDED);
    expect(ctx.db.table(OrderPayment)[0].status).toBe(
      OrderPaymentStatus.VOIDED,
    );
    expect(ctx.orders.emitOrderLoyaltyReversal).toHaveBeenCalledWith(42);
  });

  it('locks a voided transaction against refunds and a second void', async () => {
    const ctx = setup();
    const sale = await paidSale(ctx);
    ctx.processing.void.mockResolvedValue(result(PaymentResultStatus.APPROVED));
    await ctx.service.void(sale.id, {}, user());

    await expect(ctx.service.void(sale.id, {}, user())).rejects.toThrow(
      'already voided',
    );
    await expect(ctx.service.refund(sale.id, {}, user())).rejects.toThrow(
      'already voided',
    );
  });

  it('does not void a sale that already has refunds', async () => {
    const ctx = setup();
    const sale = await paidSale(ctx);
    ctx.processing.refund.mockResolvedValue(
      result(PaymentResultStatus.APPROVED),
    );
    await ctx.service.refund(sale.id, { amount: 5 }, user());

    await expect(ctx.service.void(sale.id, {}, user())).rejects.toThrow(
      'already has refunds',
    );
  });

  it('keeps the sale PAID when the gateway refuses the void (already settled)', async () => {
    const ctx = setup();
    const sale = await paidSale(ctx);
    ctx.processing.void.mockResolvedValue(
      result(PaymentResultStatus.DECLINED, {
        message: 'Txn not found / settled',
      }),
    );
    const response = await ctx.service.void(sale.id, {}, user());
    expect(response.data.status).toBe(PaymentTransactionStatus.FAILED);
    expect(response.sale.status).toBe(PaymentTransactionStatus.PAID);
    expect(ctx.db.table(OrderPayment)[0].status).toBe(
      OrderPaymentStatus.COMPLETED,
    );
  });
});

describe('PaymentTransactionsService.checkoutOptions', () => {
  afterEach(() => {
    delete process.env.PAYMENT_GATEWAY_SANDBOX_URL;
  });

  it('exposes only public tokenization values and the active terminals', async () => {
    const ctx = setup();
    ctx.configRows.push(
      {
        id: 7,
        display_name: 'Stripe main',
        provider: PaymentProvider.STRIPE,
        environment: PaymentEnvironment.SANDBOX,
        is_default: true,
        credentials_preview: {
          secretKey: 'sk_test_****1234',
          publishableKey: 'pk_test_abc',
        },
      },
      {
        id: 8,
        display_name: 'CardPointe',
        provider: PaymentProvider.CARDPOINTE,
        environment: PaymentEnvironment.SANDBOX,
        is_default: false,
        credentials_preview: { merchantId: '496160873888', site: 'fts-uat' },
      },
      {
        id: 9,
        display_name: 'Stripe without pk',
        provider: PaymentProvider.STRIPE,
        environment: PaymentEnvironment.SANDBOX,
        is_default: false,
        credentials_preview: { secretKey: 'sk_test_****9999' },
      },
    );
    ctx.terminalRows.push(
      {
        id: 3,
        name: 'Counter',
        model: 'Lane/3000',
        payment_config_id: 8,
        cash_drawer_id: null,
        paymentConfig: {
          provider: PaymentProvider.CARDPOINTE,
          is_active: true,
        } as MerchantPaymentConfig,
      },
      {
        id: 4,
        name: 'Old reader',
        model: null,
        payment_config_id: 10,
        cash_drawer_id: null,
        paymentConfig: {
          provider: PaymentProvider.STRIPE,
          is_active: false,
        } as MerchantPaymentConfig,
      },
    );

    const { data } = await ctx.service.checkoutOptions(user());
    expect(data.configs[0].tokenization).toEqual({
      method: 'stripe_js',
      scriptUrl: 'https://js.stripe.com/v3/',
      publishableKey: 'pk_test_abc',
    });
    expect(data.configs[1].tokenization).toEqual({
      method: 'cardsecure_iframe',
      iframeUrl: 'https://fts-uat.cardconnect.com/itoke/ajax-tokenizer.html',
    });
    expect(data.configs[2].tokenization.method).toBe('unavailable');
    expect(JSON.stringify(data)).not.toContain('sk_test');
    expect(data.terminals.map((t) => t.id)).toEqual([3]);
  });

  it('points the tokenizers at the sandbox gateway when one is configured', async () => {
    process.env.PAYMENT_GATEWAY_SANDBOX_URL = 'http://127.0.0.1:4599';
    const ctx = setup();
    ctx.configRows.push({
      id: 8,
      display_name: 'CardPointe',
      provider: PaymentProvider.CARDPOINTE,
      environment: PaymentEnvironment.SANDBOX,
      is_default: true,
      credentials_preview: { site: 'fts-uat' },
    });
    const { data } = await ctx.service.checkoutOptions(user());
    expect(data.configs[0].tokenization.iframeUrl).toBe(
      'http://127.0.0.1:4599/cardpointe/fts-uat/itoke/ajax-tokenizer.html',
    );
  });
});
