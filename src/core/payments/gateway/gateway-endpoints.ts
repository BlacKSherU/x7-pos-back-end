// src/core/payments/gateway/gateway-endpoints.ts
//
// URLs de cada proveedor. Por defecto, las reales. PAYMENT_GATEWAY_SANDBOX_URL las manda
// todas a un servidor local que imita a Stripe y CardPointe (test/fake-payment-gateway),
// para los e2e sin credenciales ni red; validateEnv lo prohíbe en producción.

export interface GatewayEndpoints {
  /** Base de la API REST de Stripe (sin barra final) */
  stripeApi: string;
  /** Script Stripe.js que carga el navegador para tokenizar la tarjeta */
  stripeJs: string;
  /** Base REST del CardPointe Gateway de un `site` (fts-uat, fts...) */
  cardpointeGateway(site: string): string;
  /** iFrame tokenizer de CardSecure del `site` */
  cardSecureTokenizer(site: string): string;
  /** Base de la Bolt Terminal API de un `boltSite` */
  bolt(boltSite: string): string;
}

export const SANDBOX_URL_ENV = 'PAYMENT_GATEWAY_SANDBOX_URL';

export function gatewayEndpoints(
  sandboxUrl: string | undefined = process.env[SANDBOX_URL_ENV],
): GatewayEndpoints {
  const sandbox =
    process.env.NODE_ENV !== 'production' && sandboxUrl?.trim()
      ? sandboxUrl.trim().replace(/\/+$/, '')
      : null;

  if (sandbox) {
    return {
      stripeApi: `${sandbox}/stripe/v1`,
      stripeJs: `${sandbox}/stripe-js/v3`,
      cardpointeGateway: (site) =>
        `${sandbox}/cardpointe/${site}/cardconnect/rest`,
      cardSecureTokenizer: (site) =>
        `${sandbox}/cardpointe/${site}/itoke/ajax-tokenizer.html`,
      bolt: (boltSite) => `${sandbox}/bolt/${boltSite}/api`,
    };
  }
  return {
    stripeApi: 'https://api.stripe.com/v1',
    stripeJs: 'https://js.stripe.com/v3/',
    cardpointeGateway: (site) =>
      `https://${site}.cardconnect.com/cardconnect/rest`,
    cardSecureTokenizer: (site) =>
      `https://${site}.cardconnect.com/itoke/ajax-tokenizer.html`,
    bolt: (boltSite) => `https://${boltSite}.cardpointe.net/api`,
  };
}
