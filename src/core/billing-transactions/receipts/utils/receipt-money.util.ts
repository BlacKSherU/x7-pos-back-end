import { BadRequestException } from '@nestjs/common';

/**
 * Aritmética monetaria exacta para recibos (Historia 10).
 *
 * Todos los importes se manejan como enteros escalados en `bigint` (centavos para
 * importes `decimal(12,2)`, centésimas de punto porcentual para tasas `decimal(5,2)`),
 * de modo que ninguna suma o producto intermedio pasa por coma flotante. Sólo al final
 * se convierten a `number` con exactamente dos decimales para persistirlos.
 */

/** Valor aceptado como entrada decimal: string de Postgres (`'12.50'`) o number de un DTO. */
export type DecimalInput = number | string | null | undefined;

/** Escala de las columnas monetarias `decimal(12,2)`. */
export const MONEY_SCALE = 2;

/** Mayor valor absoluto de una columna `decimal(12,2)` (9 999 999 999.99) en centavos. */
export const MAX_MONEY_CENTS = 999_999_999_999n;

/** Mayor valor absoluto de una columna `decimal(5,2)` (999.99) en centésimas. */
export const MAX_RATE_HUNDREDTHS = 99_999n;

/** Mayor importe representable, en texto (para mensajes de error). */
export const MAX_MONEY_LABEL = '9999999999.99';

const DECIMAL_PATTERN = /^([+-])?(\d*)(?:\.(\d*))?$/;

/** Base 10 elevada a `exponent` como bigint. */
function pow10(exponent: number): bigint {
  let result = 1n;
  for (let i = 0; i < exponent; i += 1) result *= 10n;
  return result;
}

/**
 * Representación decimal canónica de un number, sin notación exponencial.
 * `String()` da la representación más corta que reproduce el double (así `1.005`
 * se lee como "1.005" y no como 1.00499999…), que es lo que el usuario quiso escribir.
 */
function numberToDecimalString(value: number): string {
  if (!Number.isFinite(value)) {
    throw new BadRequestException(`Invalid decimal value: ${String(value)}`);
  }
  const text = String(value);
  if (!/e/i.test(text)) return text;
  // Valores muy pequeños (< 1e-6) o muy grandes (>= 1e21) se escriben en notación exponencial.
  if (Math.abs(value) < 1) return value.toFixed(20);
  return BigInt(Math.trunc(value)).toString();
}

/**
 * Convierte un decimal a un entero escalado (`scale` decimales) sin coma flotante.
 * Redondea "half-up" (alejándose de cero) en el dígito `scale + 1`.
 *
 * `null`/`undefined`/`''` se interpretan como 0. Lanza `BadRequestException` si el
 * valor no es un decimal válido (NaN, Infinity, texto no numérico).
 */
export function toScaledInt(
  value: DecimalInput,
  scale: number = MONEY_SCALE,
): bigint {
  if (value === null || value === undefined) return 0n;
  const text =
    typeof value === 'number'
      ? numberToDecimalString(value)
      : String(value).trim();
  if (text === '') return 0n;

  const match = DECIMAL_PATTERN.exec(text);
  if (!match || (match[2] === '' && (match[3] ?? '') === '')) {
    throw new BadRequestException(`Invalid decimal value: ${text}`);
  }

  const negative = match[1] === '-';
  const integerDigits = match[2] === '' ? '0' : match[2];
  const fractionDigits = (match[3] ?? '').padEnd(scale + 1, '0');

  let magnitude =
    BigInt(integerDigits) * pow10(scale) +
    (scale > 0 ? BigInt(fractionDigits.slice(0, scale)) : 0n);
  // Half-up: el primer dígito descartado decide (>= 5 redondea hacia arriba en magnitud).
  if (Number(fractionDigits.charAt(scale)) >= 5) magnitude += 1n;

  return negative ? -magnitude : magnitude;
}

/** Convierte un importe decimal a centavos exactos (half-up a 2 decimales). */
export function toCents(value: DecimalInput): bigint {
  return toScaledInt(value, MONEY_SCALE);
}

/** Convierte una tasa porcentual `decimal(5,2)` (p.ej. 19 → 19%) a centésimas (1900). */
export function toRateHundredths(value: DecimalInput): bigint {
  return toScaledInt(value, 2);
}

/** Formatea un entero escalado como texto decimal con `scale` decimales (`-1234n` → `'-12.34'`). */
export function formatScaled(
  value: bigint,
  scale: number = MONEY_SCALE,
): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value)
    .toString()
    .padStart(scale + 1, '0');
  const integerPart = digits.slice(0, digits.length - scale);
  const fractionPart = digits.slice(digits.length - scale);
  const body = scale > 0 ? `${integerPart}.${fractionPart}` : integerPart;
  return negative ? `-${body}` : body;
}

/**
 * Convierte centavos a number con dos decimales exactos para TypeORM.
 * Dentro del rango de `decimal(12,2)` (≤ 12 dígitos significativos) el double resultante
 * siempre se serializa de vuelta al mismo texto decimal, así que no hay pérdida.
 */
export function centsToNumber(cents: bigint): number {
  const result = Number(formatScaled(cents, MONEY_SCALE));
  return Object.is(result, -0) ? 0 : result;
}

/** División entera redondeando "half-up" (alejándose de cero en el empate). */
export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new RangeError('Division by zero');
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = (n * 2n + d) / (d * 2n);
  return negative ? -quotient : quotient;
}

/**
 * Impuesto en centavos de una base (centavos) a una tasa (centésimas de %), redondeado
 * half-up al centavo: `base × rate / 100 / 100`. Ej.: 2250 × 1900 → 427.5 → 428 (4.28).
 */
export function taxOnBase(baseCents: bigint, rateHundredths: bigint): bigint {
  return divRoundHalfUp(baseCents * rateHundredths, 10_000n);
}

/** `true` si el importe cabe en una columna `decimal(12,2)`. */
export function isMoneyInRange(cents: bigint): boolean {
  return cents <= MAX_MONEY_CENTS && cents >= -MAX_MONEY_CENTS;
}

/**
 * Garantiza que un importe cabe en `decimal(12,2)` antes de persistirlo; si no, lanza un
 * 400 controlado en vez de dejar que Postgres falle con "numeric field overflow".
 */
export function assertMoneyInRange(cents: bigint, field: string): void {
  if (!isMoneyInRange(cents)) {
    throw new BadRequestException(
      `${field} (${formatScaled(cents)}) exceeds the supported range of ±${MAX_MONEY_LABEL} (decimal 12,2)`,
    );
  }
}

/** Garantiza que una tasa cabe en `decimal(5,2)` y no es negativa. */
export function assertRateInRange(rateHundredths: bigint, field: string): void {
  if (rateHundredths < 0n || rateHundredths > MAX_RATE_HUNDREDTHS) {
    throw new BadRequestException(
      `${field} (${formatScaled(rateHundredths)}) must be between 0 and 999.99 (decimal 5,2)`,
    );
  }
}

/** Suma de una lista de bigint. */
export function sumCents(values: readonly bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n);
}
