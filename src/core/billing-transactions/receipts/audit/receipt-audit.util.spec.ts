import { Receipt } from '../entities/receipt.entity';
import { ReceiptType } from '../constants/receipt-type.enum';
import { ReceiptAuditAction } from './receipt-audit-action.enum';
import {
  buildReceiptAuditEntry,
  buildSettlementAuditEntries,
  receiptActorOf,
  snapshotTotals,
} from './receipt-audit.util';

describe('receipt-audit.util (Historia 6)', () => {
  it('snapshotTotals reads decimal strings and rounds to the cent', () => {
    expect(
      snapshotTotals({
        subtotal: '100.10' as unknown as number,
        total_tax: 19.019,
        total_discount: null as unknown as number,
        grand_total: '119.12' as unknown as number,
      }),
    ).toEqual({
      subtotal: 100.1,
      total_tax: 19.02,
      total_discount: 0,
      grand_total: 119.12,
    });
  });

  it('buildReceiptAuditEntry maps the receipt, actor, totals and metadata', () => {
    expect(
      buildReceiptAuditEntry({
        receipt: { id: 5, merchant_id: 2 },
        action: ReceiptAuditAction.UPDATED,
        actor: { id: 7, role: 'merchant_admin' },
        previous: {
          subtotal: 10,
          total_tax: 1,
          total_discount: 0,
          grand_total: 11,
        },
        next: {
          subtotal: 20,
          total_tax: 2,
          total_discount: 0,
          grand_total: 22,
        },
        metadata: { changed_fields: ['currency'] },
      }),
    ).toEqual({
      receipt_id: 5,
      merchant_id: 2,
      action: ReceiptAuditAction.UPDATED,
      user_id: 7,
      role: 'merchant_admin',
      previous_values: {
        subtotal: 10,
        total_tax: 1,
        total_discount: 0,
        grand_total: 11,
      },
      new_values: {
        subtotal: 20,
        total_tax: 2,
        total_discount: 0,
        grand_total: 22,
      },
      metadata: { changed_fields: ['currency'] },
    });
  });

  it('buildReceiptAuditEntry stores nulls when there is no actor, totals or metadata', () => {
    expect(
      buildReceiptAuditEntry({
        receipt: { id: 5, merchant_id: 2 },
        action: ReceiptAuditAction.CREATED,
      }),
    ).toEqual({
      receipt_id: 5,
      merchant_id: 2,
      action: ReceiptAuditAction.CREATED,
      user_id: null,
      role: null,
      previous_values: null,
      new_values: null,
      metadata: null,
    });
  });

  it('receiptActorOf takes id and role from req.user, or null without a user', () => {
    expect(receiptActorOf({ id: 3, role: 'merchant_user' })).toEqual({
      id: 3,
      role: 'merchant_user',
    });
    expect(receiptActorOf(undefined)).toBeNull();
    expect(receiptActorOf({ id: 0, role: 'x' })).toBeNull();
  });

  it('buildSettlementAuditEntries records CREATED then LOCKED for a receipt born locked', () => {
    const receipt = {
      id: 9,
      merchant_id: 1,
      order_id: 44,
      invoice_number: 'INV-000009',
      type: ReceiptType.INVOICE,
      currency: 'USD',
      subtotal: '50.00',
      total_tax: '5.00',
      total_discount: '0.00',
      grand_total: '55.00',
    } as unknown as Receipt;
    const totals = {
      subtotal: 50,
      total_tax: 5,
      total_discount: 0,
      grand_total: 55,
    };

    const [created, locked] = buildSettlementAuditEntries(receipt, {
      id: 7,
      role: 'merchant_user',
    });

    expect(created).toMatchObject({
      receipt_id: 9,
      merchant_id: 1,
      action: ReceiptAuditAction.CREATED,
      user_id: 7,
      role: 'merchant_user',
      previous_values: null,
      new_values: totals,
      metadata: expect.objectContaining({
        source: 'order_settlement',
        order_id: 44,
        invoice_number: 'INV-000009',
      }) as unknown,
    });
    expect(locked).toMatchObject({
      action: ReceiptAuditAction.LOCKED,
      user_id: 7,
      role: 'merchant_user',
      previous_values: totals,
      new_values: totals,
    });
  });
});
