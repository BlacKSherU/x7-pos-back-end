/**
 * Resultado de la validación de stock previa a facturar (POST /billing/inventory-sync/validate-stock).
 *
 * - AVAILABLE: hay stock para todos los componentes y queda por encima del mínimo.
 * - LOW_STOCK_AFTER_SALE: alcanza, pero tras la venta el stock queda en cero o bajo el mínimo.
 * - INSUFFICIENT_STOCK: algún componente no tiene stock suficiente en la ubicación.
 * - NOT_TRACKED: la línea no consume inventario (sin SKU, SKU desconocido, materia prima vendida
 *   directamente o producto sin receta).
 * - ALREADY_DEDUCTED: la orden del recibo ya consumió inventario; no hay nada que validar.
 * - LOCATION_NOT_CONFIGURED: el merchant no tiene ubicación de ventas y no se indicó ninguna.
 */
export enum StockAvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  LOW_STOCK_AFTER_SALE = 'LOW_STOCK_AFTER_SALE',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  NOT_TRACKED = 'NOT_TRACKED',
  ALREADY_DEDUCTED = 'ALREADY_DEDUCTED',
  LOCATION_NOT_CONFIGURED = 'LOCATION_NOT_CONFIGURED',
}

/** Nivel de stock de un componente: mismas reglas que StockLevelMonitorService. */
export enum StockLevel {
  OK = 'OK',
  LOW = 'LOW',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}
