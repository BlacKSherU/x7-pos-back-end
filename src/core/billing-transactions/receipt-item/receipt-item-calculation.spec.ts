import { BadRequestException } from '@nestjs/common';
import {
  computeReceiptItemAmounts,
  RECEIPT_ITEM_MAX_AMOUNT,
  RECEIPT_ITEM_MAX_QUANTITY,
} from './receipt-item-calculation';

describe('computeReceiptItemAmounts', () => {
  it('subtotal = quantity × unit_price and total = subtotal − discount', () => {
    expect(
      computeReceiptItemAmounts({
        quantity: 2,
        unitPrice: 12.5,
        discountAmount: 2.5,
      }),
    ).toEqual({
      quantity: 2,
      unit_price: 12.5,
      subtotal: 25,
      discount_amount: 2.5,
      total: 22.5,
    });
  });

  it('rounds the subtotal to 2 decimal places (half up)', () => {
    // 1.25 × 3.33 = 4.1625 → 4.16
    expect(
      computeReceiptItemAmounts({ quantity: 1.25, unitPrice: 3.33 }).subtotal,
    ).toBe(4.16);
    // 0.5 × 0.05 = 0.025 → 0.03 (half up)
    expect(
      computeReceiptItemAmounts({ quantity: 0.5, unitPrice: 0.05 }).subtotal,
    ).toBe(0.03);
  });

  it('avoids floating point drift (0.1 × 3 is exactly 0.30)', () => {
    const result = computeReceiptItemAmounts({
      quantity: 3,
      unitPrice: 0.1,
      discountAmount: 0.1,
    });
    expect(result.subtotal).toBe(0.3);
    expect(result.total).toBe(0.2);
  });

  it('defaults the discount to 0 when not provided', () => {
    const result = computeReceiptItemAmounts({ quantity: 4, unitPrice: 2.25 });
    expect(result.discount_amount).toBe(0);
    expect(result.total).toBe(9);
  });

  it('accepts a discount equal to the subtotal (total 0.00)', () => {
    expect(
      computeReceiptItemAmounts({
        quantity: 1,
        unitPrice: 5,
        discountAmount: 5,
      }).total,
    ).toBe(0);
  });

  it.each([
    ['discount greater than subtotal', { quantity: 1, unitPrice: 5, discountAmount: 5.01 }],
    ['negative discount', { quantity: 1, unitPrice: 5, discountAmount: -1 }],
    ['zero quantity', { quantity: 0, unitPrice: 5 }],
    ['negative quantity', { quantity: -2, unitPrice: 5 }],
    ['negative unit price', { quantity: 1, unitPrice: -0.01 }],
    ['quantity with 3 decimals', { quantity: 1.255, unitPrice: 5 }],
    ['unit price with 3 decimals', { quantity: 1, unitPrice: 5.125 }],
    ['discount with 3 decimals', { quantity: 1, unitPrice: 5, discountAmount: 0.005 }],
    ['quantity over decimal(10,2)', { quantity: RECEIPT_ITEM_MAX_QUANTITY + 1, unitPrice: 1 }],
    ['unit price over decimal(12,2)', { quantity: 1, unitPrice: RECEIPT_ITEM_MAX_AMOUNT + 1 }],
    ['subtotal over decimal(12,2)', { quantity: 1000, unitPrice: 99_999_999 }],
    ['NaN quantity', { quantity: Number.NaN, unitPrice: 1 }],
  ])('rejects %s', (_label, input) => {
    expect(() => computeReceiptItemAmounts(input)).toThrow(BadRequestException);
  });

  it('tolerates binary representation noise on 2-decimal inputs', () => {
    // 1.1 * 100 = 110.00000000000001 in IEEE-754: still 2 decimals.
    expect(
      computeReceiptItemAmounts({ quantity: 1.1, unitPrice: 1.1 }).subtotal,
    ).toBe(1.21);
  });
});
