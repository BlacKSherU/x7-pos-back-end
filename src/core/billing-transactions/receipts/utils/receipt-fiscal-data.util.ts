import { BadRequestException } from '@nestjs/common';

/**
 * `fiscal_data` de un recibo (columna text con JSON). Estructura soportada (Historia 10):
 *
 *   { "tax_id": "J-12345678-9", "exemption_code": "EX-2026-001", "tax_exempt": true, ...otros }
 *
 * - `tax_id`: identificación fiscal del cliente (string).
 * - `exemption_code`: código / ID del certificado de exención (string). Es el "exemption ID"
 *   que queda registrado en fiscal_data.
 * - `tax_exempt` (opcional): booleano explícito.
 * Las demás claves se conservan tal cual (p.ej. `fiscal_number` o las que escribe el POS).
 *
 * REGLA DE EXENCIÓN (resolveTaxExemption):
 *   1. Si fiscal_data no es un objeto JSON válido → NO exento.
 *   2. Si `tax_exempt` es booleano, decide él: `true` → exento; `false` → NO exento aunque haya
 *      `exemption_code` (permite suspender la exención sin perder el certificado).
 *   3. Si no hay `tax_exempt` booleano → exento si y sólo si `exemption_code` es un string no vacío.
 *
 * VALIDACIÓN EN CREATE/UPDATE (validateFiscalDataPayload): JSON objeto; `tax_id` y
 * `exemption_code` strings no vacíos de hasta 64 caracteres; `tax_exempt` booleano; y
 * `tax_exempt: true` exige `exemption_code` (toda exención debe quedar registrada con su ID).
 */
export interface ReceiptFiscalData {
  tax_id?: string | null;
  exemption_code?: string | null;
  tax_exempt?: boolean | null;
  [key: string]: unknown;
}

export interface ReceiptTaxExemption {
  /** El recibo está exento de impuestos. */
  exempt: boolean;
  /** Código / ID de la exención registrado en fiscal_data (recortado), o null. */
  exemptionCode: string | null;
  /** tax_id del cliente si viene como string, o null. */
  taxId: string | null;
}

export const FISCAL_DATA_MAX_FIELD_LENGTH = 64;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function trimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Parseo tolerante de fiscal_data: nunca lanza. Devuelve el objeto o `null` si el texto
 * está vacío, no es JSON o no es un objeto (datos heredados no deben romper un recálculo).
 */
export function parseFiscalData(
  raw: string | null | undefined,
): ReceiptFiscalData | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPlainObject(parsed) ? (parsed as ReceiptFiscalData) : null;
  } catch {
    return null;
  }
}

/** Aplica la regla de exención documentada arriba sobre el texto de fiscal_data. */
export function resolveTaxExemption(
  raw: string | null | undefined,
): ReceiptTaxExemption {
  const data = parseFiscalData(raw);
  if (!data) return { exempt: false, exemptionCode: null, taxId: null };

  const exemptionCode = trimmedString(data.exemption_code);
  const taxId = trimmedString(data.tax_id);
  const exempt =
    typeof data.tax_exempt === 'boolean'
      ? data.tax_exempt
      : exemptionCode !== null;

  return { exempt, exemptionCode, taxId };
}

function assertOptionalCode(data: ReceiptFiscalData, key: string): void {
  const value = data[key];
  if (value === undefined || value === null) return;
  if (
    typeof value !== 'string' ||
    value.trim() === '' ||
    value.length > FISCAL_DATA_MAX_FIELD_LENGTH
  ) {
    throw new BadRequestException(
      `fiscalData.${key} must be a non-empty string of at most ${FISCAL_DATA_MAX_FIELD_LENGTH} characters`,
    );
  }
}

/**
 * Validación estricta del payload `fiscalData` recibido en create/update de recibos.
 * Lanza `BadRequestException` con un mensaje específico; devuelve el objeto parseado.
 */
export function validateFiscalDataPayload(raw: string): ReceiptFiscalData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('fiscalData must be valid JSON');
  }
  if (!isPlainObject(parsed)) {
    throw new BadRequestException('fiscalData must be a valid JSON object');
  }
  const data = parsed as ReceiptFiscalData;

  assertOptionalCode(data, 'tax_id');
  assertOptionalCode(data, 'exemption_code');

  if (
    data.tax_exempt !== undefined &&
    data.tax_exempt !== null &&
    typeof data.tax_exempt !== 'boolean'
  ) {
    throw new BadRequestException('fiscalData.tax_exempt must be a boolean');
  }
  if (data.tax_exempt === true && trimmedString(data.exemption_code) === null) {
    throw new BadRequestException(
      'fiscalData.exemption_code is required when tax_exempt is true',
    );
  }

  return data;
}
