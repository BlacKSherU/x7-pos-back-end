import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MerchantLockScope } from 'src/common/utils/merchant-lock.util';
import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptAuditLog } from '../receipts/audit/entities/receipt-audit-log.entity';
import { ReceiptAuditAction } from '../receipts/audit/receipt-audit-action.enum';
import { ReceiptAdjustmentNote } from './entities/receipt-adjustment-note.entity';
import { AdjustmentNoteType } from './constants/adjustment-note-type.enum';
import { AdjustmentReasonCode } from './constants/adjustment-reason-code.enum';
import { ReceiptAdjustmentsService } from './receipt-adjustments.service';
import { ADJUSTMENT_REQUIRES_LOCK_MESSAGE } from './receipt-adjustments.util';

const MERCHANT_ID = 1;
const actor = { id: 7, role: 'merchant_admin' };

const lockedReceipt = {
  id: 10,
  merchant_id: MERCHANT_ID,
  invoice_number: 'INV-000010',
  currency: 'USD',
  subtotal: '100.00',
  total_tax: '19.00',
  total_discount: '0.00',
  grand_total: '119.00',
  is_active: true,
  is_locked: true,
} as unknown as Receipt;

const note = (
  overrides: Partial<ReceiptAdjustmentNote> = {},
): ReceiptAdjustmentNote =>
  ({
    id: 1,
    receipt_id: 10,
    merchant_id: MERCHANT_ID,
    note_type: AdjustmentNoteType.CREDIT_NOTE,
    note_number: 'CN-000001',
    original_invoice_number: 'INV-000010',
    adjustment_amount: '19.00',
    resulting_net_amount: '100.00',
    currency: 'USD',
    reason_code: AdjustmentReasonCode.PARTIAL_RETURN,
    processed_by_user_id: 7,
    processed_by_role: 'merchant_admin',
    created_at: new Date('2026-11-22T10:00:00Z'),
    ...overrides,
  }) as unknown as ReceiptAdjustmentNote;

describe('ReceiptAdjustmentsService (Historia 7)', () => {
  let receipt: Receipt | null;
  let existingNotes: ReceiptAdjustmentNote[];
  let lastSequence: string | null;

  const qb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(() => Promise.resolve({ last_sequence: lastSequence })),
  };
  const txReceiptRepo = { findOne: jest.fn(() => Promise.resolve(receipt)) };
  const txNoteRepo = {
    find: jest.fn(() => Promise.resolve(existingNotes)),
    create: jest.fn((data: object) => data),
    save: jest.fn((data: object) =>
      Promise.resolve({ id: 99, created_at: new Date(), ...data }),
    ),
    createQueryBuilder: jest.fn(() => qb),
  };
  const txAuditRepo = { save: jest.fn((row: object) => Promise.resolve(row)) };
  const manager = {
    query: jest.fn(),
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Receipt) return txReceiptRepo;
      if (entity === ReceiptAdjustmentNote) return txNoteRepo;
      if (entity === ReceiptAuditLog) return txAuditRepo;
      throw new Error('unexpected repository');
    }),
  };
  const dataSource = {
    transaction: jest.fn((work: (m: typeof manager) => unknown) =>
      Promise.resolve(work(manager)),
    ),
  };
  const receiptRepo = { findOne: jest.fn(() => Promise.resolve(receipt)) };
  const noteRepo = { find: jest.fn(() => Promise.resolve(existingNotes)) };

  const service = new ReceiptAdjustmentsService(
    dataSource as unknown as DataSource,
    receiptRepo as unknown as Repository<Receipt>,
    noteRepo as unknown as Repository<ReceiptAdjustmentNote>,
  );

  const dto = (
    noteType: AdjustmentNoteType,
    adjustmentAmount: number,
    reasonCode = AdjustmentReasonCode.PARTIAL_RETURN,
  ) => ({ noteType, adjustmentAmount, reasonCode });

  beforeEach(() => {
    jest.clearAllMocks();
    receipt = { ...lockedReceipt } as Receipt;
    existingNotes = [];
    lastSequence = null;
  });

  describe('issue', () => {
    it('creates a credit note linked to the locked receipt with the user, role, delta and resulting net', async () => {
      const result = await service.issue(
        10,
        dto(AdjustmentNoteType.CREDIT_NOTE, 19),
        actor,
        MERCHANT_ID,
      );

      expect(manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock($1, $2)',
        [MerchantLockScope.RECEIPT_ADJUSTMENT_NOTES, MERCHANT_ID],
      );
      expect(txNoteRepo.save).toHaveBeenCalledWith({
        receipt_id: 10,
        merchant_id: MERCHANT_ID,
        note_type: AdjustmentNoteType.CREDIT_NOTE,
        note_number: 'CN-000001',
        original_invoice_number: 'INV-000010',
        adjustment_amount: 19,
        resulting_net_amount: 100,
        currency: 'USD',
        reason_code: AdjustmentReasonCode.PARTIAL_RETURN,
        processed_by_user_id: 7,
        processed_by_role: 'merchant_admin',
      });
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Adjustment note issued successfully');
      expect(result.data.note).toMatchObject({
        id: 99,
        note_number: 'CN-000001',
        adjustment_amount: 19,
        signed_amount: -19,
        resulting_net_amount: 100,
      });
      expect(result.data.summary).toEqual({
        receipt_id: 10,
        invoice_number: 'INV-000010',
        currency: 'USD',
        is_locked: true,
        grand_total: 119,
        credited_total: 19,
        debited_total: 0,
        net_total: 100,
        available_credit: 100,
        notes_count: 1,
      });
    });

    it('never modifies the original receipt', async () => {
      await service.issue(
        10,
        dto(AdjustmentNoteType.DEBIT_NOTE, 5),
        actor,
        MERCHANT_ID,
      );
      // El repositorio de recibos de la transacción solo expone findOne: cualquier
      // update / save del recibo fallaría. Solo se escriben la nota y el evento de auditoría.
      expect(txReceiptRepo.findOne).toHaveBeenCalledTimes(1);
      expect(receipt).toEqual(lockedReceipt);
      expect(txNoteRepo.save).toHaveBeenCalledTimes(1);
      expect(txAuditRepo.save).toHaveBeenCalledTimes(1);
    });

    it('records ADJUSTMENT_ISSUED in the activity log inside the same transaction', async () => {
      existingNotes = [note()];
      lastSequence = '4';

      await service.issue(
        10,
        dto(
          AdjustmentNoteType.DEBIT_NOTE,
          2.5,
          AdjustmentReasonCode.MISSED_CHARGE,
        ),
        actor,
        MERCHANT_ID,
      );

      const totals = {
        subtotal: 100,
        total_tax: 19,
        total_discount: 0,
        grand_total: 119,
      };
      expect(txAuditRepo.save).toHaveBeenCalledWith({
        receipt_id: 10,
        merchant_id: MERCHANT_ID,
        action: ReceiptAuditAction.ADJUSTMENT_ISSUED,
        user_id: 7,
        role: 'merchant_admin',
        previous_values: totals,
        new_values: totals,
        metadata: {
          note_id: 99,
          note_type: AdjustmentNoteType.DEBIT_NOTE,
          note_number: 'DN-000005',
          original_invoice_number: 'INV-000010',
          adjustment_amount: 2.5,
          reason_code: AdjustmentReasonCode.MISSED_CHARGE,
          net_total_before: 100,
          net_total_after: 102.5,
        },
      });
    });

    it('numbers notes per merchant and type (MAX + 1)', async () => {
      lastSequence = '41';
      const result = await service.issue(
        10,
        dto(AdjustmentNoteType.DEBIT_NOTE, 1),
        actor,
        MERCHANT_ID,
      );
      expect(result.data.note.note_number).toBe('DN-000042');
      expect(qb.where).toHaveBeenCalledWith('n.merchant_id = :merchantId', {
        merchantId: MERCHANT_ID,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('n.note_number ~ :pattern', {
        pattern: '^DN-[0-9]{1,15}$',
      });
    });

    it('only accepts fiscally locked, active receipts', async () => {
      for (const state of [
        { is_locked: false },
        { is_locked: null },
        { is_locked: true, is_active: false },
      ]) {
        receipt = { ...lockedReceipt, ...state } as unknown as Receipt;
        await expect(
          service.issue(
            10,
            dto(AdjustmentNoteType.CREDIT_NOTE, 1),
            actor,
            MERCHANT_ID,
          ),
        ).rejects.toThrow(
          new BadRequestException(ADJUSTMENT_REQUIRES_LOCK_MESSAGE),
        );
      }
      expect(txNoteRepo.save).not.toHaveBeenCalled();
      expect(txAuditRepo.save).not.toHaveBeenCalled();
    });

    it('rejects amounts above the grand_total and credit notes above the available credit', async () => {
      await expect(
        service.issue(
          10,
          dto(AdjustmentNoteType.DEBIT_NOTE, 119.01),
          actor,
          MERCHANT_ID,
        ),
      ).rejects.toThrow('cannot exceed the receipt grand_total (119.00)');

      existingNotes = [note({ adjustment_amount: 100 })];
      await expect(
        service.issue(
          10,
          dto(AdjustmentNoteType.CREDIT_NOTE, 19.01),
          actor,
          MERCHANT_ID,
        ),
      ).rejects.toThrow('100.00 already credited, 19.00 available');
      expect(txNoteRepo.save).not.toHaveBeenCalled();
    });

    it('validates ownership, merchant and user', async () => {
      receipt = null;
      await expect(
        service.issue(10, dto(AdjustmentNoteType.CREDIT_NOTE, 1), actor, 1),
      ).rejects.toThrow(NotFoundException);
      receipt = { ...lockedReceipt, merchant_id: 2 } as Receipt;
      await expect(
        service.issue(10, dto(AdjustmentNoteType.CREDIT_NOTE, 1), actor, 1),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.issue(10, dto(AdjustmentNoteType.CREDIT_NOTE, 1), actor, 0),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.issue(0, dto(AdjustmentNoteType.CREDIT_NOTE, 1), actor, 1),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.issue(
          10,
          dto(AdjustmentNoteType.CREDIT_NOTE, 1),
          null as unknown as typeof actor,
          1,
        ),
      ).rejects.toThrow('An authenticated user is required');
    });

    it('maps a concurrent unique violation on note_number to 409', async () => {
      txNoteRepo.save.mockRejectedValueOnce(
        Object.assign(new Error('duplicate'), { code: '23505' }),
      );
      await expect(
        service.issue(
          10,
          dto(AdjustmentNoteType.CREDIT_NOTE, 1),
          actor,
          MERCHANT_ID,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findForReceipt', () => {
    it('lists the notes in chronological order with the adjusted net', async () => {
      existingNotes = [
        note(),
        note({
          id: 2,
          note_type: AdjustmentNoteType.DEBIT_NOTE,
          note_number: 'DN-000001',
          adjustment_amount: '4.50' as unknown as number,
          resulting_net_amount: '104.50' as unknown as number,
        }),
      ];

      const result = await service.findForReceipt(10, MERCHANT_ID);

      expect(noteRepo.find).toHaveBeenCalledWith({
        where: { receipt_id: 10 },
        order: { created_at: 'ASC', id: 'ASC' },
      });
      expect(
        result.data.notes.map((n) => [
          n.note_number,
          n.signed_amount,
          n.resulting_net_amount,
        ]),
      ).toEqual([
        ['CN-000001', -19, 100],
        ['DN-000001', 4.5, 104.5],
      ]);
      expect(result.data.summary).toMatchObject({
        grand_total: 119,
        credited_total: 19,
        debited_total: 4.5,
        net_total: 104.5,
        available_credit: 100,
        notes_count: 2,
      });
    });

    it('works for receipts in any state and validates ownership', async () => {
      receipt = { ...lockedReceipt, is_locked: false } as Receipt;
      await expect(
        service.findForReceipt(10, MERCHANT_ID),
      ).resolves.toMatchObject({
        data: { notes: [], summary: { net_total: 119, is_locked: false } },
      });
      receipt = { ...lockedReceipt, merchant_id: 2 } as Receipt;
      await expect(service.findForReceipt(10, MERCHANT_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
