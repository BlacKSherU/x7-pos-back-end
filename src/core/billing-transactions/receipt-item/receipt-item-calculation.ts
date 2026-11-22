import { BadRequestException } from '@nestjs/common';

/**
 * Cálculo de importes de una línea de recibo (ReceiptItem).
 *
 *   subtotal = round2(quantity × unit_price)
 *   total    = subtotal − discount_amount
 *
 * Toda la aritmética se hace en centavos enteros para no arrastrar errores de coma
 * flotante (0.1 × 3 = 0.30000000000000004). Los límites replican las columnas:
 * quantity decimal(10,2) y unit_price / subtotal / discount_amount / total decimal(12,2).
 */

/** Máximo de decimal(10,2): 99,999,999.99 */
export const RECEIPT_ITEM_MAX_QUANTITY = 99_999_999.99;
/** Máximo de decimal(12,2): 9,999,999,999.99 */
export const RECEIPT_ITEM_MAX_AMOUNT = 9_999_999_999.99;

export interface ReceiptItemAmountsInput {
  quantity: number;
  unitPrice: number;
  discountAmount?: number | null;
}

export interface ReceiptItemAmounts {
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  total: number;
}

/** Convierte a centavos enteros; null si el valor tiene más de 2 decimales. */
function toCents(value: number): number | null {
  const scaled = value * 100;
  const cents = Math.round(scaled);
  // Tolerancia para representaciones binarias como 1.1 * 100 = 110.00000000000001.
  if (Math.abs(scaled - cents) > 1e-6) return null;
  return cents;
}

function assertFinite(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadRequestException(`${field} must be a valid number`);
  }
}

export function computeReceiptItemAmounts(
  input: ReceiptItemAmountsInput,
): ReceiptItemAmounts {
  const discountInput = input.discountAmount ?? 0;
  assertFinite(input.quantity, 'quantity');
  assertFinite(input.unitPrice, 'unitPrice');
  assertFinite(discountInput, 'discountAmount');

  if (input.quantity <= 0) {
    throw new BadRequestException('Quantity must be greater than 0');
  }
  if (input.quantity > RECEIPT_ITEM_MAX_QUANTITY) {
    throw new BadRequestException(
      `Quantity cannot exceed ${RECEIPT_ITEM_MAX_QUANTITY}`,
    );
  }
  if (input.unitPrice < 0) {
    throw new BadRequestException('Unit price cannot be negative');
  }
  if (input.unitPrice > RECEIPT_ITEM_MAX_AMOUNT) {
    throw new BadRequestException(
      `Unit price cannot exceed ${RECEIPT_ITEM_MAX_AMOUNT}`,
    );
  }
  if (discountInput < 0) {
    throw new BadRequestException('Discount amount cannot be negative');
  }

  const quantityCents = toCents(input.quantity);
  if (quantityCents === null) {
    throw new BadRequestException('Quantity supports at most 2 decimal places');
  }
  const unitPriceCents = toCents(input.unitPrice);
  if (unitPriceCents === null) {
    throw new BadRequestException(
      'Unit price supports at most 2 decimal places',
    );
  }
  const discountCents = toCents(discountInput);
  if (discountCents === null) {
    throw new BadRequestException(
      'Discount amount supports at most 2 decimal places',
    );
  }

  // quantityCents × unitPriceCents está en diezmilésimas; /100 lo lleva a centavos.
  // Ambos factores son enteros acotados por las columnas, así que el producto es exacto
  // en double, y Math.round redondea medio hacia arriba (2.5 → 3) en valores ≥ 0.
  const subtotalCents = Math.round((quantityCents * unitPriceCents) / 100);
  if (subtotalCents > Math.round(RECEIPT_ITEM_MAX_AMOUNT * 100)) {
    throw new BadRequestException(
      `Subtotal (quantity × unit price) cannot exceed ${RECEIPT_ITEM_MAX_AMOUNT}`,
    );
  }
  if (discountCents > subtotalCents) {
    throw new BadRequestException(
      'Discount amount cannot be greater than the subtotal',
    );
  }

  const totalCents = subtotalCents - discountCents;

  return {
    quantity: quantityCents / 100,
    unit_price: unitPriceCents / 100,
    subtotal: subtotalCents / 100,
    discount_amount: discountCents / 100,
    total: totalCents / 100,
  };
}
