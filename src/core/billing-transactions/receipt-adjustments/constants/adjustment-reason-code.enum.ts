/** Motivo de una nota de crédito / débito (Historia 7). */
export enum AdjustmentReasonCode {
  /** Devolución total del importe cobrado. */
  REFUND = 'REFUND',
  /** Devolución parcial de productos. */
  PARTIAL_RETURN = 'PARTIAL_RETURN',
  /** Corrección de precio (al alza o a la baja). */
  PRICE_CORRECTION = 'PRICE_CORRECTION',
  /** Error de facturación (importe, impuesto o cliente). */
  BILLING_ERROR = 'BILLING_ERROR',
  /** Descuento concedido después de emitir el recibo. */
  DISCOUNT_ADJUSTMENT = 'DISCOUNT_ADJUSTMENT',
  /** Cargo omitido en el recibo original. */
  MISSED_CHARGE = 'MISSED_CHARGE',
  OTHER = 'OTHER',
}
