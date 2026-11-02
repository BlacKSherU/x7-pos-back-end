export const DeviceType = {
  POS: 'pos',
  KDS: 'kds',
  KIOSK: 'kiosk',
  PICKUP: 'pickup',
  HOST: 'host',
} as const;

export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];
