import { TransformFnParams } from 'class-transformer';

/** Merchant branch code shown in the directories: `MCH-` + id with at least 4 digits. */
export function branchCodeOf(merchantId: number): string {
  return `MCH-${String(merchantId).padStart(4, '0')}`;
}

/** The same branch code computed in SQL, so the directory search can match it. */
export function branchCodeSql(idColumn: string): string {
  return `('MCH-' || LPAD(${idColumn}::text, GREATEST(4, LENGTH(${idColumn}::text)), '0'))`;
}

/** `%term%` for ILIKE, with the LIKE wildcards of the term escaped. */
export function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, '\\$&')}%`;
}

/** class-transformer: trims strings, leaves anything else as is. */
export function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** class-transformer: trims strings and turns an empty one into null (clears the field). */
export function trimToNull({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** COUNT(*) comes back from Postgres as a string (bigint). */
export function toCount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The merchant time zone if it is a valid IANA zone, else UTC. `merchant.timezone` is free
 * text, and Postgres rejects an unknown zone in `AT TIME ZONE` (the whole query fails).
 */
export function safeTimeZone(timeZone: string | null | undefined): string {
  const zone = timeZone?.trim();
  if (!zone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    return 'UTC';
  }
}

/** A date column as an ISO string (the driver may hand back a Date or a string). */
export function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}
