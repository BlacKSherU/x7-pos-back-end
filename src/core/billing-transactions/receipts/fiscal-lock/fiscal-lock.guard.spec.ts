import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { Receipt } from '../entities/receipt.entity';
import { ReceiptItem } from '../../receipt-item/entities/receipt-item.entity';
import { ReceiptTax } from '../../receipt-tax/entities/receipt-tax.entity';
import { FiscalLockGuard, toPositiveInt } from './fiscal-lock.guard';
import {
  FISCAL_LOCK_SOURCE_KEY,
  FiscalLockSource,
} from './fiscal-lock.constants';
import { FiscalLock } from './fiscal-lock.decorator';
import { ReceiptAuditLog } from '../audit/entities/receipt-audit-log.entity';
import { ReceiptAuditAction } from '../audit/receipt-audit-action.enum';

const LOCK_MESSAGE = 'Receipt is fiscally locked and cannot be modified.';

describe('FiscalLockGuard (Historia 11)', () => {
  const receipts = new Map<number, Partial<Receipt>>();
  const items = new Map<number, Partial<ReceiptItem>>();
  const taxes = new Map<number, Partial<ReceiptTax>>();

  const repoOf = (rows: Map<number, unknown>) => ({
    findOne: jest.fn(({ where }: { where: { id: number } }) =>
      Promise.resolve(rows.get(where.id) ?? null),
    ),
  });
  const receiptRepo = repoOf(receipts);
  const itemRepo = repoOf(items);
  const taxRepo = repoOf(taxes);
  const auditRepo = { save: jest.fn() };

  const dataSource = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Receipt) return receiptRepo;
      if (entity === ReceiptItem) return itemRepo;
      if (entity === ReceiptTax) return taxRepo;
      if (entity === ReceiptAuditLog) return auditRepo;
      throw new Error('unexpected repository');
    }),
  } as unknown as DataSource;

  const guard = new FiscalLockGuard(new Reflector(), dataSource);

  /** Contexto HTTP de un handler decorado con @FiscalLock(source). */
  const contextFor = (
    source: FiscalLockSource | undefined,
    request: {
      params?: Record<string, string>;
      body?: unknown;
      method?: string;
      originalUrl?: string;
    },
    merchantId = 1,
  ): ExecutionContext => {
    const handler = () => undefined;
    if (source) Reflect.defineMetadata(FISCAL_LOCK_SOURCE_KEY, source, handler);
    return {
      getHandler: () => handler,
      getClass: () => Object,
      switchToHttp: () => ({
        getRequest: () => ({
          params: request.params ?? {},
          body: request.body,
          method: request.method,
          originalUrl: request.originalUrl,
          user: { id: 9, role: 'merchant_admin', merchant: { id: merchantId } },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    receipts.clear();
    items.clear();
    taxes.clear();
    receipts.set(1, {
      id: 1,
      merchant_id: 1,
      is_active: true,
      is_locked: false,
    });
    receipts.set(2, {
      id: 2,
      merchant_id: 1,
      is_active: true,
      is_locked: true,
    });
    receipts.set(3, {
      id: 3,
      merchant_id: 1,
      is_active: false,
      is_locked: false,
    });
    receipts.set(4, {
      id: 4,
      merchant_id: 2,
      is_active: true,
      is_locked: true,
    });
    receipts.set(5, {
      id: 5,
      merchant_id: 1,
      is_active: true,
      is_locked: null as unknown as boolean,
    });
    items.set(10, { id: 10, receipt_id: 1 });
    items.set(20, { id: 20, receipt_id: 2 });
    taxes.set(30, { id: 30, receipt_id: 3 });
    taxes.set(40, { id: 40, receipt_id: 1 });
    jest.clearAllMocks();
    auditRepo.save.mockResolvedValue({ id: 1 });
  });

  it('lets undecorated handlers through without touching the database', async () => {
    await expect(
      guard.canActivate(contextFor(undefined, { params: { id: '2' } })),
    ).resolves.toBe(true);
    expect(dataSource.getRepository).not.toHaveBeenCalled();
  });

  it('allows writes on an active, unlocked receipt (is_locked false or NULL)', async () => {
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: '1' } }),
      ),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: '5' } }),
      ),
    ).resolves.toBe(true);
  });

  it('answers 403 with the exact message for a locked receipt', async () => {
    const attempt = guard.canActivate(
      contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: '2' } }),
    );
    await expect(attempt).rejects.toThrow(ForbiddenException);
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: '2' } }),
      ),
    ).rejects.toThrow(LOCK_MESSAGE);
  });

  it('treats an inactive receipt as immutable (no reactivation)', async () => {
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: '3' } }),
      ),
    ).rejects.toThrow(LOCK_MESSAGE);
  });

  it('resolves the receipt through a receipt item', async () => {
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.ITEM_PARAM, { params: { id: '20' } }),
      ),
    ).rejects.toThrow(LOCK_MESSAGE);
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.ITEM_PARAM, { params: { id: '10' } }),
      ),
    ).resolves.toBe(true);
  });

  it('resolves the receipt through a receipt tax', async () => {
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.TAX_PARAM, { params: { id: '30' } }),
      ),
    ).rejects.toThrow(LOCK_MESSAGE);
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.TAX_PARAM, { params: { id: '40' } }),
      ),
    ).resolves.toBe(true);
  });

  it('resolves the receipt from body.receiptId when creating items or taxes', async () => {
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.BODY_RECEIPT, { body: { receiptId: 2 } }),
      ),
    ).rejects.toThrow(LOCK_MESSAGE);
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.BODY_RECEIPT, { body: { receiptId: '2' } }),
      ),
    ).rejects.toThrow(LOCK_MESSAGE);
    await expect(
      guard.canActivate(
        contextFor(FiscalLockSource.BODY_RECEIPT, { body: { receiptId: 1 } }),
      ),
    ).resolves.toBe(true);
  });

  it('defers to the pipes / services for invalid ids, unknown rows and other merchants', async () => {
    for (const ctx of [
      contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: 'abc' } }),
      contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: '999' } }),
      contextFor(FiscalLockSource.ITEM_PARAM, { params: { id: '999' } }),
      contextFor(FiscalLockSource.BODY_RECEIPT, { body: {} }),
      contextFor(FiscalLockSource.BODY_RECEIPT, { body: null }),
      // Recibo bloqueado pero de otro merchant: el servicio responde su 403 / 404 de propiedad.
      contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: '4' } }),
    ]) {
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    }
  });

  describe('audit trail (Historia 6)', () => {
    it('records MODIFICATION_BLOCKED with the user, role and the blocked request', async () => {
      receipts.set(2, {
        ...receipts.get(2),
        subtotal: '100.00' as unknown as number,
        total_tax: '19.00' as unknown as number,
        total_discount: '0.00' as unknown as number,
        grand_total: '119.00' as unknown as number,
      });

      await expect(
        guard.canActivate(
          contextFor(FiscalLockSource.RECEIPT_PARAM, {
            params: { id: '2' },
            method: 'PATCH',
            originalUrl: '/api/receipts/2',
          }),
        ),
      ).rejects.toThrow(LOCK_MESSAGE);

      const totals = {
        subtotal: 100,
        total_tax: 19,
        total_discount: 0,
        grand_total: 119,
      };
      expect(auditRepo.save).toHaveBeenCalledTimes(1);
      expect(auditRepo.save).toHaveBeenCalledWith({
        receipt_id: 2,
        merchant_id: 1,
        action: ReceiptAuditAction.MODIFICATION_BLOCKED,
        user_id: 9,
        role: 'merchant_admin',
        previous_values: totals,
        new_values: totals,
        metadata: {
          method: 'PATCH',
          path: '/api/receipts/2',
          source: FiscalLockSource.RECEIPT_PARAM,
          target_id: '2',
          reason: 'LOCKED',
        },
      });
    });

    it('logs blocked item / tax writes on the parent receipt and tells inactive from locked', async () => {
      await expect(
        guard.canActivate(
          contextFor(FiscalLockSource.TAX_PARAM, {
            params: { id: '30' },
            method: 'DELETE',
            originalUrl: '/api/receipt-taxes/30',
          }),
        ),
      ).rejects.toThrow(LOCK_MESSAGE);

      expect(auditRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          receipt_id: 3,
          action: ReceiptAuditAction.MODIFICATION_BLOCKED,
          metadata: expect.objectContaining({
            source: FiscalLockSource.TAX_PARAM,
            target_id: '30',
            reason: 'INACTIVE',
          }) as unknown,
        }),
      );
    });

    it('still answers 403 when the audit write fails', async () => {
      auditRepo.save.mockRejectedValueOnce(new Error('db down'));
      const logSpy = jest
        .spyOn(
          (guard as unknown as { logger: { error: () => void } }).logger,
          'error',
        )
        .mockImplementation(() => undefined);

      await expect(
        guard.canActivate(
          contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: '2' } }),
        ),
      ).rejects.toThrow(LOCK_MESSAGE);
      expect(logSpy).toHaveBeenCalled();
    });

    it('records nothing for allowed requests or receipts of other merchants', async () => {
      await guard.canActivate(
        contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: '1' } }),
      );
      await guard.canActivate(
        contextFor(FiscalLockSource.RECEIPT_PARAM, { params: { id: '4' } }),
      );
      expect(auditRepo.save).not.toHaveBeenCalled();
    });
  });

  it('parses positive integer ids only', () => {
    expect(toPositiveInt('12')).toBe(12);
    expect(toPositiveInt(' 7 ')).toBe(7);
    expect(toPositiveInt(3)).toBe(3);
    expect(toPositiveInt('0')).toBeNull();
    expect(toPositiveInt('-1')).toBeNull();
    expect(toPositiveInt('1.5')).toBeNull();
    expect(toPositiveInt(1.5)).toBeNull();
    expect(toPositiveInt(undefined)).toBeNull();
  });

  it('@FiscalLock stores the source and registers the guard on the handler', () => {
    class Probe {
      @FiscalLock(FiscalLockSource.TAX_PARAM)
      handler() {
        return undefined;
      }
    }
    const handler = Object.getOwnPropertyDescriptor(Probe.prototype, 'handler')
      ?.value as object;
    expect(Reflect.getMetadata(FISCAL_LOCK_SOURCE_KEY, handler)).toBe(
      FiscalLockSource.TAX_PARAM,
    );
    expect(Reflect.getMetadata('__guards__', handler)).toEqual([
      FiscalLockGuard,
    ]);
  });
});
