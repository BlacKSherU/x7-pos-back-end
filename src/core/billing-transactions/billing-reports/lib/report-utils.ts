import { BadRequestException } from '@nestjs/common';

/**
 * Aritmética de dinero en centavos enteros: Postgres devuelve los `numeric(12,2)` como texto y
 * sumar flotantes acumula errores de redondeo; se convierte cada importe a centavos una sola vez,
 * se suma en enteros y se vuelve a unidades solo al responder.
 */
export function toCents(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/** Porcentaje `part / whole * 100` con 2 decimales, o null si la base es 0. */
export function percentOf(
  partCents: number,
  wholeCents: number,
): number | null {
  if (!wholeCents) return null;
  return Math.round((partCents / wholeCents) * 10000) / 100;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export interface ResolvedDateRange {
  /** Límite inferior inclusivo (`created_at >= from`). */
  from?: string;
  /** Límite superior: exclusivo si `to` era una fecha sin hora (se usa el día siguiente). */
  to?: string;
  toExclusive: boolean;
}

/**
 * Rango de fechas de los reportes (sobre `receipts.created_at`).
 * - `from`: inclusivo.
 * - `to` sin hora (`YYYY-MM-DD`): incluye el día completo → `created_at < to + 1 día`.
 * - `to` con hora: inclusivo (`created_at <= to`).
 */
export function resolveDateRange(
  from?: string,
  to?: string,
): ResolvedDateRange {
  if (from && to && Date.parse(from) > Date.parse(to)) {
    throw new BadRequestException('`from` must be on or before `to`');
  }
  if (to && DATE_ONLY.test(to)) {
    const next = new Date(`${to}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return { from, to: next.toISOString().slice(0, 10), toExclusive: true };
  }
  return { from, to, toExclusive: false };
}

/** Escapa `%`, `_` y `\` para usar un texto del usuario dentro de un patrón LIKE/ILIKE. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
