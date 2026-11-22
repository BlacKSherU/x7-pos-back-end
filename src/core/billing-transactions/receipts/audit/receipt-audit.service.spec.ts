import { ReceiptAuditService } from './receipt-audit.service';
import { ReceiptAuditAction } from './receipt-audit-action.enum';
import { ReceiptAuditLog } from './entities/receipt-audit-log.entity';
import { Repository } from 'typeorm';
import { User } from 'src/platform-saas/users/entities/user.entity';

describe('ReceiptAuditService (Historia 6)', () => {
  const auditRepo = { save: jest.fn(), find: jest.fn() };
  const userRepo = { find: jest.fn() };
  const service = new ReceiptAuditService(
    auditRepo as unknown as Repository<ReceiptAuditLog>,
    userRepo as unknown as Repository<User>,
  );

  beforeEach(() => jest.resetAllMocks());

  it('record() saves the built entry', async () => {
    auditRepo.save.mockImplementation((row: object) =>
      Promise.resolve({ id: 1, ...row }),
    );

    const saved = await service.record({
      receipt: { id: 5, merchant_id: 2 },
      action: ReceiptAuditAction.LOCKED,
      actor: { id: 7, role: 'merchant_admin' },
    });

    expect(auditRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        receipt_id: 5,
        merchant_id: 2,
        action: ReceiptAuditAction.LOCKED,
        user_id: 7,
        role: 'merchant_admin',
      }),
    );
    expect(saved?.id).toBe(1);
  });

  it('record() never fails the operation it audits: errors are logged and null is returned', async () => {
    auditRepo.save.mockRejectedValue(new Error('db down'));
    const logSpy = jest
      .spyOn(
        (service as unknown as { logger: { error: () => void } }).logger,
        'error',
      )
      .mockImplementation(() => undefined);

    await expect(
      service.record({
        receipt: { id: 5, merchant_id: 2 },
        action: ReceiptAuditAction.UPDATED,
      }),
    ).resolves.toBeNull();
    expect(logSpy).toHaveBeenCalled();
  });

  it('findForReceipt() reads in exact chronological order (created_at, id) and resolves user names', async () => {
    const at = new Date('2026-11-22T10:00:00.123Z');
    auditRepo.find.mockResolvedValue([
      {
        id: 1,
        receipt_id: 5,
        action: ReceiptAuditAction.CREATED,
        user_id: 7,
        role: 'merchant_admin',
        previous_values: null,
        new_values: {
          subtotal: 0,
          total_tax: 0,
          total_discount: 0,
          grand_total: 0,
        },
        metadata: { backfill: true },
        created_at: at,
      },
      {
        id: 2,
        receipt_id: 5,
        action: ReceiptAuditAction.MODIFICATION_BLOCKED,
        user_id: 8,
        role: 'merchant_user',
        previous_values: null,
        new_values: null,
        metadata: null,
        created_at: at,
      },
      {
        id: 3,
        receipt_id: 5,
        action: ReceiptAuditAction.UPDATED,
        user_id: null,
        role: null,
        previous_values: null,
        new_values: null,
        metadata: null,
        created_at: at,
      },
    ]);
    userRepo.find.mockResolvedValue([
      { id: 7, username: 'ana', email: 'ana@x7.test' },
      { id: 8, username: null, email: 'luis@x7.test' },
    ]);

    const events = await service.findForReceipt(5);

    expect(auditRepo.find).toHaveBeenCalledWith({
      where: { receipt_id: 5 },
      order: { created_at: 'ASC', id: 'ASC' },
    });
    expect(events.map((e) => [e.id, e.user_id, e.user_name, e.role])).toEqual([
      [1, 7, 'ana', 'merchant_admin'],
      [2, 8, 'luis@x7.test', 'merchant_user'],
      [3, null, null, null],
    ]);
    expect(events[0].created_at).toBe(at);
    expect(events[0].new_values).toEqual({
      subtotal: 0,
      total_tax: 0,
      total_discount: 0,
      grand_total: 0,
    });
  });

  it('findForReceipt() skips the user lookup when no event has a user', async () => {
    auditRepo.find.mockResolvedValue([]);
    await expect(service.findForReceipt(5)).resolves.toEqual([]);
    expect(userRepo.find).not.toHaveBeenCalled();
  });
});
