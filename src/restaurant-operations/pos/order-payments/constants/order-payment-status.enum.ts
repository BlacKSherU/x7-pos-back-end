/**
 * Estado de un pago de orden.
 * - completed: cobrado (o, en una fila is_refund, devuelto)
 * - partially_refunded / refunded: el cobro tuvo devoluciones parciales / totales; las
 *   devoluciones son filas is_refund aparte, que restan del pagado
 * - voided: anulado en el gateway antes del cierre de lote; ya no cuenta como pagado
 */
export enum OrderPaymentStatus {
  COMPLETED = 'completed',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
  VOIDED = 'voided',
}
