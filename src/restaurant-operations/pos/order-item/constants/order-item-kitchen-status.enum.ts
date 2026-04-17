/** Estado de cocina a nivel de línea (varchar en BD). */
export enum OrderItemKitchenStatus {
  PENDING = 'pending',
  IN_PREPARATION = 'in_preparation',
  READY = 'ready',
  SERVED = 'served',
}
