// src/config/environment.ts
//
// Entorno de ejecución: qué valores se aceptan al arrancar y qué código solo existe fuera
// de producción.
import { parsePaymentCredentialsKey } from '../core/payments/utils/credentials-cipher.service';

export const NODE_ENVS = ['development', 'test', 'production'] as const;

/** Secretos de ejemplo de .env.example: nunca valen en producción. */
const EXAMPLE_SECRETS = new Set([
  'cambia_esto_por_un_secreto_largo',
  'cambia_esto_por_otro_secreto_largo',
]);

const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * Herramientas de desarrollo (reset del KDS, eventos de prueba, enlaces de reseteo en el
 * log) solo con NODE_ENV=development o test, nunca por omisión: un NODE_ENV olvidado o mal
 * escrito no las activa. Se lee en tiempo de import, así que main.ts carga .env primero.
 */
export function isDevelopmentEnv(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv === 'development' || nodeEnv === 'test';
}

/**
 * Swagger publica el mapa completo de la API: en producción solo con SWAGGER_ENABLED=true
 * (p. ej. un entorno de staging).
 */
export function isSwaggerEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    isDevelopmentEnv(env.NODE_ENV) ||
    (env.SWAGGER_ENABLED ?? '').toLowerCase() === 'true'
  );
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function productionSecretErrors(name: string, value: string): string[] {
  if (EXAMPLE_SECRETS.has(value)) {
    return [`${name} still has the .env.example value`];
  }
  if (value.length < MIN_PRODUCTION_SECRET_LENGTH) {
    return [
      `${name} must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
    ];
  }
  return [];
}

/**
 * Validación de ConfigModule: la app no arranca con una configuración que la dejaría
 * insegura o rota (p. ej. JWT firmado con un secreto vacío). Reúne todos los errores en
 * un solo mensaje.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];
  const nodeEnv = config.NODE_ENV;

  if (!NODE_ENVS.includes(nodeEnv as (typeof NODE_ENVS)[number])) {
    errors.push(
      `NODE_ENV must be one of ${NODE_ENVS.join(', ')} (got ${isBlank(nodeEnv) ? 'nothing' : `'${String(nodeEnv)}'`})`,
    );
  }

  for (const name of [
    'DB_HOST',
    'DB_USERNAME',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ]) {
    if (isBlank(config[name])) errors.push(`${name} is required`);
  }

  // Opcional al arrancar (sin ella no se pueden guardar credenciales de pasarela), pero
  // una clave mal formada se detecta aquí y no al primer cobro.
  if (
    !isBlank(config.PAYMENT_CREDENTIALS_KEY) &&
    !parsePaymentCredentialsKey(config.PAYMENT_CREDENTIALS_KEY as string)
  ) {
    errors.push(
      'PAYMENT_CREDENTIALS_KEY must be 32 bytes, as 64 hex characters or base64',
    );
  }

  if (nodeEnv === 'production') {
    const jwtSecret = config.JWT_SECRET;
    const refreshSecret = config.JWT_REFRESH_SECRET;
    if (!isBlank(jwtSecret)) {
      errors.push(...productionSecretErrors('JWT_SECRET', jwtSecret as string));
    }
    if (!isBlank(refreshSecret)) {
      errors.push(
        ...productionSecretErrors(
          'JWT_REFRESH_SECRET',
          refreshSecret as string,
        ),
      );
      if (refreshSecret === jwtSecret) {
        errors.push('JWT_REFRESH_SECRET must differ from JWT_SECRET');
      }
    }
    // Opcional: sin él, los enlaces de contratos se firman con JWT_SECRET.
    if (!isBlank(config.CONTRACT_DOCUMENT_SECRET)) {
      errors.push(
        ...productionSecretErrors(
          'CONTRACT_DOCUMENT_SECRET',
          config.CONTRACT_DOCUMENT_SECRET as string,
        ),
      );
    }
    // Sin lista, cualquier origen de navegador puede llamar a la API.
    if (isBlank(config.CORS_ORIGINS)) {
      errors.push('CORS_ORIGINS is required in production');
    }
    // Los enlaces de reseteo de contraseña se arman con ella.
    if (
      isBlank(config.FRONTEND_URL) ||
      !isHttpUrl(config.FRONTEND_URL as string)
    ) {
      errors.push('FRONTEND_URL must be an http(s) URL in production');
    }
  }

  if (errors.length) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }
  return config;
}
