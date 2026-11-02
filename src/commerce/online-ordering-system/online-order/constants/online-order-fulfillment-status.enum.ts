/** Ciclo de fulfillment del pedido online (proyección + negocio). */
export enum OnlineOrderFulfillmentStatus {
  RECEIVED = 'received',
  ACCEPTED = 'accepted',
  IN_PREPARATION = 'in_preparation',
  IN_KITCHEN = 'in_kitchen',
  READY = 'ready',
  READY_FOR_PICKUP = 'ready_for_pickup',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
