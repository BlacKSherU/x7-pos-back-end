import { ForbiddenException } from '@nestjs/common';
import { Receipt } from '../entities/receipt.entity';

/** Mensaje EXACTO del 403 de bloqueo fiscal (Historia 11). */
export const FISCAL_LOCK_MESSAGE =
  'Receipt is fiscally locked and cannot be modified.';

/**
 * Regla de inmutabilidad (Historia 11): un recibo es inmutable si está bloqueado
 * fiscalmente (`is_locked === true`) o dado de baja (`is_active === false`). Ni él, ni sus
 * líneas (ReceiptItem) ni sus impuestos (ReceiptTax) admiten PUT / PATCH / DELETE ni altas;
 * las correcciones van por notas de crédito / débito (Historia 7).
 *
 * Consecuencia: un recibo dado de baja ya no se puede reactivar (la reactivación de la
 * Historia 18 queda sustituida por esta regla).
 */
export function isReceiptFiscallyLocked(
  receipt: Pick<Receipt, 'is_locked' | 'is_active'>,
): boolean {
  return receipt.is_locked === true || receipt.is_active === false;
}

/** 403 con FISCAL_LOCK_MESSAGE si el recibo es inmutable. */
export function assertReceiptMutable(
  receipt: Pick<Receipt, 'is_locked' | 'is_active'>,
): void {
  if (isReceiptFiscallyLocked(receipt)) {
    throw new ForbiddenException(FISCAL_LOCK_MESSAGE);
  }
}
