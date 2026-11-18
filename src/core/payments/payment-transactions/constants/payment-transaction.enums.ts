/** Qué operación registra la fila. Las devoluciones y anulaciones apuntan a su venta. */
export enum PaymentTransactionType {
  SALE = 'sale',
  REFUND = 'refund',
  VOID = 'void',
}

/** Cómo se tomó la tarjeta: token del cliente (fuera de alcance PCI) o terminal físico. */
export enum PaymentTransactionChannel {
  TOKEN = 'token',
  TERMINAL = 'terminal',
}

/**
 * Venta: pending → paid | failed; una venta pagada pasa a voided, o a partially_refunded
 * y refunded con las devoluciones.
 * Devolución / anulación: pending → succeeded | failed.
 */
export enum PaymentTransactionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  VOIDED = 'voided',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
  SUCCEEDED = 'succeeded',
}

/** Ventas que ya no admiten devolución ni anulación. */
export const LOCKED_SALE_STATUSES: readonly PaymentTransactionStatus[] = [
  PaymentTransactionStatus.VOIDED,
  PaymentTransactionStatus.REFUNDED,
];
