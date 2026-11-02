export const NavigationSurface = {
  MERCHANT_WEB: 'merchant_web',
  SAAS_WEB: 'saas_web',
  APP_KDS: 'app_kds',
  APP_WAITER: 'app_waiter',
  APP_CASHIER: 'app_cashier',
  APP_HOST: 'app_host',
} as const;

export type NavigationSurface =
  (typeof NavigationSurface)[keyof typeof NavigationSurface];

export const ALL_NAVIGATION_SURFACES: NavigationSurface[] = [
  NavigationSurface.MERCHANT_WEB,
  NavigationSurface.SAAS_WEB,
  NavigationSurface.APP_KDS,
  NavigationSurface.APP_WAITER,
  NavigationSurface.APP_CASHIER,
  NavigationSurface.APP_HOST,
];
