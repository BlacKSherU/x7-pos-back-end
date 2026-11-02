// src/core/payments/constants/provider-credentials.ts
//
// Campos de credenciales que acepta cada proveedor. Las credenciales se guardan cifradas;
// `secret` decide qué valores se enmascaran en las respuestas. Los patrones también
// protegen las URLs: `site` y `boltSite` de CardPointe forman el host al que se llama.
import { PaymentEnvironment, PaymentProvider } from './payment-provider.enum';

export interface CredentialFieldSpec {
  required: boolean;
  secret: boolean;
  pattern: RegExp;
}

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const PROVIDER_CREDENTIAL_FIELDS: Record<
  PaymentProvider,
  Record<string, CredentialFieldSpec>
> = {
  [PaymentProvider.STRIPE]: {
    secretKey: {
      required: true,
      secret: true,
      pattern: /^(sk|rk)_(test|live)_[A-Za-z0-9]+$/,
    },
    publishableKey: {
      required: false,
      secret: false,
      pattern: /^pk_(test|live)_[A-Za-z0-9]+$/,
    },
    webhookSecret: {
      required: false,
      secret: true,
      pattern: /^whsec_[A-Za-z0-9]+$/,
    },
  },
  [PaymentProvider.CARDPOINTE]: {
    merchantId: { required: true, secret: false, pattern: /^[0-9]{6,20}$/ },
    username: { required: true, secret: true, pattern: /^\S{1,100}$/ },
    password: { required: true, secret: true, pattern: /^\S{1,200}$/ },
    // Subdominio de cardconnect.com, p. ej. fts-uat (pruebas) o fts (producción)
    site: { required: true, secret: false, pattern: HOST_LABEL },
    // Terminales Bolt: subdominio de cardpointe.net (p. ej. bolt-uat) y su API key
    boltSite: { required: false, secret: false, pattern: HOST_LABEL },
    boltApiKey: { required: false, secret: true, pattern: /^\S{1,200}$/ },
  },
  [PaymentProvider.CLOVER]: {
    merchantId: {
      required: true,
      secret: false,
      pattern: /^[A-Za-z0-9]{6,32}$/,
    },
    accessToken: { required: true, secret: true, pattern: /^\S{1,500}$/ },
  },
};

/** Errores de validación de un juego completo de credenciales (vacío si es válido). */
export function credentialErrors(
  provider: PaymentProvider,
  environment: PaymentEnvironment,
  credentials: Record<string, unknown>,
): string[] {
  const fields = PROVIDER_CREDENTIAL_FIELDS[provider];
  const errors: string[] = [];

  for (const key of Object.keys(credentials)) {
    if (!fields[key]) {
      errors.push(
        `credentials.${key} is not a ${provider} credential (allowed: ${Object.keys(fields).join(', ')})`,
      );
    }
  }
  for (const [key, spec] of Object.entries(fields)) {
    const value = credentials[key];
    if (value === undefined || value === null) {
      if (spec.required) errors.push(`credentials.${key} is required`);
      continue;
    }
    if (typeof value !== 'string' || !spec.pattern.test(value)) {
      errors.push(`credentials.${key} has an invalid format`);
    }
  }

  if (provider === PaymentProvider.STRIPE) {
    const secretKey = credentials.secretKey;
    if (typeof secretKey === 'string') {
      const isLive = /^(sk|rk)_live_/.test(secretKey);
      if (isLive !== (environment === PaymentEnvironment.PRODUCTION)) {
        errors.push(
          `credentials.secretKey must be a ${environment === PaymentEnvironment.PRODUCTION ? 'live' : 'test'} key for the ${environment} environment`,
        );
      }
    }
  }
  if (
    provider === PaymentProvider.CARDPOINTE &&
    (credentials.boltSite == null) !== (credentials.boltApiKey == null)
  ) {
    errors.push('credentials.boltSite and credentials.boltApiKey go together');
  }

  return errors;
}

/** Formato del identificador del hardware: HSN (Bolt), Reader ID (Stripe), serie (Clover). */
export const DEVICE_IDENTIFIER_PATTERNS: Record<
  PaymentProvider,
  { pattern: RegExp; description: string }
> = {
  [PaymentProvider.CARDPOINTE]: {
    pattern: /^[A-Za-z0-9]{6,30}$/,
    description: 'a hardware serial number (HSN), 6-30 letters or digits',
  },
  [PaymentProvider.STRIPE]: {
    pattern: /^tmr_[A-Za-z0-9]{4,60}$/,
    description: "a Stripe Terminal reader ID starting with 'tmr_'",
  },
  [PaymentProvider.CLOVER]: {
    pattern: /^[A-Za-z0-9]{6,30}$/,
    description: 'a device serial number, 6-30 letters or digits',
  },
};
