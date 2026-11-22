/**
 * Estado de la deducción de stock de una línea de recibo (ReceiptItem).
 *
 * - DEDUCTED: la orden del recibo ya consumió inventario y cada componente de la receta tiene su
 *   movimiento OUT_FOR_SALE.
 * - PENDING: la orden aún no está pagada; el stock se deducirá al cobrarla.
 * - INSUFFICIENT_STOCK: no alcanza el stock de la ubicación de ventas (pendiente) o la deducción
 *   dejó el stock en negativo (las ventas no se bloquean por falta de stock).
 * - FAILED: la orden está pagada pero la deducción no se confirmó, o falta el movimiento de algún
 *   componente (commit fallido).
 * - NOT_TRACKED: la línea no consume inventario (sin SKU, SKU desconocido o producto sin receta).
 */
export enum InventoryDeductionStatus {
  DEDUCTED = 'DEDUCTED',
  PENDING = 'PENDING',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  FAILED = 'FAILED',
  NOT_TRACKED = 'NOT_TRACKED',
}

/** Cómo se resolvió el SKU de la línea de recibo en el catálogo de inventario. */
export enum InventorySkuMappingSource {
  VARIANT = 'VARIANT',
  PRODUCT = 'PRODUCT',
  SUPPLY = 'SUPPLY',
}

/** Tipo de stock que consume un componente de la receta. */
export enum InventoryComponentKind {
  RAW_MATERIAL = 'RAW_MATERIAL',
  PRODUCT = 'PRODUCT',
}
