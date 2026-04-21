/** Estados de preparación en cocina (KDS). El paso `served` vive solo en POS (`OrderItem`). */
export enum KitchenOrderItemPreparationStatus {
  PENDING = 'pending',
  IN_PREPARATION = 'in_preparation',
  READY = 'ready',
}

/** Orden lineal para transiciones `next` / `previous`. */
export const KITCHEN_ORDER_ITEM_PREPARATION_STATUS_ORDER = [
  KitchenOrderItemPreparationStatus.PENDING,
  KitchenOrderItemPreparationStatus.IN_PREPARATION,
  KitchenOrderItemPreparationStatus.READY,
] as const;

export type KitchenOrderItemPreparationStatusOrdered =
  (typeof KITCHEN_ORDER_ITEM_PREPARATION_STATUS_ORDER)[number];

export function getPreparationStatusOrderIndex(
  status: KitchenOrderItemPreparationStatus,
): number {
  const i = KITCHEN_ORDER_ITEM_PREPARATION_STATUS_ORDER.indexOf(
    status as KitchenOrderItemPreparationStatusOrdered,
  );
  if (i === -1) {
    throw new Error(`Unknown preparation status: ${String(status)}`);
  }
  return i;
}

/** Siguiente estado en la cadena, o `null` si ya está en el final. */
export function getNextPreparationStatus(
  current: KitchenOrderItemPreparationStatus,
): KitchenOrderItemPreparationStatus | null {
  const i = getPreparationStatusOrderIndex(current);
  if (i >= KITCHEN_ORDER_ITEM_PREPARATION_STATUS_ORDER.length - 1) {
    return null;
  }
  return KITCHEN_ORDER_ITEM_PREPARATION_STATUS_ORDER[i + 1];
}

/** Estado anterior en la cadena, o `null` si ya está en el inicio. */
export function getPreviousPreparationStatus(
  current: KitchenOrderItemPreparationStatus,
): KitchenOrderItemPreparationStatus | null {
  const i = getPreparationStatusOrderIndex(current);
  if (i <= 0) {
    return null;
  }
  return KITCHEN_ORDER_ITEM_PREPARATION_STATUS_ORDER[i - 1];
}
