import {
  InventoryDeductionStatus,
  InventorySkuMappingSource,
} from '../constants/inventory-deduction-status.enum';
import { SaleComponent } from './sale-stock-requirements.util';

/** Un componente de la receta con lo que pasó en inventario. */
export interface EvaluatedComponent extends SaleComponent {
  /** Movimientos OUT_FOR_SALE de la orden sobre este stock (la deducción agrega por orden). */
  movementIds: number[];
  /** Cantidad total de esos movimientos (de toda la orden, no solo de esta línea). */
  deductedQty: number;
  stockItemId: number | null;
  /** Nivel actual del stock item (el deducido o, si aún no se deduce, el de la ubicación de ventas). */
  currentQty: number | null;
  minimumQty: number | null;
  locationId: number | null;
  locationName: string | null;
  locationCode: string | null;
  /** Unidades que faltan: requerido − disponible (pendiente) o stock negativo (ya deducido). */
  shortfall: number;
}

export interface DeductionOrderState {
  id: number;
  orderNumber: string | null;
  isPaid: boolean;
  inventoryConsumedAt: Date | null;
}

export interface DeductionStatusInput {
  hasSku: boolean;
  mapping: InventorySkuMappingSource | null;
  hasRecipe: boolean;
  components: EvaluatedComponent[];
  order: DeductionOrderState | null;
  salesLocation: { id: number; name: string } | null;
}

export interface DeductionStatusResult {
  status: InventoryDeductionStatus;
  /** Si algún componente ya tiene su movimiento de salida. */
  deducted: boolean;
  /** Resaltar: stock insuficiente (pendiente) o negativo tras deducir. */
  insufficientStock: boolean;
  /** Resaltar: orden pagada sin deducción confirmada o movimiento faltante. */
  commitFailed: boolean;
  reason: string;
}

const describe = (components: EvaluatedComponent[]): string =>
  components.map((c) => c.name).join(', ');

const orderLabel = (order: DeductionOrderState): string =>
  `#${order.orderNumber ?? order.id}`;

function result(
  status: InventoryDeductionStatus,
  reason: string,
  flags: Partial<
    Pick<
      DeductionStatusResult,
      'deducted' | 'insufficientStock' | 'commitFailed'
    >
  > = {},
): DeductionStatusResult {
  return {
    status,
    deducted: flags.deducted ?? false,
    insufficientStock: flags.insufficientStock ?? false,
    commitFailed: flags.commitFailed ?? false,
    reason,
  };
}

/** Estado de deducción de una línea de recibo a partir de su receta, su orden y el kardex. */
export function resolveDeductionStatus(
  input: DeductionStatusInput,
): DeductionStatusResult {
  const { hasSku, mapping, hasRecipe, components, order, salesLocation } =
    input;

  if (!hasSku) {
    return result(
      InventoryDeductionStatus.NOT_TRACKED,
      'Receipt line has no SKU, so it cannot be matched to inventory.',
    );
  }
  if (!mapping) {
    return result(
      InventoryDeductionStatus.NOT_TRACKED,
      'SKU is not linked to any product, variant or raw material of this merchant.',
    );
  }
  if (mapping === InventorySkuMappingSource.SUPPLY) {
    return result(
      InventoryDeductionStatus.NOT_TRACKED,
      'SKU belongs to a raw material; sales only consume raw materials through product recipes.',
    );
  }
  if (!hasRecipe || components.length === 0) {
    return result(
      InventoryDeductionStatus.NOT_TRACKED,
      'Product has no recipe with stock lines, so selling it does not deduct inventory.',
    );
  }
  if (!order) {
    return result(
      InventoryDeductionStatus.FAILED,
      'The order linked to this receipt was not found for this merchant.',
      { commitFailed: true },
    );
  }

  if (order.inventoryConsumedAt) {
    const missing = components.filter((c) => c.movementIds.length === 0);
    if (missing.length > 0) {
      return result(
        InventoryDeductionStatus.FAILED,
        `Order ${orderLabel(order)} was claimed for deduction but no stock movement exists for: ${describe(missing)}.`,
        { deducted: missing.length < components.length, commitFailed: true },
      );
    }
    const negative = components.filter(
      (c) => c.currentQty != null && c.currentQty < 0,
    );
    if (negative.length > 0) {
      return result(
        InventoryDeductionStatus.INSUFFICIENT_STOCK,
        `Deducted, but stock is now negative for: ${negative
          .map((c) => `${c.name} (${c.currentQty})`)
          .join(', ')}.`,
        { deducted: true, insufficientStock: true },
      );
    }
    const movements = components.reduce(
      (sum, c) => sum + c.movementIds.length,
      0,
    );
    return result(
      InventoryDeductionStatus.DEDUCTED,
      `Stock deducted for order ${orderLabel(order)} (${movements} movement${movements === 1 ? '' : 's'}).`,
      { deducted: true },
    );
  }

  if (order.isPaid) {
    return result(
      InventoryDeductionStatus.FAILED,
      salesLocation
        ? `Order ${orderLabel(order)} is paid but its inventory deduction did not commit.`
        : `Order ${orderLabel(order)} is paid but its inventory deduction did not commit: the default sales stock location is not configured.`,
      { commitFailed: true },
    );
  }

  if (!salesLocation) {
    return result(
      InventoryDeductionStatus.PENDING,
      `Awaiting payment of order ${orderLabel(order)}. The default sales stock location is not configured, so the deduction will fail until it is set.`,
    );
  }

  const short = components.filter((c) => c.shortfall > 0);
  if (short.length > 0) {
    return result(
      InventoryDeductionStatus.INSUFFICIENT_STOCK,
      `Not enough stock at ${salesLocation.name} for: ${short
        .map(
          (c) => `${c.name} (needs ${c.requiredQty}, has ${c.currentQty ?? 0})`,
        )
        .join(', ')}.`,
      { insufficientStock: true },
    );
  }

  return result(
    InventoryDeductionStatus.PENDING,
    `Awaiting payment of order ${orderLabel(order)}; stock will be deducted from ${salesLocation.name}.`,
  );
}
