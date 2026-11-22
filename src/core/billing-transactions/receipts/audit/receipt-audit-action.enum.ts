/** Eventos del ciclo de vida de un recibo registrados en receipt_audit_logs (Historia 6). */
export enum ReceiptAuditAction {
  /** Alta del recibo (o backfill de los recibos existentes). */
  CREATED = 'CREATED',
  /** Edición de la cabecera (tipo, moneda, número de factura, fiscal_data…). */
  UPDATED = 'UPDATED',
  /** Bloqueo fiscal (Historia 11). */
  LOCKED = 'LOCKED',
  /** Alta, edición, activación / desactivación o baja de un impuesto del recibo. */
  TAX_MODIFIED = 'TAX_MODIFIED',
  /** Alta, edición, restauración o baja de una línea del recibo. */
  ITEM_MODIFIED = 'ITEM_MODIFIED',
  /** Baja lógica del recibo (is_active = false). */
  DEACTIVATED = 'DEACTIVATED',
  /** Intento de modificación rechazado por el bloqueo fiscal (FiscalLockGuard, 403). */
  MODIFICATION_BLOCKED = 'MODIFICATION_BLOCKED',
  /** Emisión de una nota de crédito / débito sobre el recibo (Historia 7). */
  ADJUSTMENT_ISSUED = 'ADJUSTMENT_ISSUED',
}
